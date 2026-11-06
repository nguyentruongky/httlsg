import { calendarApi } from "../../../lib/server/calendar-api";
import { listEmailGroups, saveEmailGroup } from "../../../lib/server/calendar";
export const runtime = "nodejs";
export const GET = (r: Request) => calendarApi(r, listEmailGroups);
export const POST = (r: Request) => calendarApi(r, saveEmailGroup, true);
