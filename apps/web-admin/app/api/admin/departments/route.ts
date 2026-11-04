import { withActor, requirePermission } from "../../../../lib/server/session";
import { manageDepartment } from "../../../../lib/server/admin";
import { assertOrigin, body, failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return await withActor(request, async (db, actor) => {
      requirePermission(actor, "departments.manage");
      return json({
        departments: (
          await db.query("SELECT id,name FROM church.departments ORDER BY name")
        ).rows,
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
