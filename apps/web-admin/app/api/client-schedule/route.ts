import { calendarApi } from "../../../lib/server/calendar-api";
import { clientSchedule } from "../../../lib/server/client-schedule";

export const runtime = "nodejs";
export const GET = (request: Request) => calendarApi(request, clientSchedule);
