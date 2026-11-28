import { useMemo, useSyncExternalStore } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  apiRequest,
  getDirectoryMember,
  useAuth,
  type DirectoryMember,
} from "@org/core";
import {
  memberShortcutKey,
  parseMemberShortcuts,
  readShortcutSnapshot,
  subscribeMemberShortcuts,
  togglePinnedMember,
  type MemberShortcutScope,
} from "./member-shortcuts";

export function useMemberShortcuts({
  org,
  team,
  enabled,
}: {
  org: string;
  team: MemberShortcutScope;
  enabled: boolean;
}) {
  const actor = useAuth()?.user;
  const key = actor ? memberShortcutKey(org, actor.id, team) : null;
  const raw = useSyncExternalStore(
    subscribeMemberShortcuts,
    () => readShortcutSnapshot(key),
    () => null,
  );
  const saved = useMemo(() => parseMemberShortcuts(raw), [raw]);
  const ids = [...new Set([...saved.pinned, ...saved.recent])];
  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: [
        "organizations",
        org,
        "directory-shortcut-member",
        actor?.id,
        actor?.role,
        actor?.roles,
        actor?.departmentIds,
        team,
        id,
      ],
      queryFn: () =>
        team
          ? apiRequest<DirectoryMember>(
              `/api/${team === "board" ? "board" : "leader"}/members/${encodeURIComponent(id)}?history=0`,
            )
          : getDirectoryMember(org, id, false),
      enabled: enabled && Boolean(actor),
      staleTime: 30_000,
      retry: false,
    })),
  });
  const available = new Map(
    queries.flatMap((query, index) =>
      query.data && !query.isError ? [[ids[index], query.data] as const] : [],
    ),
  );
  return {
    pinnedIds: saved.pinned,
    pinned: saved.pinned.flatMap((id) =>
      available.get(id) ? [available.get(id)!] : [],
    ),
    recent: saved.recent
      .filter((id) => !saved.pinned.includes(id))
      .flatMap((id) => (available.get(id) ? [available.get(id)!] : [])),
    loading: queries.some((query) => query.isPending && query.isFetching),
    togglePin: key ? (id: string) => togglePinnedMember(key, id) : undefined,
  };
}
