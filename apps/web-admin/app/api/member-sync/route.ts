import { withActor } from "../../../lib/server/session";
import { assertOrigin, body, failure, json } from "../../../lib/server/http";
import { syncMemberReads } from "../../../lib/server/member-sync";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const input = await body(request, 256000);
    return await withActor(request, async (db, actor) =>
      json(await syncMemberReads(db, actor, input)),
    );
  } catch (error) {
    return failure(error);
  }
}
