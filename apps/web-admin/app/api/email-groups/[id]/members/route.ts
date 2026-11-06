import { calendarApi } from "../../../../../lib/server/calendar-api";
import { addGroupEmails } from "../../../../../lib/server/calendar";
export const runtime = "nodejs";
export const POST = (r: Request, c: { params: Promise<{ id: string }> }) =>
  calendarApi(
    r,
    async (db, a, input) => addGroupEmails(db, a, (await c.params).id, input),
    true,
  );
