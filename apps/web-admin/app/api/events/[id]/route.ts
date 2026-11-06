import { sendSavedCalendarEvent } from "../../../../lib/server/calendar-immediate-mail";
import { calendarApi } from "../../../../lib/server/calendar-api";
import {
  calendarEvent,
  saveCalendarEvent,
  deleteCalendarEvent,
} from "../../../../lib/server/calendar";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export const GET = (r: Request, c: Context) =>
  calendarApi(r, async (db, a) => calendarEvent(db, a, (await c.params).id));
export const PATCH = (r: Request, c: Context) =>
  calendarApi(
    r,
    async (db, a, input) =>
      saveCalendarEvent(db, a, input, (await c.params).id),
    true,
    sendSavedCalendarEvent,
  );
export const DELETE = (r: Request, c: Context) =>
  calendarApi(
    r,
    async (db, a, input) =>
      deleteCalendarEvent(db, a, (await c.params).id, input),
    true,
  );
