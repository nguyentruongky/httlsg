import { after } from "next/server";
import { calendarApi } from "../../../lib/server/calendar-api";
import {
  listWorshipContributions,
  reviewWorshipContribution,
} from "../../../lib/server/worship-contributions";
import { sendSavedCalendarEvent } from "../../../lib/server/calendar-immediate-mail";
export const runtime = "nodejs";
export const GET = (request: Request) =>
  calendarApi(request, listWorshipContributions);
export const POST = (request: Request) =>
  calendarApi(request, reviewWorshipContribution, true, async (result) => {
    const event = result.event;
    if (event)
      after(async () => {
        await sendSavedCalendarEvent(event);
      });
    return { saved: true };
  });
