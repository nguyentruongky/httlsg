import { z } from "zod";
import { canCalendar } from "@org/core";
import { withActor } from "../../../../../lib/server/session";
import { HttpError, failure, json } from "../../../../../lib/server/http";
import { SELECTED_EVENT_MEMBER } from "../../../../../lib/server/push-delivery";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    return await withActor(request, async (db, actor) => {
      const id = z.uuid().parse((await context.params).id);
      const row = (
        await db.query(
          `SELECT e.id,e.event_date AS "eventDate",e.title,e.original_text AS "originalText" FROM church.events e JOIN church.users u ON u.id=$2 WHERE e.id=$1 AND e.deleted_at IS NULL AND ($3::boolean OR ${SELECTED_EVENT_MEMBER})`,
          [id, actor.id, canCalendar(actor)],
        )
      ).rows[0];
      if (!row)
        throw new HttpError(
          404,
          "Chương trình không còn khả dụng hoặc bạn không thuộc nhóm nhận thông báo.",
        );
      return json(row);
    });
  } catch (error) {
    return failure(error);
  }
}
