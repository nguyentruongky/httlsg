import { scheduleApi } from "../../../lib/server/schedule-api";
import { listSchedules, saveSchedule } from "../../../lib/server/schedules";
export const runtime = "nodejs";
export const GET = (request: Request) => scheduleApi(request, listSchedules);
export const POST = (request: Request) =>
  scheduleApi(request, saveSchedule, true);
