import { scheduleApi } from "../../../../../lib/server/schedule-api";
import { getNotifiedSchedule } from "../../../../../lib/server/schedules";

export const runtime = "nodejs";
export const GET = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) =>
  scheduleApi(request, async (db, actor) =>
    getNotifiedSchedule(db, actor, (await context.params).id),
  );
