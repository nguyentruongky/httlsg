import { calendarApi } from "../../../../lib/server/calendar-api";
import {
  emailGroup,
  saveEmailGroup,
  deleteEmailGroup,
} from "../../../../lib/server/calendar";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export const GET = (r: Request, c: Context) =>
  calendarApi(r, async (db, a) => emailGroup(db, a, (await c.params).id));
export const PATCH = (r: Request, c: Context) =>
  calendarApi(
    r,
    async (db, a, input) => saveEmailGroup(db, a, input, (await c.params).id),
    true,
  );
export const DELETE = (r: Request, c: Context) =>
  calendarApi(
    r,
    async (db, a, input) => deleteEmailGroup(db, a, (await c.params).id, input),
    true,
  );
