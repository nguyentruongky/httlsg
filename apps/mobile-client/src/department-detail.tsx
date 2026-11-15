"use client";
import { ArrowLeft } from "lucide-react";
import { departments, useAuth } from "@org/core";
import { DepartmentProfileWorkspace } from "./department-profile-workspace";
import { navigateClient } from "./client-router";
export function DepartmentDetail({ id }: { id: string }) {
  const user = useAuth()?.user;
  const allowed = Boolean(
    user &&
    (user.role === "deacon" ||
      user.role === "admin" ||
      (user.role === "secretary" &&
        user.permissions.includes("departments.manage"))),
  );
  const department = departments.find((item) => item.id === id);
  return (
    <div className="space-y-5">
      {(!allowed || !department) && (
        <a
          href="/dashboard/departments"
          onClick={(e) => {
            e.preventDefault();
            navigateClient("/dashboard/departments", false, "back");
          }}
          className="inline-flex min-h-11 items-center gap-2 text-primary"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
          Ban ngành
        </a>
      )}
      {!allowed ? (
        <p role="alert">Chỉ Admin và Thư ký được quản lý Ban ngành.</p>
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
