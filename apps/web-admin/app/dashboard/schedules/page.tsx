import { ScheduleManager } from "../../../../mobile-client/src/schedules/schedule-manager";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const params = await searchParams;
  return <ScheduleManager initialCreate={params.create === "1"} />;
}
