import { withActor } from "../../../../lib/server/session";
import { getMember } from "../../../../lib/server/members";
import { failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return await withActor(request, async (db, actor) =>
      json(await getMember(db, actor, actor.id)),
    );
  } catch (error) {
    return failure(error);
  }
}
