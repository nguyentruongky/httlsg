import { calendarApi } from "../../../../lib/server/calendar-api";
import { mentionSuggestions } from "../../../../lib/server/calendar";
export const runtime = "nodejs";
export const GET = (request: Request) =>
  calendarApi(request, mentionSuggestions);
