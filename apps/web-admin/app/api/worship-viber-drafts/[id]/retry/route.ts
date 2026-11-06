import { calendarApi } from "../../../../../lib/server/calendar-api";
import {
  prepareWorshipViberRetry,
  sendWorshipViberRetry,
} from "../../../../../lib/server/worship-information";
export const runtime = "nodejs";
export const POST = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) =>
  calendarApi(
    request,
    async (db, actor, input) =>
      prepareWorshipViberRetry(db, actor, (await context.params).id, input),
    true,
    sendWorshipViberRetry,
  );
