import { pool } from "../../../../lib/server/db";
import { failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    return json({
      departments: (
        await pool().query(
          "SELECT id,name FROM church.departments ORDER BY name",
        )
      ).rows,
    });
  } catch (error) {
    return failure(error);
  }
}
