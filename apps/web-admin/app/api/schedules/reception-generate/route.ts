import { scheduleApi } from "../../../../lib/server/schedule-api";
import { previewReceptionMonth } from "../../../../lib/server/reception";
export const runtime = "nodejs";
export const POST = (request: Request) =>
  scheduleApi(request, previewReceptionMonth, true);
