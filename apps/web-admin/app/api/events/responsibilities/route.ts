import { calendarApi } from "../../../../lib/server/calendar-api";
import { previewEventResponsibilities } from "../../../../lib/server/event-responsibility";
export const runtime = "nodejs";
export const POST = (request: Request) =>
  calendarApi(request, previewEventResponsibilities, "read-body");
