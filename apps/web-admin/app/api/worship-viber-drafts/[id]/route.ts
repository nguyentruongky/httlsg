import { calendarApi } from "../../../../lib/server/calendar-api";
import { savedWorshipViberDraft } from "../../../../lib/server/worship-information";
export const runtime = "nodejs";
export const GET = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) =>
  calendarApi(request, async (db, actor) =>
    savedWorshipViberDraft(
      db,
      actor,
      (await context.params).id,
      new URL(request.url).searchParams.get("latest") === "1",
    ),
  );
