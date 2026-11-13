import type { QueryClient } from "@tanstack/react-query";
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
  type PersistedClient,
  type Persister,
} from "@tanstack/react-query-persist-client";
import type { AuthUser } from "./auth-contract";
import { startTiming } from "./performance";

export const READ_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;
const VERSION = "read-cache-v3";
const DATABASE = "church-private-read-cache";
const STORE = "snapshots";
let cacheGeneration = 0;
const allowedRoots = new Set([
  "admin-assigned-roles",
  "admin-departments",
  "admin-department-members",
  "schedule-categories",
]);
function allowed(key: readonly unknown[], organization?: string) {
  return (
    allowedRoots.has(String(key[0])) ||
    (key[0] === "organizations" &&
      (!organization || key[1] === organization) &&
      ["members", "member", "my-profile"].includes(String(key[2])))
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
    output[key] = ["notes", "visitHistory"].includes(key) ? [] : summary(item);
  }
  if ("notes" in input || "visitHistory" in input) {
    output.historyLoaded = false;
    output.lastVisitDate = null;
  }
  if (Array.isArray(output.pages)) {
    output.pages = output.pages.slice(0, 1);
    if (Array.isArray(output.pageParams))
      output.pageParams = output.pageParams.slice(0, 1);
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
    const timer = setTimeout(() => finish(null), 300);
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
      }, 300);
      const request = action(tx.objectStore(STORE));
      tx.oncomplete = () => finish(request.result as T);
      tx.onerror = tx.onabort = () => finish();
    } catch {
      db.close();
      resolve(undefined);
    }
  });
}
export function authorizationScope(user: AuthUser, organization: string) {
  return JSON.stringify([
    VERSION,
    organization,
    user.id,
    user.authVersion,
    user.role,
    user.isReceptionLeader === true,
    [...(user.roles ?? [])].sort(),
    [...user.permissions].sort(),
    user.departmentId,
    [...(user.departmentIds ?? [])].sort(),
    [...(user.calendarDepartmentIds ?? [])].sort(),
    [...(user.leaderDepartmentIds ?? [])].sort(),
    [...(user.boardDepartmentIds ?? [])].sort(),
  ]);
}
export async function clearPersistedReads() {
  cacheGeneration++;
  await stored("readwrite", (store) => store.clear());
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
        if (JSON.stringify(sanitized).length <= 5_000_000)
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
  return () => {
    active = false;
    clearTimeout(timer);
    unsubscribe();
  };
}
