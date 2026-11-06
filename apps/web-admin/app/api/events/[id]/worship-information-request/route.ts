import { calendarApi } from "../../../../../lib/server/calendar-api";
import {
  prepareWorshipInformationRequest,
  sendWorshipInformationRequest,
  worshipInformationPreview,
} from "../../../../../lib/server/worship-information";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export const GET = (request: Request, context: Context) =>
  calendarApi(request, async (db, actor) =>
    worshipInformationPreview(db, actor, (await context.params).id),
  );
export const POST = (request: Request, context: Context) =>
  calendarApi(
    request,
    async (db, actor, input) =>
      prepareWorshipInformationRequest(
        db,
        actor,
        (await context.params).id,
        input,
      ),
    true,
    sendWorshipInformationRequest,
  );
