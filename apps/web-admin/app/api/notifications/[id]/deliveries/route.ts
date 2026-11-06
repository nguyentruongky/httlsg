import { calendarApi } from "../../../../../lib/server/calendar-api";
import { notificationDeliveries } from "../../../../../lib/server/calendar";
export const runtime = "nodejs";
export const GET = (r: Request, c: { params: Promise<{ id: string }> }) =>
  calendarApi(r, async (db, a, input) =>
    notificationDeliveries(db, a, (await c.params).id, input),
  );
