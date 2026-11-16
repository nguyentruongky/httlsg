"use client";

import { hashKey, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
  type PersistedClient,
  type Persister,
} from "@tanstack/react-query-persist-client";
import { startTiming } from "./performance";

export const READ_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
import { READ_CACHE_FORMAT_VERSION as VERSION } from "./read-cache-scope";
export { authorizationScope } from "./read-cache-scope";
const DATABASE = "church-private-read-cache";
const STORE = "snapshots";
let cacheGeneration = 0;
let activeReads: { client: QueryClient; scope: string; generation: number } | null = null;
let durableWrites: Promise<unknown> = Promise.resolve();
type DurableRead = { data: unknown; updatedAt: number; invalidated: boolean };
const allowedRoots = new Set([
  "admin-assigned-roles",
  "admin-departments",
  "admin-department-members",
  "member-sync-state",
  "schedule-categories",
  "department-board-history",
  "calendar-responsibilities",
  "calendar-responsibilities-version",
]);
function allowed(key: readonly unknown[], organization?: string) {
  return (
    allowedRoots.has(String(key[0])) ||
    (key[0] === "organizations" &&
      (!organization || key[1] === organization) &&
      ["members", "member", "my-profile", "directory", "assigned-directory", "leader-directory", "board-directory", "assigned-member", "team-member", "board-team-member", "directory-filter-options"].includes(String(key[2])))
  );
}
function summary(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(summary);
  if (!value || typeof value !== "object") return value;
  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(input)) {
    if (
      [
        "accessToken",
        "refreshToken",
        "password",
        "passwordHash",
        "credentials",
        "source",
      ].includes(key)
    )
      continue;
    output[key] = ["notes", "visitHistory"].includes(key) && Array.isArray(item) ? [] : summary(item);
  }
  if (Array.isArray(input.notes) || Array.isArray(input.visitHistory)) {
    output.historyLoaded = false;
    output.lastVisitDate = null;
  }
  return output;
}
async function database(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return null;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (db: IDBDatabase | null) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(db);
      } else db?.close();
    };
    const timer = setTimeout(() => finish(null), 5000);
    try {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE))
          request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => finish(request.result);
      request.onerror = request.onblocked = () => finish(null);
    } catch {
      finish(null);
    }
  });
}
async function stored<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest,
): Promise<T | undefined> {
  const db = await database();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, mode);
      let settled = false;
      const finish = (value?: T) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        db.close();
        resolve(value);
      };
      const timer = setTimeout(() => {
        try {
          tx.abort();
        } catch {}
        finish();
      }, 5000);
      const request = action(tx.objectStore(STORE));
      tx.oncomplete = () => finish(request.result as T);
      tx.onerror = tx.onabort = () => finish();
    } catch {
      db.close();
      resolve(undefined);
    }
  });
}
export async function clearPersistedReads() {
  cacheGeneration++;
  activeReads = null;
  await stored("readwrite", (store) => store.clear());
}

async function durableQuery(scope: string, queryKey: readonly unknown[]): Promise<DurableRead | undefined> {
  const hash = hashKey(queryKey);
  const entry = await stored<DurableRead>("readonly", (store) => store.get(["query", scope, hash]));
  if (entry) return entry;
  // Existing installations may only have the original full-cache snapshot.
  const snapshot = await stored<PersistedClient>("readonly", (store) => store.get(scope));
  if (snapshot?.buster !== VERSION) return;
  const query = snapshot.clientState.queries.find((query) => hashKey(query.queryKey) === hash);
  return query ? { data: query.state.data, updatedAt: query.state.dataUpdatedAt, invalidated: query.state.isInvalidated } : undefined;
}

