import type { QueryClient, InfiniteData } from "@tanstack/react-query";
import type { DirectoryMember } from "./directory";
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
type CachedRow = Record<string, any> & { id: string };
type CachedPage = {
  items: CachedRow[];
  total?: number;
  [key: string]: unknown;
};
const listKinds = new Set([
  "members",
  "directory",
  "assigned-directory",
  "leader-directory",
  "board-directory",
]);
const detailKinds = new Set([
  "member",
  "assigned-member",
  "team-member",
  "board-team-member",
  "my-profile",
]);

/** Apply the authoritative mutation response to loaded rows without refetching lists. */
export function updateMemberReads(
  client: QueryClient,
  org: string,
  member: DirectoryMember,
  personnel?: object | null,
) {
  for (const query of client.getQueryCache().getAll()) {
    const key = query.queryKey;
    if (
      key[0] === "organizations" &&
      key[1] === org &&
      detailKinds.has(String(key[2]))
    ) {
      const previous = query.state.data as DirectoryMember | undefined;
      if (previous?.id === member.id)
        client.setQueryData(key, {
          ...previous,
          ...member,
          ...(member.historyLoaded === false && previous.historyLoaded
            ? {
                notes: previous.notes,
                visitHistory: previous.visitHistory,
                historyLoaded: true,
              }
            : {}),
        });
      continue;
    }
    const organizationList =
      key[0] === "organizations" &&
      key[1] === org &&
      listKinds.has(String(key[2]));
    const departmentList = key[0] === "admin-department-members";
    const personnelList = key[0] === "admin-assigned-roles";
    if (!organizationList && !departmentList && !personnelList) continue;
    const data = query.state.data as InfiniteData<CachedPage> | undefined;
    if (!data?.pages) continue;
    const criteria = (
      organizationList ? key[key.length - 1] : personnelList ? key[2] : {}
    ) as Record<string, any>;
    const statuses: string[] = departmentList
      ? ((key[5] as string[]) ?? [])
      : typeof criteria?.churchStatuses === "string"
        ? criteria.churchStatuses.split(",").filter(Boolean)
        : (criteria?.churchStatuses ?? []);
    const search = String(
      departmentList ? (key[4] ?? "") : (criteria?.search ?? criteria?.q ?? ""),
    );
    const statusMatches = statuses.length
      ? statuses.includes(member.churchStatus || "Chưa cập nhật")
      : Boolean(search.trim()) ||
        !["Chuyển hội", "Đi nước ngoài"].includes(member.churchStatus ?? "");
    let removed = 0;
    let changed = false;
    const pages = data.pages.map((page) => ({
      ...page,
      items: page.items.flatMap((row) => {
        if (row.id !== member.id) return [row];
        changed = true;
        const membership = departmentList
          ? member.departments.find((d) => d.id === key[1])
          : undefined;
        const departmentMatches =
          !departmentList ||
          key[2] === "all" ||
          (key[2] === "available" ? !membership : Boolean(membership));
        const filterDepartments: string[] = organizationList
          ? (criteria?.departmentIds ?? [])
          : [];
        const selectedDepartmentsMatch =
          !filterDepartments.length ||
          member.departments.some((d) => filterDepartments.includes(d.id));
        if (
          !statusMatches ||
          !departmentMatches ||
          !selectedDepartmentsMatch ||
          (personnelList && personnel === null)
        ) {
          removed++;
          return [];
        }
        if (organizationList)
          return [
            {
              ...row,
              ...member,
              ...(row.historyLoaded && member.historyLoaded === false
                ? {
                    notes: row.notes,
                    visitHistory: row.visitHistory,
                    historyLoaded: true,
                  }
                : {}),
            },
          ];
        if (personnelList && personnel) return [{ ...row, ...personnel }];
        return [
          {
            ...row,
            name: member.user.name,
            email: member.user.email,
            phone: member.phone,
            churchStatus: member.churchStatus,
            version: member.version,
            accountStatus: member.status,
            ...(departmentList
              ? {
                  isMember: Boolean(membership),
                  position: membership?.position ?? row.position,
                }
              : {
                  departmentIds: member.departments.map((d) => d.id),
                  departmentNames: member.departments.map((d) => d.name),
                  allDepartments: member.departments.map((d) => d.name),
                }),
          },
        ];
      }),
    }));
    if (changed)
      client.setQueryData(query.queryKey, {
        ...data,
        pages: pages.map((page) => ({
          ...page,
          ...(typeof page.total === "number"
            ? { total: Math.max(0, page.total - removed) }
            : {}),
        })),
      });
  }
  if (!client.getQueryData(["organizations", org, "member", member.id]))
    client.setQueryData(["organizations", org, "member", member.id], member);
}

export function removeMemberReads(
  client: QueryClient,
  org: string,
  memberId: string,
) {
  for (const query of client.getQueryCache().getAll()) {
    const key = query.queryKey;
    const own = key[0] === "organizations" && key[1] === org;
    if (own && detailKinds.has(String(key[2]))) {
      const data = query.state.data as DirectoryMember | undefined;
      if (data?.id === memberId) {
        if (query.isActive())
          void client.resetQueries({ queryKey: key, exact: true });
        else client.removeQueries({ queryKey: key, exact: true });
      } else if (
        data?.family?.members.some((relative) => relative.id === memberId)
      )
        client.setQueryData(key, {
          ...data,
          family: {
            ...data.family,
            members: data.family.members.filter(
              (relative) => relative.id !== memberId,
            ),
          },
        });
      continue;
    }
    if (
      !(own && listKinds.has(String(key[2]))) &&
      !["admin-department-members", "admin-assigned-roles"].includes(
        String(key[0]),
      )
    )
      continue;
    const data = query.state.data as InfiniteData<CachedPage> | undefined;
    if (!data?.pages) continue;
    const removed = data.pages.reduce(
      (count, page) =>
        count + page.items.filter((row) => row.id === memberId).length,
      0,
    );
    if (!removed) continue;
    client.setQueryData(key, {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.filter((row) => row.id !== memberId),
        ...(typeof page.total === "number"
          ? { total: Math.max(0, page.total - removed) }
          : {}),
      })),
    });
  }
}
