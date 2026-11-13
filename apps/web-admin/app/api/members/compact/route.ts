import { withActor } from "../../../../lib/server/session";
import { listMembersCompact } from "../../../../lib/server/members-compact";
import { failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const raw = new URL(request.url).searchParams.get("query");
    let input: unknown = {};
    try {
      input = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error("Bộ lọc không hợp lệ.");
    }
    return await withActor(request, async (db, actor) =>
      json(
        await listMembersCompact(
          db,
          actor,
          input,
          new URL(request.url).searchParams.get("summary") !== "0",
        ),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
