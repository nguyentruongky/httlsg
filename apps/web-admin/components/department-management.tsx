"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiRequest,
  useWorkspace,
  useOrganization,
  useAuth,
  type Member,
} from "@org/core";
import { Button, Card, Input, Select, ErrorMessage } from "@org/ui";
type Department = { id: string; name: string };
type Catalog = {
  departments: Department[];
  managers: { userId: string; departmentId: string }[];
};
export function DepartmentManagement() {
  const { organizationId } = useWorkspace();
  const members = useOrganization(organizationId);
  const auth = useAuth();
  const query = useQuery({
    queryKey: ["admin-departments"],
    queryFn: () => apiRequest<Catalog>("/api/admin/departments"),
  });
  const client = useQueryClient();
  const [id, setId] = useState(""),
    [name, setName] = useState(""),
    [board, setBoard] = useState(""),
    [assigned, setAssigned] = useState<string[]>([]),
    [saved, setSaved] = useState(false);
  const mutation = useMutation({
    mutationFn: ({
      path,
      method,
      data,
    }: {
      path: string;
      method: string;
      data: unknown;
    }) => apiRequest(path, { method, body: JSON.stringify(data) }),
    onSuccess: async () => {
      await client.invalidateQueries();
      await auth?.refresh();
      setSaved(true);
    },
  });
  if (query.isPending || members.isPending)
    return <p role="status">Đang tải…</p>;
  if (query.error || members.error)
    return <ErrorMessage error={query.error ?? members.error} />;
  const departments = query.data!.departments;
  const boards = members.data!.members.filter((m) => m.accessRole === "board");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Quản lý Ban ngành và phân quyền
      </h1>
      {mutation.error && <ErrorMessage error={mutation.error} />}{" "}
      {saved && (
        <p role="status" className="text-sm text-primary">
          Đã lưu thay đổi.
        </p>
      )}
      <Card className="p-5">
        <h2 className="font-semibold">Ban ngành</h2>
        <div className="mt-4 divide-y">
          {departments.map((d) => (
            <DepartmentRow
              key={`${d.id}-${d.name}`}
              department={d}
              disabled={mutation.isPending}
              onSave={(name) => {
                setSaved(false);
                mutation.mutate({
                  path: "/api/admin/departments",
                  method: "PATCH",
                  data: { id: d.id, name },
                });
              }}
              onDelete={() => {
                setSaved(false);
                mutation.mutate({
                  path: "/api/admin/departments",
                  method: "DELETE",
                  data: { id: d.id },
                });
              }}
            />
          ))}
        </div>
        <form
          className="mt-5 flex flex-wrap items-end gap-3 border-t pt-5"
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(false);
            mutation.mutate({
              path: "/api/admin/departments",
              method: "POST",
              data: { id, name },
            });
          }}
        >
          <label className="text-sm">
            Mã Ban ngành
            <Input
              required
              pattern="[a-z0-9-]+"
              maxLength={100}
              placeholder="ban-moi"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="mt-2"
            />
          </label>
          <label className="text-sm">
            Tên Ban ngành
            <Input
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2"
            />
          </label>
          <Button disabled={mutation.isPending} type="submit">
            Thêm
          </Button>
        </form>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold">Phạm vi Ban điều hành</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Thành viên có vai trò Ban điều hành được sửa hồ sơ thuộc các Ban ngành
          đã giao.
        </p>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (board) {
              setSaved(false);
              mutation.mutate({
                path: "/api/admin/users/access",
                method: "POST",
                data: { ids: [board], departmentIds: assigned },
              });
            }
          }}
        >
          <label className="block text-sm">
            Người phụ trách
            <Select
              className="mt-2 w-full"
              required
              value={board}
              onChange={(e) => {
                setBoard(e.target.value);
                setAssigned(
                  query
                    .data!.managers.filter((m) => m.userId === e.target.value)
                    .map((m) => m.departmentId),
                );
              }}
            >
              <option value="">Chọn người phụ trách</option>
              {boards.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user.name}
                </option>
              ))}
            </Select>
          </label>
          {board && (
            <fieldset
              disabled={mutation.isPending}
              className="grid gap-2 sm:grid-cols-2"
            >
              <legend className="mb-2 text-sm">Ban ngành được quản lý</legend>
              {departments.map((d) => (
                <label
                  key={d.id}
                  className="flex min-h-11 items-center gap-3 text-sm"
                >
                  <input
                    className="size-4"
                    type="checkbox"
                    checked={assigned.includes(d.id)}
                    onChange={(e) =>
                      setAssigned(
                        e.target.checked
                          ? [...assigned, d.id]
                          : assigned.filter((id) => id !== d.id),
                      )
                    }
                  />
                  {d.name}
                </label>
              ))}
            </fieldset>
          )}
          <Button type="submit" disabled={!board || mutation.isPending}>
            Lưu phân quyền
          </Button>
        </form>
      </Card>
    </div>
  );
}
function DepartmentRow({
  department,
  disabled,
  onSave,
  onDelete,
}: {
  department: Department;
  disabled: boolean;
  onSave: (name: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(department.name),
    [confirm, setConfirm] = useState(false);
  return (
    <form
      className="flex flex-wrap items-center gap-2 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(name);
      }}
    >
      <Input
        aria-label={`Tên ${department.name}`}
        className="min-w-0 basis-full sm:basis-40 flex-1"
        required
        minLength={2}
        maxLength={100}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button
        size="sm"
        variant="outline"
        type="submit"
        disabled={disabled || name === department.name}
      >
        Lưu
      </Button>
      <Button
        size="sm"
        variant="ghost"
        type="button"
        disabled={disabled}
        onClick={() => setConfirm((v) => !v)}
      >
        Xóa
      </Button>
      {confirm && (
        <div className="w-full rounded-lg border p-3 text-sm">
          <p>Xóa Ban ngành này và các phân công liên quan?</p>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={disabled}
              onClick={onDelete}
            >
              Xác nhận xóa
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setConfirm(false)}
            >
              Hủy
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
