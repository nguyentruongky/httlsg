import { withActor } from "../../../../../../lib/server/session";
import {
  listDepartmentMembers,
  changeDepartmentMember,
  changeDepartmentMembers,
} from "../../../../../../lib/server/department-members";
import {
  assertOrigin,
  body,
  failure,
  json,
} from "../../../../../../lib/server/http";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    return await withActor(request, async (db, actor) =>
      json(
        await listDepartmentMembers(
          db,
          actor,
          (await context.params).id,
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
async function mutate(request: Request, context: Context) {
  try {
    assertOrigin(request);
    const input = await body(request);
    return await withActor(
      request,
      async (db, actor) =>
        json(
          request.method === "PATCH"
            ? await changeDepartmentMembers(
                db,
                actor,
                (await context.params).id,
                input,
              )
            : await changeDepartmentMember(
                db,
                actor,
                (await context.params).id,
                input,
                request.method === "POST",
              ),
        ),
      true,
    );
  } catch (error) {
    return failure(error);
  }
}
export const POST = mutate;
export const DELETE = mutate;

export const PATCH = mutate;
