import { scheduleApi } from "../../../../lib/server/schedule-api";
import {
  getSchedule,
  saveSchedule,
  transitionSchedule,
} from "../../../../lib/server/schedules";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export const GET = (request: Request, context: Context) =>
  scheduleApi(request, async (db, actor) =>
    getSchedule(db, actor, (await context.params).id),
  );
export const PUT = (request: Request, context: Context) =>
  scheduleApi(
    request,
    async (db, actor, input) =>
      saveSchedule(db, actor, input, (await context.params).id),
    true,
    true,
  );
export const DELETE = (request: Request, context: Context) =>
  scheduleApi(
    request,
    async (db, actor, input) =>
      transitionSchedule(db, actor, (await context.params).id, input, "delete"),
    true,
  );
