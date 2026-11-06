import { sortDepartments } from "@org/core";
import { withActor } from "../../../lib/server/session";
import { failure, json } from "../../../lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return await withActor(request, async (db) =>
      json({
        departments: sortDepartments(
          (
            await db.query(
              "SELECT id,name FROM church.departments ORDER BY name",
            )
          ).rows,
        ),
      }),
    );
  } catch (error) {
    return failure(error);
  }
}
