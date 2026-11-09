import { scheduleApi } from "../../../lib/server/schedule-api";
import { scheduleLeaders } from "../../../lib/server/schedules";
export const runtime = "nodejs";
export const GET = (request: Request) => scheduleApi(request, scheduleLeaders);
import { grantScheduleLeader } from "../../../lib/server/schedules";
export const PATCH = (request: Request) =>
  scheduleApi(request, grantScheduleLeader, true);
