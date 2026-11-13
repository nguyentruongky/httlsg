import { withActor, requirePermission } from "../../../../lib/server/session";
import { failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return await withActor(request, async (db, actor) => {
      requirePermission(actor, "dashboard");
      const { searchParams } = new URL(request.url);
      const month = searchParams.get("month"); // YYYY-MM
      const values: unknown[] = [];
      let conditions = "1=1";
      if (month) {
        const [y, m] = month.split("-").map(Number);
        conditions = `DATE_TRUNC('month', changed_at) = ${`$${values.push(Date.UTC(y, m - 1, 1))}`}`;
        values.push(new Date(Date.UTC(y, m - 1, 1)));
      }
      const { rows } = await db.query(
        `SELECT h.id, h.member_id, h.previous_status, h.new_status, h.destination, h.changed_at, h.changed_by,
                u.full_name AS member_name
         FROM church.member_church_status_history h
         JOIN church.users u ON u.id = h.member_id
         WHERE ${conditions}
         ORDER BY h.changed_at DESC, h.id DESC
         LIMIT 200`,
        values,
      );
      return json({
        items: rows.map((r: any) => ({
          id: r.id,
          memberId: r.member_id,
          memberName: r.full_name,
          previousStatus: r.previous_status,
          newStatus: r.new_status,
          destination: r.destination ?? null,
          changedAt: new Date(r.changed_at).toISOString(),
          changedById: r.changed_by,
        })),
      });
    });
  } catch (error) {
    return failure(error);
  }
}
