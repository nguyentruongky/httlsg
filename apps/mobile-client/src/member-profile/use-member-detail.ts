import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useAuth,
  isTeamScopedUser,
  apiRequest,
  getMyProfile,
  getDirectoryMember,
  demo,
  updateMemberReads,
  readCachedQuery,
  useLocalQueryReady,
  type DirectoryMember,
  type MemberDetailInput,
} from "@org/core";

export type MemberDetailScope = {
  org: string;
  memberId?: string;
  profile: boolean;
  team: boolean | "board";
};
export function useMemberDetail({
  org,
  memberId,
  profile,
  team,
}: MemberDetailScope) {
  const client = useQueryClient();
  const auth = useAuth();
  const assigned = Boolean(auth?.user && isTeamScopedUser(auth.user));
  const queryKey = [
    "organizations",
    org,
    profile
      ? "my-profile"
      : team === "board"
        ? "board-team-member"
        : team
          ? "team-member"
          : assigned
            ? "assigned-member"
            : "member",
    ...(profile ? [] : [memberId]),
  ];
  const localReady = useLocalQueryReady(client, queryKey);
  const query = useQuery({
    queryKey,
    queryFn: () =>
      readCachedQuery(client, queryKey, () =>
        profile
          ? getMyProfile(org, false)
          : team
            ? apiRequest<DirectoryMember>(
                `/api/${team === "board" ? "board" : "leader"}/members/${memberId}?history=0`,
              )
            : getDirectoryMember(org, memberId!, false),
      ),
    enabled: (cached) =>
      localReady &&
      (cached.state.data === undefined || cached.state.isInvalidated),
    staleTime: Infinity,
    gcTime: 30 * 24 * 60 * 60 * 1000,
    refetchOnMount: (cached) => cached.state.isInvalidated,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const actorKey = ["organizations", org, "my-profile"];
  const actorReady = useLocalQueryReady(client, actorKey);
  const actor = useQuery({
    queryKey: actorKey,
    queryFn: () =>
      readCachedQuery(client, actorKey, () => getMyProfile(org, false)),
    staleTime: Infinity,
    gcTime: 30 * 24 * 60 * 60 * 1000,
    refetchOnMount: (cached) => cached.state.isInvalidated,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: (cached) =>
      actorReady &&
      query.data?.canEdit === undefined &&
      (cached.state.data === undefined || cached.state.isInvalidated),
  });

  async function persist(values: MemberDetailInput, version: number) {
    if (!query.data) return;

    const updated = team
      ? await apiRequest<DirectoryMember>(
          `/api/${team === "board" ? "board" : "leader"}/members/${query.data.id}`,
          { method: "PATCH", body: JSON.stringify({ values, version }) },
        )
      : await demo.updateDetails(org, query.data.id, values, version);
    if (updated) {
      client.setQueryData(queryKey, updated);
      updateMemberReads(client, org, updated);
    }
  }
  return {
    query,
    actor,
    user: auth?.user,
    persist,
    refresh: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey, exact: true }),
        client.invalidateQueries({
          queryKey: ["organizations", org, "member-history", query.data?.id],
        }),
      ]);
    },
  };
}
