import { sendCalendarRetry } from "../../../../../lib/server/calendar-immediate-mail";
import { calendarApi } from "../../../../../lib/server/calendar-api";
import { retryNotification } from "../../../../../lib/server/calendar";
export const runtime = "nodejs";
export const POST = (r: Request, c: { params: Promise<{ id: string }> }) =>
  calendarApi(
    r,
    async (db, a, input) =>
      retryNotification(db, a, (await c.params).id, input),
    true,
    sendCalendarRetry,
  );
