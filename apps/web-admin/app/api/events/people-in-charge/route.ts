import { calendarApi } from "../../../../lib/server/calendar-api";
import { worshipPeopleInCharge } from "../../../../lib/server/event-responsibility";
export const runtime = "nodejs";
export const GET = (request: Request) =>
  calendarApi(request, worshipPeopleInCharge);
