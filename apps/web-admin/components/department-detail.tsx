"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, useAuth } from "@org/core";
import { Button, Input, ErrorMessage, useToast } from "@org/ui";
import { DepartmentProfileWorkspace } from "./department-profile-workspace";
export function DepartmentDetail({ id }: { id: string }) {
  const user = useAuth()?.user;
  const allowed = Boolean(
    user &&
    ["admin", "secretary"].includes(user.role) &&
    user.permissions.includes("departments.manage"),
  );
  const query = useQuery({
    queryKey: ["admin-departments"],
    queryFn: () =>
      apiRequest<{
        departments: { id: string; name: string; memberCount: number }[];
      }>("/api/admin/departments"),
    enabled: allowed,
  });
  const department = query.data?.departments.find((item) => item.id === id);
  return (
    <div className="space-y-5">
      {(!allowed || query.isPending || query.error || !department) && (
        <Link
          href="/dashboard/settings"
          className="inline-flex min-h-11 items-center gap-2 text-primary"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
          Quản lý Ban ngành và phân quyền
        </Link>
      )}
      {!allowed ? (
        <p role="alert">Chỉ Admin và Thư ký được quản lý Ban ngành.</p>
      ) : query.isPending ? (
        <p role="status">Đang tải Ban ngành…</p>
      ) : query.error ? (
        <ErrorMessage error={query.error} />
      ) : !department ? (
        <p role="alert">Không tìm thấy Ban ngành.</p>
      ) : (
        <>
          <DepartmentProfileWorkspace key={id} department={department} />
          <DepartmentSettings
            key={id + "-" + department.name}
            department={department}
          />
        </>
      )}
    </div>
  );
}

function DepartmentSettings({
  department,
}: {
  department: { id: string; name: string };
}) {
  const [name, setName] = useState(department.name),
    [confirm, setConfirm] = useState(false);
  const client = useQueryClient(),
    router = useRouter(),
    { toast } = useToast();
  const mutation = useMutation({
    mutationFn: (remove: boolean) =>
      apiRequest("/api/admin/departments", {
        method: remove ? "DELETE" : "PATCH",
        body: JSON.stringify({
          id: department.id,
          ...(remove ? {} : { name }),
        }),
      }),
    onSuccess: async (_, remove) => {
      toast({
        title: remove ? "Đã xóa Ban ngành" : "Đã cập nhật Ban ngành",
        variant: "success",
      });
      if (remove) router.push("/dashboard/settings");
      await client.invalidateQueries();
    },
  });
  return (
    <details className="rounded-xl border p-4">
      <summary className="min-h-6 cursor-pointer font-medium">
        Cài đặt Ban ngành
      </summary>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(false);
        }}
      >
        <label className="block text-sm">
          Tên Ban ngành
          <Input
            className="mt-2"
            aria-label="Tên Ban ngành"
            value={name}
            required
            minLength={2}
            maxLength={100}
            disabled={mutation.isPending}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={mutation.isPending || name === department.name}
          >
            Lưu tên
          </Button>
          <Button
            type="button"
            variant="outline"
            className="text-destructive"
            disabled={mutation.isPending}
            onClick={() => setConfirm(true)}
          >
            Xóa Ban ngành
          </Button>
        </div>
        {confirm && (
          <div className="space-y-2 rounded-lg border p-3 text-sm">
            <p>Xóa Ban ngành này và các phân công liên quan?</p>
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(true)}
              >
                Xác nhận xóa Ban ngành
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => setConfirm(false)}
              >
                Hủy xóa
              </Button>
            </div>
          </div>
        )}
        {mutation.error && <ErrorMessage error={mutation.error} />}
      </form>
    </details>
  );
}
