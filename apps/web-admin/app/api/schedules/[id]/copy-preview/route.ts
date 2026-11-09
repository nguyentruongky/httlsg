import { scheduleApi } from "../../../../../lib/server/schedule-api";
import { copySchedule } from "../../../../../lib/server/schedules";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export const POST = (request: Request, context: Context) =>
  scheduleApi(
    request,
    async (db, actor, input) =>
      copySchedule(db, actor, (await context.params).id, input, true),
    true,
    false,
  );
