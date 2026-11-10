"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  accessRoleLabels,
  canCalendar,
  useAuth,
  useWorkspace,
  apiRequest,
  managementRoles,
  prioritizePersonnelAssignments,
  type AccessRole,
} from "@org/core";
import {
  Avatar,
  Button,
  Card,
  DropdownMenu,
  MenuItem,
  EmptyState,
  ErrorMessage,
  Input,
  Select,
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
  items: AssignedMember[];
  departments: { id: string; name: string }[];
};
const personnelCollator = new Intl.Collator("vi", {
  sensitivity: "base",
  numeric: true,
});
function lastNameWord(name: string) {
  return name.trim().split(/\s+/).at(-1) ?? "";
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
            ? ` ${/^ban\s/i.test(item.departmentName) ? item.departmentName : `Ban ${item.departmentName}`}`
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
  const pending = useRef<"edit" | "missions" | "credentials" | null>(null);
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
  const router = useRouter();
  const auth = useAuth();
  const { organizationId } = useWorkspace();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AccessRole | "specialist" | "">("");
  const [department, setDepartment] = useState("");
  const [target, setTarget] = useState<AssignedMember | null>(null);
  const [credentials, setCredentials] = useState<AssignedMember | null>(null);
  const query = useQuery({
    queryKey: ["admin-assigned-roles"],
    queryFn: () => apiRequest<AssignedData>("/api/admin/roles/assigned"),
  });
  if (query.isPending) return <p role="status">Đang tải…</p>;
  if (query.error) return <ErrorMessage error={query.error} />;
  const { items, departments } = query.data!;
  const keyword = search.trim().toLocaleLowerCase("vi");
  const filtered = items
    .filter((member) => {
      if (
        role === "specialist" &&
        !member.personnelRoles.some((label) =>
          label.toLocaleLowerCase("vi").startsWith("đặc trách"),
        )
      )
        return false;
      if (
        role &&
        role !== "specialist" &&
        !member.roles.some((item) => item.roleId === role) &&
        member.role !== role &&
        !member.personnelRoles.some((label) => {
          const prefix =
            role === "board"
              ? "ban điều hành"
              : role === "leader"
                ? "trưởng ban"
                : role === "deacon"
                  ? "chấp sự"
                  : accessRoleLabels[role].toLocaleLowerCase("vi");
          return label.toLocaleLowerCase("vi").startsWith(prefix);
        })
      )
        return false;
      if (department && !member.departmentIds.includes(department))
        return false;
      if (!keyword) return true;
      return [member.name, member.email ?? "", member.phone ?? ""]
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(keyword);
    })
    .sort(
      (a, b) =>
        personnelCollator.compare(lastNameWord(a.name), lastNameWord(b.name)) ||
        personnelCollator.compare(a.name, b.name) ||
        a.id.localeCompare(b.id),
    );
  function actions(member: AssignedMember) {
    return (
      <PersonnelActions
        member={member}
        onEdit={() => router.push(`/client/members/${member.id}`)}
        onMissions={() => setTarget(member)}
        onCredentials={() => setCredentials(member)}
      />
    );
  }
  function exportCsv() {
    const quote = (value: string) =>
      '"' + value.replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"';
    const rows = filtered.map((member) => [
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
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <UserCog className="shrink-0 text-primary" aria-hidden="true" />
            Nhân sự Hội Thánh
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ban điều hành, Trưởng ban ngành, Chấp sự, Đặc trách và thành viên
            các nhân sự trong Hội Thánh.
          </p>
        </div>
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
              onSelect={() => router.push("/dashboard/calendar/email-groups")}
            >
              <Mail size={17} />
              Nhóm email thông báo
            </MenuItem>
          )}
          <MenuItem
            onSelect={() => router.push("/dashboard/admin/roles/settings")}
          >
            <SlidersHorizontal size={17} />
            Cấu hình quyền
          </MenuItem>
        </DropdownMenu>
      </header>
      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <label className="col-span-2 block min-w-0 text-sm sm:col-span-1">
            Tìm kiếm
            <Input
              className="mt-2"
              type="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Tên, số điện thoại, email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="block min-w-0 text-sm">
            Vai trò
            <Select
              className="mt-2 w-full"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as AccessRole | "specialist" | "")
              }
            >
              <option value="">Tất cả vai trò</option>
              <option value="specialist">Đặc trách</option>
              {managementRoles.map((item) => (
                <option key={item} value={item}>
                  {accessRoleLabels[item]}
                </option>
              ))}
            </Select>
          </label>
          <label className="block min-w-0 text-sm">
            Ban ngành
            <Select
              className="mt-2 w-full"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            >
              <option value="">Tất cả Ban ngành</option>
              {departments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </Card>
      {!filtered.length ? (
        <EmptyState
          title="Không có thành viên phù hợp"
          description="Điều chỉnh bộ lọc hoặc phân công vai trò mới."
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length} nhân sự
          </p>
          <ul className="space-y-3 md:hidden" aria-label="Danh sách nhân sự">
            {filtered.map((member, index) => (
              <li key={member.id}>
                <Card className="min-w-0 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={member.name}
                      variant="member"
                      colorIndex={index}
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="pt-1 text-base leading-snug font-semibold wrap-break-word">
                        {member.name}
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
                          className="flex min-h-11 min-w-0 items-center gap-2 text-sm text-muted-foreground"
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
                  <tr key={member.id} className="align-middle">
                    <td className="p-4 font-medium wrap-break-word">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={member.name}
                          variant="member"
                          colorIndex={index}
                        />
                        <span className="min-w-0">{member.name}</span>
                      </div>
                    </td>
                    <td className="space-y-1 p-4 text-muted-foreground">
                      {member.phone && (
                        <a
                          href={`tel:${member.phone.replace(/[^+0-9]/g, "")}`}
                          className="block wrap-break-word hover:underline"
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
            void client.invalidateQueries();
          }}
        />
      )}
    </div>
  );
}
