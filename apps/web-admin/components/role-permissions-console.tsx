"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AccessRoleSchema,
  accessRoleLabels,
  apiRequest,
  useAuth,
  type AccessRole,
} from "@org/core";
import { Button, Card, Input, Select, ErrorMessage } from "@org/ui";
type Role = { id: AccessRole; name: string; permissions: string[] };
type User = {
  id: string;
  name: string;
  role: AccessRole;
  department_id: string | null;
  leader_department_id: string | null;
  has_account: boolean;
};
type Data = {
  roles: Role[];
  permissions: { id: string; code: string; name: string }[];
  departments: { id: string; name: string }[];
  users: User[];
  allowed: Record<string, string[]>;
};
export function RolePermissionsConsole() {
  const auth = useAuth(),
    client = useQueryClient();
  const [search, setSearch] = useState(""),
    [selected, setSelected] = useState(""),
    [role, setRole] = useState<AccessRole>("user"),
    [department, setDepartment] = useState(""),
    [saved, setSaved] = useState(false);
  const query = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => apiRequest<Data>("/api/admin/roles"),
  });
  const mutation = useMutation({
    mutationFn: (data: unknown) =>
      apiRequest("/api/admin/roles", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: async () => {
      await client.invalidateQueries();
      setSaved(true);
    },
  });
  if (query.isPending) return <p role="status">Đang tải…</p>;
  if (query.error) return <ErrorMessage error={query.error} />;
  const data = query.data!;
  const target = data.users.find((u) => u.id === selected);
  const options = data.users
    .filter(
      (u) =>
        u.id !== auth?.user?.id &&
        u.name.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")),
    )
    .slice(0, 100);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Vai trò và phân quyền</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Phân công trưởng Ban ngành và quản lý quyền theo vai trò.
        </p>
      </div>
      {saved && (
        <p role="status" className="text-sm text-primary">
          Đã lưu thay đổi. Thành viên cần đăng nhập lại để sử dụng quyền mới.
        </p>
      )}
      {mutation.error && <ErrorMessage error={mutation.error} />}
      <Card className="p-5 sm:p-6">
        <h2 className="font-semibold">Phân công thành viên</h2>
        <form
          className="mt-5 grid gap-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(false);
            mutation.mutate({
              action: "assign-user",
              user_id: selected,
              role_id: role,
              department_id: department || null,
            });
          }}
        >
          <div className="space-y-3 sm:col-span-2">
            <label className="block text-sm">
              Tìm thành viên
              <Input
                className="mt-2"
                placeholder="Nhập tên thành viên"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Thành viên
              <Select
                className="mt-2 w-full"
                value={selected}
                required
                onChange={(e) => {
                  setSelected(e.target.value);
                  const u = data.users.find((u) => u.id === e.target.value);
                  setRole(u?.role ?? "user");
                  setDepartment(
                    u?.leader_department_id ?? u?.department_id ?? "",
                  );
                }}
              >
                <option value="">Chọn thành viên</option>
                {target && !options.some((u) => u.id === target.id) && (
                  <option value={target.id}>{target.name}</option>
                )}
                {options.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <label className="block text-sm">
            Vai trò
            <Select
              className="mt-2 w-full"
              value={role}
              onChange={(e) => setRole(e.target.value as AccessRole)}
            >
              {AccessRoleSchema.options.map((r) => (
                <option key={r} value={r}>
                  {accessRoleLabels[r]}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm">
            Ban ngành{role === "leader" ? " phụ trách" : ""}
            <Select
              className="mt-2 w-full"
              value={department}
              required={role === "leader"}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">Chọn Ban ngành</option>
              {data.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </label>
          {role === "leader" && (
            <p className="text-sm leading-relaxed text-muted-foreground sm:col-span-2">
              Trưởng Ban ngành chỉ được xem mã OTP của Ban ngành đã chọn. Việc
              đổi Ban ngành sẽ vô hiệu hóa các mã OTP và phiên đăng nhập cũ.
            </p>
          )}
          {role === "leader" && target && !target.has_account && (
            <p role="alert" className="text-sm text-destructive sm:col-span-2">
              Hồ sơ chưa có tài khoản. Vui lòng thiết lập thông tin đăng nhập
              trong danh sách thành viên trước.
            </p>
          )}
          <Button
            type="submit"
            disabled={
              !selected ||
              mutation.isPending ||
              (role === "leader" && (!department || !target?.has_account))
            }
          >
            Lưu phân công
          </Button>
        </form>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        {data.roles.map((r) => (
          <RoleCard
            key={`${r.id}:${r.permissions.join(",")}`}
            role={r}
            permissions={data.permissions}
            allowed={data.allowed[r.id] ?? []}
            pending={mutation.isPending}
            onSave={(permissions) => {
              setSaved(false);
              mutation.mutate({
                action: "update-role-permissions",
                role_id: r.id,
                permissions,
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}
function RoleCard({
  role,
  permissions,
  allowed,
  pending,
  onSave,
}: {
  role: Role;
  permissions: Data["permissions"];
  allowed: string[];
  pending: boolean;
  onSave: (permissions: string[]) => void;
}) {
  const [selected, setSelected] = useState(role.permissions);
  const locked = role.id === "admin" || role.id === "secretary";
  return (
    <Card className="p-5">
      <h2 className="font-semibold">{accessRoleLabels[role.id]}</h2>
      {locked ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Toàn quyền quản lý. Admin và Thư ký luôn có quyền đầy đủ và giống
          nhau.
        </p>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(selected);
          }}
        >
          <fieldset disabled={pending} className="space-y-1">
            <legend className="sr-only">
              Quyền của {accessRoleLabels[role.id]}
            </legend>
            {permissions
              .filter((p) => allowed.includes(p.code))
              .map((p) => (
                <label
                  key={p.id}
                  className="flex min-h-11 items-center gap-3 text-sm"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={selected.includes(p.code)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, p.code]
                          : selected.filter((code) => code !== p.code),
                      )
                    }
                  />
                  {p.name}
                </label>
              ))}
          </fieldset>
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            Lưu quyền
          </Button>
        </form>
      )}
    </Card>
  );
}
