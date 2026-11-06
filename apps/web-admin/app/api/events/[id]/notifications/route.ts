import { sendCalendarBatch } from "../../../../../lib/server/calendar-immediate-mail";
import { calendarApi } from "../../../../../lib/server/calendar-api";
import {
  notificationHistory,
  queueEventNotification,
} from "../../../../../lib/server/calendar";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export const GET = (r: Request, c: Context) =>
  calendarApi(r, async (db, a) =>
    notificationHistory(db, a, (await c.params).id),
  );
export const POST = (r: Request, c: Context) =>
  calendarApi(
    r,
    async (db, a, input) =>
      queueEventNotification(db, a, (await c.params).id, input),
    true,
    sendCalendarBatch,
  );
