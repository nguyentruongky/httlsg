import { calendarApi } from "../../../../../lib/server/calendar-api";
import { reviewCalendarContribution } from "../../../../../lib/server/calendar";
export const runtime = "nodejs";
export const POST = (r: Request) =>
  calendarApi(r, reviewCalendarContribution, true);
