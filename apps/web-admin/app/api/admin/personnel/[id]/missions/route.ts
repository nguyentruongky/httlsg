import { withActor } from "../../../../../../lib/server/session";
import {
  getPersonnelMissions,
  savePersonnelMissions,
} from "../../../../../../lib/server/personnel-missions";
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
    const { id } = await context.params;
    return await withActor(request, async (db, actor) =>
      json(await getPersonnelMissions(db, actor, id)),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: Request, context: Context) {
  try {
    assertOrigin(request);
    const { id } = await context.params;
    const input = await body(request);
    return await withActor(
      request,
      async (db, actor) =>
        json(await savePersonnelMissions(db, actor, id, input)),
      true,
    );
  } catch (error) {
    return failure(error);
  }
}
