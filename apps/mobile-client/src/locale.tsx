import type { Member } from "@org/core";
export const roleLabels: Record<Member["role"], string> = {
  admin: "Quản trị viên",
  manager: "Quản lý",
  member: "Thành viên",
};
export const statusLabels: Record<Member["status"], string> = {
  active: "Trung tín",
  invited: "Đã mời",
  suspended: "Tạm ngưng",
};
export function ClientError({ error }: { error: unknown }) {
  const message =
    error instanceof Error && /[à-ỹđĐ]/u.test(error.message)
      ? error.message
      : "Không thể tải dữ liệu. Vui lòng thử lại.";
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
    >
      {message}
    </p>
  );
}
