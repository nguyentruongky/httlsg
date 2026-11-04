"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accessRoleLabels, apiRequest, type AccessRole } from "@org/core";
import { Button, Card, ErrorMessage, useToast } from "@org/ui";
type Role = { id: AccessRole; name: string; permissions: string[] };
type Permission = { id: string; code: string; name: string };
type Data = {
  roles: Role[];
  permissions: Permission[];
  allowed: Record<string, string[]>;
};
export function RolePermissionSettings() {
  const query = useQuery({
    queryKey: ["admin-role-permissions"],
    queryFn: () => apiRequest<Data>("/api/admin/roles/permissions"),
  });
  if (query.isPending) return <p role="status">Đang tải…</p>;
  if (query.error) return <ErrorMessage error={query.error} />;
  const data = query.data!;
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-primary">
          Roles &amp; permissions
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Cấu hình quyền theo vai trò
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bật/tắt quyền tính năng cho từng vai trò. Admin và Thư ký luôn có toàn
          quyền và không thể chỉnh sửa.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {data.roles.map((role) => (
          <RolePermissionCard
            key={`${role.id}:${role.permissions.join(",")}`}
            role={role}
            permissions={data.permissions}
            allowed={data.allowed[role.id] ?? []}
          />
        ))}
      </div>
    </div>
  );
}
function RolePermissionCard({
  role,
  permissions,
  allowed,
}: {
  role: Role;
  permissions: Permission[];
  allowed: string[];
}) {
  const { toast } = useToast();
  const client = useQueryClient();
  const [selected, setSelected] = useState<string[]>(role.permissions);
  const locked = role.id === "admin" || role.id === "secretary";
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/admin/roles/permissions", {
        method: "POST",
        body: JSON.stringify({ role_id: role.id, permissions: selected }),
      }),
    onSuccess: () => {
      toast({
        title: "Đã lưu quyền",
        description: `Vai trò ${accessRoleLabels[role.id]}`,
        variant: "success",
      });
      client.invalidateQueries({ queryKey: ["admin-role-permissions"] });
    },
    onError: (error) =>
      toast({
        title: "Không thể lưu quyền",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      }),
  });
  const options = permissions.filter((item) => allowed.includes(item.code));
  return (
    <Card className="flex flex-col p-5">
      <h2 className="font-semibold">{accessRoleLabels[role.id]}</h2>
      {locked ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Toàn quyền quản lý. Admin và Thư ký luôn có quyền đầy đủ và giống nhau.
        </p>
      ) : (
        <>
          <form
            className="mt-4 flex-1 space-y-1"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <fieldset disabled={mutation.isPending} className="space-y-1">
              <legend className="sr-only">
                Quyền của {accessRoleLabels[role.id]}
              </legend>
              {options.length ? (
                options.map((item) => (
                  <label
                    key={item.id}
                    className="flex min-h-11 items-center gap-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={selected.includes(item.code)}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, item.code]
                            : current.filter((code) => code !== item.code),
                        )
                      }
                    />
                    {item.name}
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Vai trò này không có quyền tính năng nào.
                </p>
              )}
            </fieldset>
            {mutation.error && (
              <div className="pt-2">
                <ErrorMessage error={mutation.error} />
              </div>
            )}
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Đang lưu…" : "Lưu quyền"}
            </Button>
          </form>
        </>
      )}
    </Card>
  );
}
