import { withActor } from "../../../../lib/server/session";
import { listMembers } from "../../../../lib/server/members";
import { failure, json, HttpError } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const raw = new URL(request.url).searchParams.get("query");
    let input: unknown = {};
    try {
      input = raw ? JSON.parse(raw) : {};
    } catch {
      throw new HttpError(400, "Bộ lọc không hợp lệ.");
    }
    return await withActor(request, async (db, actor) =>
      json(await listMembers(db, actor, input, false, "board")),
    );
  } catch (error) {
    return failure(error);
  }
}
