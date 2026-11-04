import Link from "next/link";
import { hasDashboard } from "@org/core";
import { requirePageActor } from "../../../lib/server/page-auth";
import { AdminShell } from "../../../components/admin-shell";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requirePageActor();
  if (!hasDashboard(actor.role))
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-2xl font-semibold">Bạn không có quyền truy cập</h1>
        <p className="mt-3">Trang quản trị dành cho Admin và Thư ký.</p>
        <Link
          href="/client"
          className="mt-6 inline-block text-primary underline"
        >
          Về danh sách thành viên
        </Link>
      </main>
    );
  return <AdminShell>{children}</AdminShell>;
}
