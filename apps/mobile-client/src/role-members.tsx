"use client";
import { ListPageHeader, ListSearchToolbar } from "./list-controls";
import { useDebouncedSearch } from "./use-debounced-search";

import { useLoadingTiming } from "./use-loading-timing";
import { AutoLoadMore } from "./auto-load-more";
import { useRef, useState } from "react";
import { navigateClient } from "./client-router";
import {
  Mail,
  MoreVertical,
  SlidersHorizontal,
  Pencil,
  Phone,
  BriefcaseBusiness,
  Download,
  KeyRound,
  UserCog,
  ChevronDown,
  X,
} from "lucide-react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  accessRoleLabels,
  canCalendar,
  departments,
  DEPARTMENT_DISPLAY_ORDER,
  useAuth,
  useWorkspace,
  apiRequest,
  invalidateMemberReads,
  managementRoles,
  prioritizePersonnelAssignments,
  type AccessRole,
} from "@org/core";
import {
  Avatar,
  Button,
  Card,
  Dialog,
  DropdownMenu,
  MenuItem,
  EmptyState,
  ErrorMessage,
} from "@org/ui";
import type { AssignRoleEntry } from "./role-assign-dialog";
import { PersonnelMissionsDialog } from "./personnel-missions-dialog";
import { AccountCredentials } from "./account-credentials";
type AssignedMember = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: AccessRole;
  hasAccount: boolean;
  departmentId: string | null;
  roles: AssignRoleEntry[];
  allDepartments: string[];
  departmentIds: string[];
  departmentNames: string[];
  departmental: boolean;
  personnelRoles: string[];
  personnelAssignments?: { role: string; departmentName: string | null }[];
};
type AssignedData = {
  total?: number;
  nextPage?: number;
  items: AssignedMember[];
  departments: { id: string; name: string }[];
};
const personnelCollator = new Intl.Collator("vi", {
  sensitivity: "base",
  numeric: true,
});
const choirDepartmentOrder = departments
  .filter((d) => d.departmentType === "choir")
  .map((d) => d.name);
