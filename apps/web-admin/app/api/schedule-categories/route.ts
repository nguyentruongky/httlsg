import { scheduleApi } from "../../../lib/server/schedule-api";
import { scheduleCategories } from "../../../lib/server/schedules";
export const runtime = "nodejs";
export const GET = (request: Request) =>
  scheduleApi(request, scheduleCategories);
import { configureScheduleCategory } from "../../../lib/server/schedules";
export const PATCH = (request: Request) =>
  scheduleApi(request, configureScheduleCategory, true);
