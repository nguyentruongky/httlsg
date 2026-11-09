import { scheduleApi } from "../../../../../lib/server/schedule-api";
import {
  saveSchedule,
  transitionSchedule,
} from "../../../../../lib/server/schedules";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export const POST = (request: Request, context: Context) =>
  scheduleApi(
    request,
    async (db, actor, input) => {
      const saved = await saveSchedule(
        db,
        actor,
        input,
        (await context.params).id,
      );
      return transitionSchedule(
        db,
        actor,
        saved.id,
        { version: saved.version },
        "publish",
      );
    },
    true,
    true,
  );
