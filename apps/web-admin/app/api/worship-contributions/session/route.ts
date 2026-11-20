import { after } from "next/server";
import { calendarApi } from "../../../../lib/server/calendar-api";
import { saveWorshipReviewSession } from "../../../../lib/server/worship-contributions";
import { sendSavedCalendarEvent } from "../../../../lib/server/calendar-immediate-mail";
export const runtime = "nodejs";
export const POST = (request: Request) =>
  calendarApi(request, saveWorshipReviewSession, true, async (result) => {
    if (result.events.length)
      after(async () => {
        await Promise.allSettled(result.events.map(sendSavedCalendarEvent));
      });
    return { saved: true };
  });
