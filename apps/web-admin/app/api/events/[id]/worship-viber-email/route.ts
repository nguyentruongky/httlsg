import { calendarApi } from "../../../../../lib/server/calendar-api";
import {
  prepareWorshipInformationRequest,
  sendWorshipInformationRequest,
} from "../../../../../lib/server/worship-information";
export const runtime = "nodejs";
export const POST = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) =>
  calendarApi(
    request,
    async (db, actor, input) =>
      prepareWorshipInformationRequest(
        db,
        actor,
        (await context.params).id,
        input,
        "worship_viber_draft",
      ),
    true,
    sendWorshipInformationRequest,
  );
