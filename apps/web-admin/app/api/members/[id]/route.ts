import { withActor } from "../../../../lib/server/session";
import {
  getMember,
  updateMember,
  deleteMember,
} from "../../../../lib/server/members";
import { assertOrigin, body, failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return await withActor(request, async (db, actor) =>
      json(await getMember(db, actor, id)),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    assertOrigin(request);
    const { id } = await context.params;
    const input = await body(request);
    return await withActor(
      request,
      async (db, actor) => json(await updateMember(db, actor, id, input)),
      true,
    );
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    assertOrigin(request);
    const { id } = await context.params;
    return await withActor(
      request,
      async (db, actor) => json(await deleteMember(db, actor, id)),
      true,
    );
  } catch (error) {
    return failure(error);
  }
}
