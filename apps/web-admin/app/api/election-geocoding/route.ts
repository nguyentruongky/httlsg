import { calendarApi } from "../../../lib/server/calendar-api";
import { electionGeocoding } from "../../../lib/server/election-geocoding";
export const runtime = "nodejs";
export const GET = (request: Request) =>
  calendarApi(request, electionGeocoding);
