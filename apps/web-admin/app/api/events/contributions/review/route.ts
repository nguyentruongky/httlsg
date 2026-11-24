import { calendarApi } from "../../../../../lib/server/calendar-api";
import { reviewCalendarContribution } from "../../../../../lib/server/calendar";
import { deferCalendarPush } from "../../../../../lib/server/calendar-immediate-mail";
export const runtime = "nodejs";
export const POST = (r: Request) =>
  calendarApi(r, reviewCalendarContribution, true, deferCalendarPush);
