"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  accessRoleLabels,
  apiRequest,
  managementRoles,
  type AccessRole,
} from "@org/core";
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorMessage,
  Input,
  Select,
  useToast,
} from "@org/ui";
import {
  RoleAssignDialog,
  type AssignRoleEntry,
  type AssignTarget,
} from "./role-assign-dialog";
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
};
type AssignedData = {
  items: AssignedMember[];
  departments: { id: string; name: string }[];
};
export function RoleMembers() {
  const client = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AccessRole | "">("");
  const [department, setDepartment] = useState("");
  const [target, setTarget] = useState<AssignTarget | null>(null);
  const [revoking, setRevoking] = useState<AssignedMember | null>(null);
  const query = useQuery({
    queryKey: ["admin-assigned-roles"],
    queryFn: () => apiRequest<AssignedData>("/api/admin/roles/assigned"),
  });
  const revoke = useMutation({
    mutationFn: (member: AssignedMember) =>
      apiRequest("/api/admin/roles/assign-user", {
        method: "PUT",
        body: JSON.stringify({ user_id: member.id, roles: [] }),
      }),
    onSuccess: (_data, member) => {
      toast({
        title: "Đã thu hồi vai trò",
        description: `${member.name} trở về vai trò User.`,
        variant: "success",
      });
      setRevoking(null);
      client.invalidateQueries({ queryKey: ["admin-assigned-roles"] });
    },
    onError: (error) =>
      toast({
        title: "Không thể thu hồi vai trò",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      }),
  });
  if (query.isPending) return <p role="status">Đang tải…</p>;
  if (query.error) return <ErrorMessage error={query.error} />;
  const { items, departments } = query.data!;
  const keyword = search.trim().toLocaleLowerCase("vi");
  const filtered = items.filter((member) => {
    if (role && member.role !== role) return false;
    if (department && !member.departmentIds.includes(department)) return false;
    if (!keyword) return true;
    return [member.name, member.email ?? "", member.phone ?? ""]
      .join(" ")
      .toLocaleLowerCase("vi")
      .includes(keyword);
  });
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-primary">
          Roles &amp; permissions
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Thành viên quản trị
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Danh sách thành viên đang giữ vai trò quản trị. Vai trò User mặc định
          không hiển thị tại đây.
        </p>
      </div>
      <Card className="p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
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
          <label className="block text-sm">
            Vai trò
            <Select
              className="mt-2 w-full"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as AccessRole | "")
              }
            >
              <option value="">Tất cả vai trò</option>
              {managementRoles.map((item) => (
                <option key={item} value={item}>
                  {accessRoleLabels[item]}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm">
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
        <Card className="overflow-x-auto">
          <table
            role="table"
            className="phone-table w-full min-w-[720px] text-sm"
          >
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-4 font-medium">Thành viên</th>
                <th className="p-4 font-medium">Liên hệ</th>
                <th className="p-4 font-medium">Vai trò</th>
                <th className="p-4 font-medium">Ban ngành</th>
                <th className="p-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((member) => (
                <tr key={member.id}>
                  <td data-label="Thành viên" className="p-4 font-medium">
                    {member.name}
                  </td>
                  <td
                    data-label="Liên hệ"
                    className="p-4 text-muted-foreground"
                  >
                    {[member.email, member.phone].filter(Boolean).join(" · ") ||
                      "—"}
                  </td>
                  <td data-label="Vai trò" className="p-4">
                    <Badge>{accessRoleLabels[member.role]}</Badge>
                  </td>
                  <td
                    data-label="Ban ngành"
                    className="p-4 text-muted-foreground"
                  >
                    {member.departmental
                      ? member.departmentNames.join(", ") || "Chưa gán"
                      : "—"}
                  </td>
                  <td data-label="Thao tác" className="p-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTarget(member)}
                      >
                        Cập nhật
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          revoke.reset();
                          setRevoking(member);
                        }}
                      >
                        Thu hồi
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <RoleAssignDialog
        open={Boolean(target)}
        onOpenChange={(next) => {
          if (!next) setTarget(null);
        }}
        target={target}
        departments={departments}
        onSaved={() => {
          client.invalidateQueries({ queryKey: ["admin-assigned-roles"] });
        }}
      />
      <Dialog
        open={Boolean(revoking)}
        onOpenChange={(next) => {
          if (!next && !revoke.isPending) setRevoking(null);
        }}
        title="Thu hồi vai trò"
        description={`Xoá vai trò quản trị của ${revoking?.name ?? ""} và chuyển về vai trò User?`}
      >
        {revoke.error && <ErrorMessage error={revoke.error} />}
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={revoke.isPending}
            onClick={() => setRevoking(null)}
          >
            Hủy
          </Button>
          <Button
            variant="destructive"
            disabled={revoke.isPending}
            onClick={() => revoking && revoke.mutate(revoking)}
          >
            {revoke.isPending ? "Đang xử lý…" : "Xác nhận thu hồi"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
