"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, useAuth } from "@org/core";
import { ErrorMessage } from "@org/ui";
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
          href="/dashboard/departments"
          className="inline-flex min-h-11 items-center gap-2 text-primary"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
          Ban ngành
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
        </>
      )}
    </div>
  );
}
