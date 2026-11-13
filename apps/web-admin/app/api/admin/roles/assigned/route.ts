import { withActor } from "../../../../../lib/server/session";
import { listAssignedRoles } from "../../../../../lib/server/roles";
import { failure, json } from "../../../../../lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return await withActor(request, async (db, actor) =>
      json(
        await listAssignedRoles(
          db,
          actor,
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
