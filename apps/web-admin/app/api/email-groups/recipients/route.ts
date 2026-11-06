import { calendarApi } from "../../../../lib/server/calendar-api";
import { recipientPreview } from "../../../../lib/server/calendar";
export const runtime = "nodejs";
export const POST = (r: Request) => calendarApi(r, recipientPreview, true);
