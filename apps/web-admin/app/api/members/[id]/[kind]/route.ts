import { withActor } from "../../../../../lib/server/session";
import { addHistory } from "../../../../../lib/server/members";
import {
  assertOrigin,
  body,
  failure,
  json,
  HttpError,
} from "../../../../../lib/server/http";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; kind: string }> },
) {
  try {
    assertOrigin(request);
    const { id, kind } = await context.params;
    if (kind !== "notes" && kind !== "visits")
      throw new HttpError(404, "Không tìm thấy trang.");
    const input = await body(request);
    return await withActor(
      request,
      async (db, actor) =>
        json(await addHistory(db, actor, id, kind, input), 201),
      true,
    );
  } catch (error) {
    return failure(error);
  }
}
