import { withActor } from "../../../../lib/server/session";
import { readScope } from "../../../../lib/server/members";
import { failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return await withActor(request, async (db, actor) =>
      json(
        (
          await db.query(
            `SELECT u.id,u.full_name name FROM church.member_profiles u WHERE u.deleted_at IS NULL AND NOT u.is_test_account AND ${readScope()} ORDER BY u.full_name,u.id`,
            [actor.id, actor.role],
          )
        ).rows,
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
