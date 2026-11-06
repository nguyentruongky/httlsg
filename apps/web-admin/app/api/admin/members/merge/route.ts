import { withActor } from "../../../../../lib/server/session";
import { mergeMembers } from "../../../../../lib/server/merge-members";
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
    const input = await body(request);
    return await withActor(
      request,
      async (db, actor) => json(await mergeMembers(db, actor, input)),
      true,
    );
  } catch (error) {
    return failure(error);
  }
}
