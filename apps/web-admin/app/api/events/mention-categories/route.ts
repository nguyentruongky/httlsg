import { calendarApi } from "../../../../lib/server/calendar-api";
import { mentionCategories } from "../../../../lib/server/calendar";
export const runtime = "nodejs";
export const GET = (request: Request) =>
  calendarApi(request, mentionCategories);
