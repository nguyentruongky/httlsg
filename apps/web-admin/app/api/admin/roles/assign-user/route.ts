import { withActor } from "../../../../../lib/server/session";
import {
  assignUserRole,
  listAssignedRoles,
} from "../../../../../lib/server/roles";
import { getMember } from "../../../../../lib/server/members";
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
      async (db, actor) => {
        const result = await assignUserRole(db, actor, input);
        const id = (input as { user_id: string }).user_id;
        return json({
          ...result,
          member: await getMember(db, actor, id, false, false),
          personnel:
            (await listAssignedRoles(db, actor, {}, id)).items[0] ?? null,
        });
      },
      true,
    );
  } catch (error) {
    return failure(error);
  }
}