async function restoreDurableQueries(client: QueryClient, scope: string) {
  const db = await database();
  if (!db) return;
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      db.close();
      resolve();
    };
    const timer = setTimeout(finish, 5000);
    try {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || settled) return;
        const key = cursor.key;
        if (Array.isArray(key) && key[0] === "query" && key[1] === scope && typeof key[2] === "string") {
          try {
            const queryKey = JSON.parse(key[2]) as unknown[];
            const entry = cursor.value as DurableRead;
            const existing = client.getQueryState(queryKey);
            if (Array.isArray(queryKey) && allowed(queryKey, JSON.parse(scope)[1]) &&
                entry.data !== undefined && Date.now() - entry.updatedAt < READ_CACHE_MAX_AGE &&
                entry.updatedAt >= (existing?.dataUpdatedAt ?? 0)) {
              client.setQueryData(queryKey, entry.data, { updatedAt: entry.updatedAt });
              if (entry.invalidated)
                void client.invalidateQueries({ queryKey, exact: true, refetchType: "none" });
            }
          } catch { /* Ignore an incompatible local record. */ }
        }
        cursor.continue();
      };
      tx.oncomplete = tx.onerror = tx.onabort = finish;
    } catch { finish(); }
  });
}

/** Hydrate every saved page before enabling a list's network query. */
export function useLocalQueryReady(client: QueryClient, queryKey: readonly unknown[]) {
  const hash = hashKey(queryKey);
  const [ready, setReady] = useState<string | null>(() => client.getQueryData(queryKey) !== undefined ? hash : null);
  useEffect(() => {
    let live = true;
    const session = activeReads;
    if (client.getQueryData(queryKey) !== undefined || session?.client !== client) {
      setReady(hash);
      return;
    }
    void (async () => {
      try {
        await durableWrites;
        const entry = await durableQuery(session.scope, queryKey);
        if (live && activeReads === session && session.generation === cacheGeneration && entry &&
            !entry.invalidated && Date.now() - entry.updatedAt < READ_CACHE_MAX_AGE &&
            client.getQueryData(queryKey) === undefined && !client.getQueryState(queryKey)?.isInvalidated)
          client.setQueryData(queryKey, entry.data, { updatedAt: entry.updatedAt });
      } catch {
        // Unavailable local storage must still allow the network fallback.
      } finally { if (live) setReady(hash); }
    })();
    return () => { live = false; };
  }, [client, hash]);
  return ready === hash || client.getQueryData(queryKey) !== undefined;
}

/** A query observer requesting a refetch does not itself invalidate local data. */
export async function readCachedQuery<T>(
  client: QueryClient,
  queryKey: readonly unknown[],
  load: () => Promise<T>,
): Promise<T> {
  const session = activeReads;
  const state = client.getQueryState<T>(queryKey);
  if (!state?.isInvalidated) {
    if (state?.data !== undefined) return state.data;
    if (session?.client === client) {
      await durableWrites.catch(() => {});
      const local = await durableQuery(session.scope, queryKey);
      if (activeReads === session && session.generation === cacheGeneration &&
          !client.getQueryState(queryKey)?.isInvalidated && local && !local.invalidated &&
          Date.now() - local.updatedAt < READ_CACHE_MAX_AGE)
        return local.data as T;
    }
  }
  const data = await load();
  // Commit the first response before resolving it to the observer. Persistence
  // must not depend on the page still being mounted when React Query publishes
  // its success event or when the full-snapshot debounce expires.
  if (session?.client === client && activeReads === session && session.generation === cacheGeneration) {
    const key = ["query", session.scope, hashKey(queryKey)];
    const entry: DurableRead = { data: summary(data), updatedAt: Date.now(), invalidated: false };
    durableWrites = durableWrites.catch(() => {}).then(() => stored("readwrite", (store) =>
      activeReads === session && session.generation === cacheGeneration ? store.put(entry, key) : store.get(key),
    ));
    await durableWrites;
  }
  return data;
}

