import { scheduleApi } from "../../../lib/server/schedule-api";
import { searchScheduleMembers } from "../../../lib/server/schedules";
export const runtime = "nodejs";
export const GET = (request: Request) =>
  scheduleApi(request, searchScheduleMembers);
