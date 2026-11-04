import Link from "next/link";
import { canOpenLeaderConsole } from "@org/core";
import { requirePageActor } from "../../../lib/server/page-auth";
import { LeaderOtpConsole } from "../../../components/leader-otp-console";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await requirePageActor();
  if (!canOpenLeaderConsole(user))
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-2xl font-semibold">Bạn không có quyền truy cập</h1>
        <p className="mt-3">
          Trang này chỉ dành cho trưởng Ban ngành đã được phân công.
        </p>
        <Link
          href="/client"
          className="mt-5 inline-block text-primary underline"
        >
          Về hồ sơ cá nhân
        </Link>
      </main>
    );
  return <LeaderOtpConsole />;
}
