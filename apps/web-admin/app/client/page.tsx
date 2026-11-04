import { requirePageActor } from "../../lib/server/page-auth";
import { MobileClient } from "../../components/mobile-client";
export const dynamic = "force-dynamic";
export default async function ClientPage() {
  await requirePageActor();
  return <MobileClient />;
}
