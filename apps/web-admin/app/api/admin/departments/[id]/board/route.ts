import { withActor } from "../../../../../../lib/server/session";
import {
  listDepartmentBoard,
  saveDepartmentBoard,
  changeDepartmentBoardMember,
} from "../../../../../../lib/server/department-board";
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
      json(await listDepartmentBoard(db, actor, (await context.params).id)),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: Request, context: Context) {
  try {
    assertOrigin(request);
    const input = await body(request);
    return await withActor(
      request,
      async (db, actor) =>
        json(
          await saveDepartmentBoard(
            db,
            actor,
            (await context.params).id,
            input,
          ),
        ),
      true,
    );
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    assertOrigin(request);
    const input = await body(request);
    return await withActor(
      request,
      async (db, actor) =>
        json(
          await changeDepartmentBoardMember(
            db,
            actor,
            (await context.params).id,
            input,
          ),
        ),
      true,
    );
  } catch (error) {
    return failure(error);
  }
}
