import type { Query, QueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api-client";
import { updateMemberReads, removeMemberReads } from "./member-cache";
import type { DirectoryMember } from "./directory";

const MEMBER_KINDS = [
  "members",
  "member",
  "my-profile",
  "directory",
  "assigned-directory",
  "leader-directory",
  "board-directory",
  "assigned-member",
  "team-member",
  "board-team-member",
  "directory-filter-options",
];
const ROOTS = [
  "admin-department-members",
  "admin-assigned-roles",
  "admin-departments",
  "department-board-history",
];
const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const lastSyncAttempts = new WeakMap<
  QueryClient,
  { scope: string; time: number }
>();
export function isVersionedMemberRead(query: Query, org: string) {
  const key = query.queryKey;
  return (
    ROOTS.includes(String(key[0])) ||
    (key[0] === "organizations" &&
      key[1] === org &&
      MEMBER_KINDS.includes(String(key[2])))
  );
}
type Cursor = { epoch: string; version: string };
type SyncResult = Cursor & {
  scopeChanged?: boolean;
  reset?: boolean;
  changes: { member: DirectoryMember; personnel?: object | null }[];
  removed: string[];
  refreshLists: boolean;
  hasMore: boolean;
  departmentCounts?: Record<string, number>;
  responsibilitiesVersion?: string;
};
function watchedMembers(client: QueryClient, org: string) {
  const ids = new Set<string>();
  for (const query of client.getQueryCache().getAll()) {
    if (!isVersionedMemberRead(query, org)) continue;
    const data = query.state.data as
      { id?: string; pages?: { items?: { id: string }[] }[] } | undefined;
    if (data?.id) ids.add(data.id);
    for (const page of data?.pages ?? [])
      for (const row of page.items ?? []) ids.add(row.id);
  }
  return [...ids].slice(0, 5000);
}

/** IndexedDB persistence owns the snapshot; this controller only reconciles revisions. */
export function startMemberReadSync(
  client: QueryClient,
  org: string,
  scope: string,
) {
  const options = {
    staleTime: Infinity,
    gcTime: 30 * 24 * 60 * 60 * 1000,
    refetchOnMount: false as const,
    refetchOnWindowFocus: false as const,
    refetchOnReconnect: false as const,
  };
  for (const kind of MEMBER_KINDS)
    client.setQueryDefaults(["organizations", org, kind], options);
  for (const root of ROOTS) client.setQueryDefaults([root], options);
  const cursorKey = ["member-sync-state", scope];
  let stopped = false;
  let busy = false;
  const controller = new AbortController();
  async function run() {
    if (stopped || busy || !navigator.onLine) return;
    busy = true;
    const syncStartedAt = Date.now();
    lastSyncAttempts.set(client, { scope, time: syncStartedAt });
    try {
      let more = true;
      while (more && !stopped) {
        const cursor = client.getQueryData<Cursor>(cursorKey);
        const countsKey = ["admin-departments", "counts"];
        const countsState = client.getQueryState(countsKey);
        const result = await apiRequest<SyncResult>("/api/member-sync", {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify({
            organization: org,
            scope,
            since: cursor?.version ?? "0",
            ...(cursor ? { epoch: cursor.epoch } : {}),
            watched: watchedMembers(client, org),
            includeCounts:
              countsState?.data === undefined || countsState.isInvalidated,
          }),
        });
        if (stopped) return;
        if (result.scopeChanged) {
          window.dispatchEvent(new Event("church:sync-scope-changed"));
          return;
        }
        const responsibilitiesVersionKey = [
          "calendar-responsibilities-version",
          scope,
        ];
        const responsibilitiesChanged =
          result.responsibilitiesVersion !== undefined &&
          client.getQueryData(responsibilitiesVersionKey) !==
            result.responsibilitiesVersion;
        if (responsibilitiesChanged)
          await client.invalidateQueries({
            queryKey: ["calendar-responsibilities"],
            refetchType: "none",
            // A range loaded during this sync already read the current server
            // data. Do not invalidate an initial request or its fresh result.
            predicate: (query) =>
              query.state.data !== undefined &&
              query.state.dataUpdatedAt < syncStartedAt,
          });
        const affected = new Set(
          result.changes.map((change) => change.member.id),
        );
        // Stop stale in-flight reads from overwriting the authoritative delta.
        if (result.reset || result.changes.length || result.removed.length)
          await client.cancelQueries({
            predicate: (query) =>
              isVersionedMemberRead(query, org) &&
              query.state.fetchStatus === "fetching" &&
              query.state.data !== undefined,
          });
        if (stopped) return;
        if (result.departmentCounts) {
          const previous = client.getQueryData<{
            counts: Record<string, number>;
          }>(countsKey)?.counts;
          const next = result.departmentCounts;
          if (
            !previous ||
            countsState?.isInvalidated ||
            Object.keys(previous).length !== Object.keys(next).length ||
            Object.keys(next).some((id) => previous[id] !== next[id])
          )
            client.setQueryData(countsKey, { counts: next });
        }
        for (const change of result.changes) {
          const cached = client.getQueryData<DirectoryMember>([
            "organizations",
            org,
            "member",
            change.member.id,
          ]);
          if (!cached || change.member.version >= cached.version)
            updateMemberReads(client, org, change.member, change.personnel);
        }
        for (const id of result.removed) removeMemberReads(client, org, id);
        const newDepartments = new Set(
          result.changes.flatMap((change) =>
            change.member.departments.map((department) => department.id),
          ),
        );
        await client.invalidateQueries({
          refetchType: "none",
          predicate: (query) => {
            if (
              !isVersionedMemberRead(query, org) ||
              query.state.data === undefined
            )
              return false;
            if (query.queryKey[0] === "admin-departments") return false;
            if (result.reset) return true;
            if (result.refreshLists)
              return (
                ROOTS.includes(String(query.queryKey[0])) ||
                [
                  "members",
                  "directory",
                  "assigned-directory",
                  "leader-directory",
                  "board-directory",
                ].includes(String(query.queryKey[2]))
              );
            if (!result.changes.length && !result.removed.length) return false;
            if (query.queryKey[2] === "directory-filter-options") return true;
            if (
              ["admin-departments", "department-board-history"].includes(
                String(query.queryKey[0]),
              )
            )
              return true;
            if (
              query.queryKey[0] === "admin-department-members" &&
              newDepartments.has(String(query.queryKey[1]))
            ) {
              const data = query.state.data as {
                pages?: { items: { id: string }[] }[];
              };
              return result.changes.some(
                (change) =>
                  change.member.departments.some(
                    (d) => d.id === query.queryKey[1],
                  ) &&
                  !data.pages?.some((page) =>
                    page.items.some((row) => row.id === change.member.id),
                  ),
              );
            }
            return false;
          },
        });
        for (const id of affected)
          await client.invalidateQueries({
            queryKey: ["organizations", org, "member-history", id],
            refetchType: "none",
          });
        await client.refetchQueries(
          {
            predicate: (query) =>
              isVersionedMemberRead(query, org) &&
              query.isActive() &&
              query.state.isInvalidated,
          },
          { throwOnError: true },
        );
        if (responsibilitiesChanged) {
          await client.refetchQueries(
            {
              queryKey: ["calendar-responsibilities"],
              type: "active",
              predicate: (query) =>
                query.state.isInvalidated && query.state.data !== undefined,
            },
            { throwOnError: true },
          );
          if (stopped) return;
          client.setQueryData(
            responsibilitiesVersionKey,
            result.responsibilitiesVersion,
          );
        }
        if (stopped) return;
        // Persisting this query and the updated rows in one snapshot keeps them consistent.
        if (cursor?.epoch !== result.epoch || cursor.version !== result.version)
          client.setQueryData<Cursor>(cursorKey, {
            epoch: result.epoch,
            version: result.version,
          });
        more = result.hasMore;
      }
    } catch {
      // Retain the revision for retry on the next five-minute sync.
    } finally {
      busy = false;
    }
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function tick() {
    if (stopped) return;
    const previous = lastSyncAttempts.get(client);
    const remaining =
      previous?.scope === scope
        ? SYNC_INTERVAL_MS - (Date.now() - previous.time)
        : 0;
    if (remaining > 0) {
      timer = setTimeout(() => void tick(), remaining);
      return;
    }
    await run();
    if (!stopped) timer = setTimeout(() => void tick(), SYNC_INTERVAL_MS);
  }
  void tick();
  const reconnect = () => {
    void run();
  };
  window.addEventListener("church:connection-restored", reconnect);
  return () => {
    stopped = true;
    clearTimeout(timer);
    controller.abort();
    window.removeEventListener("church:connection-restored", reconnect);
  };
}
