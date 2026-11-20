import { transaction } from "../../../../lib/server/db";
import { assertOrigin, body, failure, json } from "../../../../lib/server/http";
import { calendarApi } from "../../../../lib/server/calendar-api";
import {
  listCalendarContributions,
} from "../../../../lib/server/calendar";
import { submitEventWorshipContribution } from "../../../../lib/server/worship-contributions";
export const runtime = "nodejs";
export const GET = (r: Request) => calendarApi(r, listCalendarContributions);
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const input = await body(request, 200000);
    return json(await transaction((db) => submitEventWorshipContribution(db, input)));
  } catch (error) {
    return failure(error);
  }
}
