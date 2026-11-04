import { requirePageActor } from "../../lib/server/page-auth";
export const dynamic = "force-dynamic";
export default async function DashboardSessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageActor();
  return children;
}
