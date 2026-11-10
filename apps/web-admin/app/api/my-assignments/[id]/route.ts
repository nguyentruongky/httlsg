import { scheduleApi } from "../../../../lib/server/schedule-api";
import { getAssignedSchedule } from "../../../../lib/server/schedules";

export const runtime = "nodejs";
export const GET = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) =>
  scheduleApi(request, async (db, actor) =>
    getAssignedSchedule(db, actor, (await context.params).id),
  );
