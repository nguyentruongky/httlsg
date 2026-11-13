import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useAuth,
  isTeamScopedUser,
  apiRequest,
  getMyProfile,
  getDirectoryMember,
  demo,
  updateMemberReads,
  invalidateMemberReads,
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
  const query = useQuery({
    queryKey,
    queryFn: () =>
      profile
        ? getMyProfile(org, false)
        : team
          ? apiRequest<DirectoryMember>(
              `/api/${team === "board" ? "board" : "leader"}/members/${memberId}?history=0`,
            )
          : getDirectoryMember(org, memberId!, false),
    staleTime: assigned && !profile ? 0 : 30_000,
  });
  const actor = useQuery({
    queryKey: ["organizations", org, "my-profile"],
    queryFn: () => getMyProfile(org, false),
    staleTime: 30_000,
    enabled: query.data?.canEdit === undefined,
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
    void invalidateMemberReads(client, org);
  }
  return {
    query,
    actor,
    user: auth?.user,
    persist,
    refresh: () => invalidateMemberReads(client, org),
  };
}
