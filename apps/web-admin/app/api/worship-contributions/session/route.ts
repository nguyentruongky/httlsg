import { calendarApi } from "../../../../lib/server/calendar-api";
import { saveWorshipReviewSession } from "../../../../lib/server/worship-contributions";
import { sendSavedCalendarEvent } from "../../../../lib/server/calendar-immediate-mail";
export const runtime = "nodejs";
export const POST = (request: Request) =>
  calendarApi(request, saveWorshipReviewSession, true, async (result) => {
    for (const event of result.events) await sendSavedCalendarEvent(event);
    return { saved: true };
  });
