import { calendarApi } from "../../../lib/server/calendar-api";
import { allNotificationHistory } from "../../../lib/server/calendar";
export const runtime = "nodejs";
export const GET = (r: Request) => calendarApi(r, allNotificationHistory);
