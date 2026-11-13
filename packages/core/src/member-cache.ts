import type { QueryClient, InfiniteData } from "@tanstack/react-query";
import type { DirectoryMember, CompactMembersPage } from "./directory";
const memberKinds = new Set([
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
  "member-history",
  "activity",
]);
const adminKinds = new Set([
  "admin-departments",
  "admin-department-members",
  "admin-assigned-roles",
  "department-board-history",
]);
export async function invalidateMemberReads(client: QueryClient, org: string) {
  await client.invalidateQueries({
    predicate: (query) =>
      adminKinds.has(String(query.queryKey[0])) ||
      (query.queryKey[0] === "organizations" &&
        query.queryKey[1] === org &&
        memberKinds.has(String(query.queryKey[2]))),
  });
}
export function updateMemberReads(
  client: QueryClient,
  org: string,
  member: DirectoryMember,
) {
  client.setQueriesData<InfiniteData<CompactMembersPage>>(
    { queryKey: ["organizations", org, "members"] },
    (data) =>
      data
        ? {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id !== member.id
                  ? item
                  : {
                      ...item,
                      user: member.user,
                      phone: member.phone,
                      dateOfBirth: member.dateOfBirth,
                      area: member.area,
                      location: member.location,
                      departments: member.departments.map(({ id, name }) => ({
                        id,
                        name,
                      })),
                      version: member.version,
                    },
              ),
            })),
          }
        : data,
  );
}
