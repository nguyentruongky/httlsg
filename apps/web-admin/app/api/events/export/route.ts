import { calendarApi } from "../../../../lib/server/calendar-api";
import { exportCalendarPreview } from "../../../../lib/server/calendar-export";
export const runtime = "nodejs";
export const GET = (r: Request) => calendarApi(r, exportCalendarPreview);