/** Resolve a list page from memory, then IndexedDB, before using the network. */
export async function readCachedListPage<T>(
  client: QueryClient,
  queryKey: readonly unknown[],
  page: unknown,
  load: () => Promise<T>,
): Promise<T> {
  const session = activeReads;
  const state = client.getQueryState<InfiniteData<T>>(queryKey);
  const findPage = (data?: InfiniteData<T>) => {
    const index = data?.pageParams.findIndex((value) => hashKey([value]) === hashKey([page])) ?? -1;
    return index >= 0 ? data?.pages[index] : undefined;
  };
  if (!state?.isInvalidated) {
    const memory = findPage(state?.data);
    if (memory !== undefined) return memory;
    if (session?.client === client) {
      await durableWrites;
      const local = await durableQuery(session.scope, queryKey);
      if (activeReads === session && session.generation === cacheGeneration &&
          !client.getQueryState(queryKey)?.isInvalidated && local && !local.invalidated &&
          Date.now() - local.updatedAt < READ_CACHE_MAX_AGE) {
        const cached = findPage(local.data as InfiniteData<T>);
        if (cached !== undefined) return cached;
      }
    }
  }
  return load();
}
export async function restorePersistedReads(
  client: QueryClient,
  scope: string,
) {
  const done = startTiming("cache-restore");
  const organization = JSON.parse(scope)[1] as string;
  let active = true;
  let scopeGeneration = cacheGeneration;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const persister: Persister = {
    persistClient: (cache: PersistedClient) => {
      if (!active) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!active) return;
        const sanitized = {
          ...cache,
          clientState: {
            ...cache.clientState,
            mutations: [],
            queries: cache.clientState.queries
              .filter(
                (query) =>
                  allowed(query.queryKey, organization) &&
                  Date.now() - query.state.dataUpdatedAt < READ_CACHE_MAX_AGE,
              )
              .map((query) => ({
                ...query,
                state: { ...query.state, data: summary(query.state.data) },
              })),
          },
        };
        // Bound device storage; failure or quota exhaustion never blocks network reads.
        if (JSON.stringify(sanitized).length <= 20_000_000)
          void stored("readwrite", (store) =>
            active && scopeGeneration === cacheGeneration
              ? store.put(sanitized, scope)
              : store.get(scope),
          );
      }, 250);
    },
    restoreClient: async () => {
      const cache = await stored<PersistedClient>("readonly", (store) =>
        store.get(scope),
      );
      if (!cache) return undefined;
      return {
        ...cache,
        clientState: {
          ...cache.clientState,
          mutations: [],
          queries: cache.clientState.queries.filter(
            (query) =>
              allowed(query.queryKey, organization) &&
              Date.now() - query.state.dataUpdatedAt < READ_CACHE_MAX_AGE,
          ),
        },
      };
    },
    removeClient: () =>
      stored("readwrite", (store) => store.delete(scope)).then(() => {}),
  };
  const previousScope = await stored<string>("readonly", (store) =>
    store.get("active-scope"),
  );
  if (previousScope && previousScope !== scope) await clearPersistedReads();
  await stored("readwrite", (store) => store.put(scope, "active-scope"));
  scopeGeneration = cacheGeneration;
  try {
    await persistQueryClientRestore({
      queryClient: client,
      persister,
      maxAge: READ_CACHE_MAX_AGE,
      buster: VERSION,
    });
    // The debounced snapshot can predate an immediate successful write or
    // invalidation. Reconcile those records before exposing any list queries.
    await durableWrites.catch(() => {});
    await restoreDurableQueries(client, scope);
  } catch {
    /* Corrupt or unavailable device storage falls back to the network. */
  } finally {
    done();
  }
  const unsubscribe = persistQueryClientSubscribe({
    queryClient: client,
    persister,
    buster: VERSION,
    dehydrateOptions: {
      shouldDehydrateMutation: () => false,
      shouldDehydrateQuery: (query) =>
        query.state.status === "success" &&
        allowed(query.queryKey, organization),
    },
  });
  const session = { client, scope, generation: scopeGeneration };
  activeReads = session;
  const stopDurableWrites = client.getQueryCache().subscribe((event) => {
    if (!active || event.type !== "updated" || !["success", "invalidate"].includes(event.action.type)) return;
    const query = event.query;
    if (!allowed(query.queryKey, organization) || query.state.data === undefined) return;
    const key = ["query", scope, hashKey(query.queryKey)];
    const entry: DurableRead = {
      data: summary(query.state.data), updatedAt: query.state.dataUpdatedAt,
      invalidated: query.state.isInvalidated,
    };
    durableWrites = durableWrites.catch(() => {}).then(() => stored("readwrite", (store) =>
      active && scopeGeneration === cacheGeneration ? store.put(entry, key) : store.get(key),
    ));
  });
  return () => {
    active = false;
    if (activeReads === session) activeReads = null;
    clearTimeout(timer);
    stopDurableWrites();
    unsubscribe();
  };
}
