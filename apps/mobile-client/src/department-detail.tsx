"use client";
import { ArrowLeft } from "lucide-react";
import { departments, useAuth } from "@org/core";
import { DepartmentProfileWorkspace } from "./department-profile-workspace";
import { navigateClient, usePathname } from "./client-router";
export function DepartmentDetail({
  id,
  fixedViewport = false,
}: {
  id: string;
  fixedViewport?: boolean;
}) {
  const basePath = usePathname().startsWith("/client/")
    ? "/client/departments"
    : "/dashboard/departments";
  const user = useAuth()?.user;
  const allowed = Boolean(user && !user.requiresPasswordSetup);
  const department = departments.find((item) => item.id === id);
  return (
    <div className={fixedViewport ? "h-full min-h-0" : "space-y-5"}>
      {(!allowed || !department) && (
        <a
          href={basePath}
          onClick={(e) => {
            e.preventDefault();
            navigateClient(basePath, false, "back");
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
          <DepartmentProfileWorkspace
            key={id}
            department={department}
            fixedViewport={fixedViewport}
          />
        </>
      )}
    </div>
  );
}
