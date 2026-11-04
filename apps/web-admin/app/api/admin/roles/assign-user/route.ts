import { withActor } from "../../../../../lib/server/session";
import { assignUserRole } from "../../../../../lib/server/roles";
import {
  assertOrigin,
  body,
  failure,
  json,
} from "../../../../../lib/server/http";
export const runtime = "nodejs";
export async function PUT(request: Request) {
  try {
    assertOrigin(request);
    const input = await body(request);
    return await withActor(
      request,
      async (db, actor) => json(await assignUserRole(db, actor, input)),
      true,
    );
  } catch (error) {
    return failure(error);
  }
}
