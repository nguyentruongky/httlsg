"use client";
import { Building2, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiRequest,
  DEPARTMENT_TYPE_LABELS,
  type DepartmentType,
} from "@org/core";
import { Button, Card, Input, Dialog, ErrorMessage } from "@org/ui";
import { navigateClient } from "./client-router";
type Department = {
  id: string;
  name: string;
  departmentType: DepartmentType;
  memberCount?: number;
};
type Catalog = { departments: Department[] };
export function DepartmentManagement() {
  const query = useQuery({
    queryKey: ["admin-departments"],
    queryFn: () => apiRequest<Catalog>("/api/admin/departments"),
  });
  const client = useQueryClient();
  const [open, setOpen] = useState(false),
    [id, setId] = useState(""),
    [name, setName] = useState(""),
    [departmentType, setDepartmentType] = useState<DepartmentType>("ministry"),
    [saved, setSaved] = useState(false);
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/admin/departments", {
        method: "POST",
        body: JSON.stringify({ id, name, departmentType }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries();
      setOpen(false);
      setId("");
      setName("");
      setDepartmentType("ministry");
      setSaved(true);
    },
  });
  if (query.isPending) return <p role="status">Đang tải…</p>;
  if (query.error) return <ErrorMessage error={query.error} />;
  return (
    <div className="space-y-6">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-semibold">
          <Building2 className="shrink-0 text-primary" aria-hidden="true" />
          Ban ngành
        </h1>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          aria-label="Thêm Ban ngành"
          onClick={() => {
            mutation.reset();
            setId("");
            setName("");
            setDepartmentType("ministry");
            setSaved(false);
            setOpen(true);
          }}
        >
          <Plus size={22} aria-hidden="true" />
        </Button>
      </div>
      {saved && (
        <p role="status" className="text-sm text-primary">
          Đã thêm Ban ngành.
        </p>
      )}
      {(["choir", "ministry", "other"] as const).map((type) => {
        const departments = query.data!.departments.filter(
          (department) => department.departmentType === type,
        );
        if (!departments.length) return null;
        return (
          <section key={type} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {DEPARTMENT_TYPE_LABELS[type]}
            </h2>
            <Card className="divide-y px-5">
              {departments.map((department) => (
                <DepartmentRow key={department.id} department={department} />
              ))}
            </Card>
          </section>
        );
      })}
      {open && (
        <Dialog
          open
          onOpenChange={(next) => {
            if (!mutation.isPending) setOpen(next);
          }}
          title="Thêm đơn vị"
          description=""
          closeLabel="Đóng Ban ngành"
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <label className="block text-sm font-medium">
              ID
              <Input
                required
                pattern="[a-z0-9-]+"
                maxLength={100}
                placeholder="ban-moi"
                value={id}
                onChange={(event) => setId(event.target.value)}
                disabled={mutation.isPending}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="mt-2 w-full"
              />
            </label>
            <label className="block text-sm font-medium">
              Tên Ban ngành
              <Input
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={mutation.isPending}
                autoComplete="off"
                className="mt-2 w-full"
              />
            </label>
            <label className="block text-sm font-medium">
              Nhóm
              <select
                aria-label="Nhóm đơn vị"
                value={departmentType}
                onChange={(event) =>
                  setDepartmentType(event.target.value as DepartmentType)
                }
                disabled={mutation.isPending}
                className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {(["choir", "ministry", "other"] as const).map((type) => (
                  <option key={type} value={type}>
                    {DEPARTMENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            {mutation.error && <ErrorMessage error={mutation.error} />}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Đang lưu…" : "Lưu"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => setOpen(false)}
              >
                Hủy
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
function DepartmentRow({ department }: { department: Department }) {
  return (
    <a
      href={"/dashboard/departments/" + encodeURIComponent(department.id)}
      onClick={(e) => {
        e.preventDefault();
        navigateClient(
          "/dashboard/departments/" + encodeURIComponent(department.id),
        );
      }}
      aria-label={"Chi tiết " + department.name}
      className="flex min-h-16 items-center gap-3 py-3 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1">
        <p className="break-words font-medium">{department.name}</p>
        <p className="text-sm text-muted-foreground">
          {department.memberCount ?? 0} thành viên
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0" aria-hidden="true" />
    </a>
  );
}