function lastNameWord(name: string) {
  return name.trim().split(/\s+/).at(-1) ?? "";
}
function itemRoleLabel(roleId: string): string | undefined {
  if (roleId === "specialist") return "Đặc trách";
  return undefined;
}
function PersonnelAssignment({ member }: { member: AssignedMember }) {
  const assignments = prioritizePersonnelAssignments(
    member.personnelAssignments ??
      member.personnelRoles.map((role) => ({ role, departmentName: null })),
  );
  const assignedDepartments = new Set(
    assignments.map((item) => item.departmentName).filter(Boolean),
  );
  const otherDepartments = member.departmentNames.filter(
    (name) => !assignedDepartments.has(name),
  );
  return (
    <div className="space-y-1.5 wrap-break-word">
      {assignments.map((item, index) => (
        <p
          key={`${item.role}-${item.departmentName}-${index}`}
          className="text-sm font-normal leading-relaxed"
        >
          {item.role}
          {item.departmentName
            ? ` ${item.departmentName.replace(/^ban\s/i, "")}`
            : ""}
        </p>
      ))}
      {otherDepartments.length > 0 && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {otherDepartments.join(", ")}
        </p>
      )}
      {!assignments.length && !otherDepartments.length && (
        <p className="text-sm text-muted-foreground">Chưa gán ban ngành</p>
      )}
    </div>
  );
}
function PersonnelActions({
  member,
  onEdit,
  onMissions,
  onCredentials,
}: {
  member: AssignedMember;
  onEdit: () => void;
  onMissions: () => void;
  onCredentials: () => void;
}) {
  const readOnly = useAuth()?.user?.role === "deacon";
  const pending = useRef<"edit" | "missions" | "credentials" | null>(null);
  if (readOnly) return null;
  return (
    <DropdownMenu
      animateOnMobile
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          aria-label={`Thao tác cho ${member.name}`}
        >
          <MoreVertical size={20} />
        </Button>
      }
      onCloseAutoFocus={(event) => {
        const action = pending.current;
        if (!action) return;
        event.preventDefault();
        pending.current = null;
        if (action === "edit") onEdit();
        else if (action === "credentials") onCredentials();
        else onMissions();
      }}
    >
      <MenuItem
        onSelect={() => {
          pending.current = "edit";
        }}
      >
        <Pencil size={16} />
        Cập nhật thông tin
      </MenuItem>
      <MenuItem
        onSelect={() => {
          pending.current = "missions";
        }}
      >
        <BriefcaseBusiness size={16} />
        Thay đổi công tác
      </MenuItem>
      <MenuItem
        onSelect={() => {
          pending.current = "credentials";
        }}
      >
        <KeyRound size={16} />
        Thông tin đăng nhập
      </MenuItem>
    </DropdownMenu>
  );
}
export function RoleMembers() {
  const auth = useAuth();
  const { organizationId } = useWorkspace();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const term = useDebouncedSearch(search);
  const [role, setRole] = useState<AccessRole | "specialist" | "">("");
  const [department, setDepartment] = useState("");
  const [target, setTarget] = useState<AssignedMember | null>(null);
  const [credentials, setCredentials] = useState<AssignedMember | null>(null);
  const params = { q: term, role, department };
  const query = useInfiniteQuery({
    queryKey: ["admin-assigned-roles", auth?.user?.id, params],
    queryFn: ({ pageParam, signal }) =>
      apiRequest<AssignedData>(
        "/api/admin/roles/assigned?" +
          new URLSearchParams({ ...params, page: String(pageParam) }),
        { signal },
      ),
    enabled: term === search.trim(),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
  });
  useLoadingTiming("personnel", query.isPending);
  if (query.isPending) return <p role="status">Đang tải…</p>;
  if (query.error && !query.data) return <ErrorMessage error={query.error} />;
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const departments = query.data?.pages[0]?.departments ?? [];
  const sortedDepartments = [...departments].sort((a, b) => {
    const aIndex = DEPARTMENT_DISPLAY_ORDER.indexOf(
      a.name as (typeof DEPARTMENT_DISPLAY_ORDER)[number],
    );
    const bIndex = DEPARTMENT_DISPLAY_ORDER.indexOf(
      b.name as (typeof DEPARTMENT_DISPLAY_ORDER)[number],
    );
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return (
      personnelCollator.compare(a.name, b.name) || a.name.localeCompare(b.name)
    );
  });
  const filtered = items;
  function actions(member: AssignedMember) {
    return (
      <PersonnelActions
        member={member}
        onEdit={() => navigateClient(`/client/members/${member.id}`)}
        onMissions={() => setTarget(member)}
        onCredentials={() => setCredentials(member)}
      />
    );
  }
  async function exportCsv() {
    const all = await apiRequest<AssignedData>(
      "/api/admin/roles/assigned?" + new URLSearchParams(params),
    );
    const quote = (value: string) =>
      '"' + value.replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"';
    const rows = all.items.map((member) => [
      member.name,
      member.phone ?? "",
      member.email ?? "",
      prioritizePersonnelAssignments(
        member.personnelAssignments ??
          member.personnelRoles.map((role) => ({ role, departmentName: null })),
      )
        .map((item) =>
          [item.role, item.departmentName].filter(Boolean).join(" "),
        )
        .join("; "),
      member.departmentNames.join(", "),
    ]);
    const csv = [
      ["Họ tên", "Số điện thoại", "Email", "Công tác", "Ban ngành"],
      ...rows,
    ]
      .map((row) => row.map(quote).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "nhan-su-hoi-thanh.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="min-w-0 space-y-6">
      <ListPageHeader
        title="Nhân sự"
        icon={<UserCog />}
        description="Ban điều hành, Trưởng ban ngành, Chấp sự, Đặc trách và nhân sự trong Hội Thánh."
      >
        <DropdownMenu
          animateOnMobile
          label=""
          trigger={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Menu nhân sự Hội Thánh"
            >
              <MoreVertical size={21} />
            </Button>
          }
        >
          <MenuItem onSelect={exportCsv}>
            <Download size={17} />
            Tải danh sách
          </MenuItem>
          {canCalendar(auth?.user, "calendar.groups") && (
            <MenuItem
              onSelect={() =>
                navigateClient("/dashboard/calendar/email-groups")
              }
            >
              <Mail size={17} />
              Nhóm email thông báo
            </MenuItem>
          )}
          <MenuItem
            onSelect={() => navigateClient("/dashboard/admin/roles/settings")}
          >
            <SlidersHorizontal size={17} />
            Cấu hình quyền
          </MenuItem>
        </DropdownMenu>
      </ListPageHeader>
      <Card className="overflow-hidden border-0 bg-transparent shadow-none md:border md:bg-card md:shadow-xs">
        <ListSearchToolbar
          value={search}
          onChange={setSearch}
          label="Tìm nhân sự"
          onFilter={() => setFiltersOpen(true)}
          onDownload={exportCsv}
          filterCount={Number(Boolean(role)) + Number(Boolean(department))}
        />
      </Card>
      <Dialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Bộ lọc nhân sự"
        description="Chọn vai trò và Ban ngành."
      >
        <div className="flex flex-wrap gap-3 w-full min-w-0">
          <DropdownMenu
            animateOnMobile
            label="Vai trò"
            trigger={
              <Button
                variant="outline"
                className="shrink-0 min-w-0 flex-1 justify-between"
                aria-label="Bộ lọc vai trò"
              >
                <span className="truncate">
                  {role === "specialist"
                    ? "Đặc trách"
                    : role
                      ? accessRoleLabels[role]
                      : "Vai trò"}
                </span>
                <ChevronDown size={14} className="shrink-0 ml-2" />
              </Button>
            }
          >
            <MenuItem
              className={role === "" ? "bg-accent" : ""}
              onSelect={() => setRole("")}
            >
              Tất cả vai trò
            </MenuItem>
            {[...managementRoles, "specialist"]
              .slice()
              .sort((a, b) => {
                const labelA =
                  itemRoleLabel(a) ?? accessRoleLabels[a as AccessRole];
                const labelB =
                  itemRoleLabel(b) ?? accessRoleLabels[b as AccessRole];
                return (
                  personnelCollator.compare(labelA, labelB) ||
                  a.localeCompare(b)
                );
              })
              .map((item) => {
                const roleId = item as AccessRole | "specialist";
                return (
                  <MenuItem
                    key={roleId}
                    className={role === roleId ? "bg-accent" : ""}
                    onSelect={() => setRole(roleId)}
                  >
                    {itemRoleLabel(roleId) ??
                      accessRoleLabels[roleId as AccessRole]}
                  </MenuItem>
                );
              })}
          </DropdownMenu>
          <DropdownMenu
            animateOnMobile
            label="Ban ngành"
            trigger={
              <Button
                variant="outline"
                className="shrink-0 min-w-0 flex-1 justify-between"
                aria-label="Bộ lọc ban ngành"
              >
                <span className="truncate">
                  {department
                    ? departments.find((d) => d.id === department)?.name ||
                      department
                    : "Ban ngành"}
                </span>
                <ChevronDown size={14} className="shrink-0 ml-2" />
              </Button>
            }
          >
            <MenuItem
              className={department === "" ? "bg-accent" : ""}
              onSelect={() => setDepartment("")}
            >
              Tất cả Ban ngành
            </MenuItem>
            {sortedDepartments.map((item) => (
              <MenuItem
                key={item.id}
                className={department === item.id ? "bg-accent" : ""}
                onSelect={() => setDepartment(item.id)}
              >
                {item.name}
              </MenuItem>
            ))}
          </DropdownMenu>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setRole("");
              setDepartment("");
            }}
          >
            Xóa bộ lọc
          </Button>
          <Button onClick={() => setFiltersOpen(false)}>Xong</Button>
        </div>
      </Dialog>

      <p className="text-sm text-muted-foreground">
        {query.data?.pages[0]?.total ?? 0} nhân sự
      </p>
      {!filtered.length ? (
        <EmptyState
          title="Không có thành viên phù hợp"
          description="Điều chỉnh bộ lọc hoặc phân công vai trò mới."
        />
      ) : (
        <div className="space-y-3">
          <ul className="space-y-3 md:hidden" aria-label="Danh sách nhân sự">
            {filtered.map((member, index) => (
              <li
                key={member.id}
                onClick={(event) => {
                  if (
                    event.target instanceof Element &&
                    event.currentTarget.contains(event.target) &&
                    !event.target.closest(
                      'a,button,input,select,textarea,[role="button"],[role="menuitem"]',
                    )
                  )
                    navigateClient(`/client/members/${member.id}`);
                }}
              >
                <Card className="min-w-0 cursor-pointer p-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={member.name}
                      variant="member"
                      colorIndex={index}
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="pt-1 text-base leading-snug font-semibold wrap-break-word">
                        <a href={`/client/members/${member.id}`}>
                          {member.name}
                        </a>
                      </h2>
                      <div className="mt-2">
                        <PersonnelAssignment member={member} />
                      </div>
                    </div>
                    {actions(member)}
                  </div>
                  {(member.phone || member.email) && (
                    <div className="mt-3 grid gap-1 border-t pt-2">
                      {member.phone && (
                        <a
                          href={`tel:${member.phone.replace(/[^+0-9]/g, "")}`}
                          className="inline-flex w-fit max-w-full min-h-11 min-w-0 items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Phone size={15} className="shrink-0" />
                          <span className="wrap-break-word">
                            {member.phone}
                          </span>
                        </a>
                      )}
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="flex min-h-11 min-w-0 items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Mail size={15} className="shrink-0" />
                          <span className="break-all">{member.email}</span>
                        </a>
                      )}
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="w-[26%] p-4 font-medium">Thành viên</th>
                  <th className="w-[25%] p-4 font-medium">Liên hệ</th>
                  <th className="p-4 font-medium">Vai trò / Ban ngành</th>
                  <th className="w-20 p-4 text-right font-medium">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((member, index) => (
                  <tr
                    key={member.id}
                    className="cursor-pointer align-middle"
                    onClick={(event) => {
                      if (
                        event.target instanceof Element &&
                        event.currentTarget.contains(event.target) &&
                        !event.target.closest(
                          'a,button,input,select,textarea,[role="button"],[role="menuitem"]',
                        )
                      )
                        navigateClient(`/client/members/${member.id}`);
                    }}
                  >
                    <td className="p-4 font-medium wrap-break-word">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={member.name}
                          variant="member"
                          colorIndex={index}
                        />
                        <a
                          href={`/client/members/${member.id}`}
                          className="min-w-0"
                        >
                          {member.name}
                        </a>
                      </div>
                    </td>
                    <td className="space-y-1 p-4 text-muted-foreground">
                      {member.phone && (
                        <a
                          href={`tel:${member.phone.replace(/[^+0-9]/g, "")}`}
                          className="inline-block w-fit max-w-full wrap-break-word hover:underline"
                        >
                          {member.phone}
                        </a>
                      )}
                      {member.email && (
                        <p className="break-all">{member.email}</p>
                      )}
                      {!member.phone && !member.email && "—"}
                    </td>
                    <td className="p-4">
                      <PersonnelAssignment member={member} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end">{actions(member)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
      <AutoLoadMore query={query} enabled={term === search.trim()} />
      {credentials && (
        <AccountCredentials
          member={{
            id: credentials.id,
            phone: credentials.phone,
            user: { email: credentials.email },
          }}
          org={organizationId}
          onClose={() => {
            setCredentials(null);
            void client.invalidateQueries({
              queryKey: ["admin-assigned-roles"],
            });
          }}
        />
      )}
      {target && (
        <PersonnelMissionsDialog
          key={target.id}
          target={target}
          onClose={() => setTarget(null)}
          onSaved={() => {
            void invalidateMemberReads(client, organizationId);
          }}
        />
      )}
    </div>
  );
}
