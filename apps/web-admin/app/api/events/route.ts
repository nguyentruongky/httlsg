import { sendSavedCalendarEvent } from "../../../lib/server/calendar-immediate-mail";
import { calendarApi } from "../../../lib/server/calendar-api";
import {
  listCalendarEvents,
  saveCalendarEvent,
} from "../../../lib/server/calendar";
export const runtime = "nodejs";
export const GET = (r: Request) => calendarApi(r, listCalendarEvents);
export const POST = (r: Request) =>
  calendarApi(r, saveCalendarEvent, true, sendSavedCalendarEvent);
