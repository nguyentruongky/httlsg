import { calendarApi } from "../../../../lib/server/calendar-api";
import { resolveDelivery } from "../../../../lib/server/calendar";
export const runtime = "nodejs";
export const PATCH = (r: Request, c: { params: Promise<{ id: string }> }) =>
  calendarApi(
    r,
    async (db, a, input) => resolveDelivery(db, a, (await c.params).id, input),
    true,
  );
