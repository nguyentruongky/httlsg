import { currentMemberScope } from "../../../../lib/server/member-visibility";
import { departments } from "@org/core";
import { withActor, requirePermission } from "../../../../lib/server/session";
import { manageDepartment } from "../../../../lib/server/admin";
import { assertOrigin, body, failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return await withActor(request, async (db, actor) => {
      requirePermission(actor, "departments.manage");
      const rows = (
        await db.query(
          `SELECT dm.department_id,count(*)::int AS count FROM church.department_members dm JOIN church.member_profiles p ON p.id=dm.user_id WHERE p.deleted_at IS NULL AND NOT p.is_test_account AND ${currentMemberScope("p")} GROUP BY dm.department_id`,
        )
      ).rows;
      const counts: Record<string, number> = Object.fromEntries(
        rows.map((row) => [row.department_id, row.count]),
      );
      if (new URL(request.url).searchParams.get("view") === "counts")
        return json({ counts });
      return json({
        departments: departments.map((item) => ({
          ...item,
          memberCount: counts[item.id] ?? 0,
        })),
        managers: (
          await db.query(
            'SELECT user_id "userId",department_id "departmentId" FROM church.department_managers ORDER BY user_id,department_id',
          )
        ).rows,
      });
    });
  } catch (error) {
    return failure(error);
  }
}
async function mutate(request: Request) {
  try {
    assertOrigin(request);
    const input = await body(request);
    return await withActor(
      request,
      async (db, actor) =>
        json(await manageDepartment(db, actor, input, request.method)),
      true,
    );
  } catch (error) {
    return failure(error);
  }
}
export const POST = mutate;
export const PATCH = mutate;
export const DELETE = mutate;
