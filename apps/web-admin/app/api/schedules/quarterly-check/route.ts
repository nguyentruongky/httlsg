import { scheduleApi } from "../../../../lib/server/schedule-api";
import { previewQuarterlyCheck } from "../../../../lib/server/quarterly-work";
export const runtime = "nodejs";
export const POST = (request: Request) =>
  scheduleApi(request, previewQuarterlyCheck, true);
