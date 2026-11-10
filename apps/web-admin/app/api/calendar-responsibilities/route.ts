import { calendarApi } from "../../../lib/server/calendar-api";
import { calendarResponsibilities } from "../../../lib/server/calendar-responsibilities";

export const runtime = "nodejs";
export const GET = (request: Request) =>
  calendarApi(request, calendarResponsibilities);
