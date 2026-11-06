import { withActor } from "../../../../../lib/server/session";
import {
  queueCalendarExportEmail,
  sendCalendarExportEmail,
} from "../../../../../lib/server/calendar-export-email";
import {
  assertOrigin,
  body,
  failure,
  json,
} from "../../../../../lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const input = await body(request, 2100000);
    const queued = await withActor(
      request,
      (db, actor) => queueCalendarExportEmail(db, actor, input),
      true,
    );
    return json(await sendCalendarExportEmail(queued));
  } catch (error) {
    return failure(error);
  }
}
