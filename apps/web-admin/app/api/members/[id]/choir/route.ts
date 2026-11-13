import { withActor } from "../../../../../lib/server/session";
import { setManualChoirMembership } from "../../../../../lib/server/choir-memberships";
import {
  assertOrigin,
  body,
  failure,
  json,
} from "../../../../../lib/server/http";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertOrigin(request);
    const { id } = await context.params;
    const input = await body(request);
    return await withActor(
      request,
      async (db, actor) =>
        json(await setManualChoirMembership(db, actor, id, input)),
      true,
    );
  } catch (error) {
    return failure(error);
  }
}
