import { scheduleApi } from "../../../../../lib/server/schedule-api";
import { transitionSchedule } from "../../../../../lib/server/schedules";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export const POST = (request: Request, context: Context) =>
  scheduleApi(
    request,
    async (db, actor, input) =>
      transitionSchedule(db, actor, (await context.params).id, input, "cancel"),
    true,
    true,
  );
