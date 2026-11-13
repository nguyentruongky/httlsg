import { withActor } from "../../../../../lib/server/session";
import { failure, json } from "../../../../../lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return await withActor(request, async (db, _actor) => {
      const logs = await db.query(
        "SELECT id,actor_id,subject_id,action,created_at FROM church.audit_log ORDER BY created_at DESC,id LIMIT 200",
      );
      return json({
        items: logs.rows.map((r) => ({
          id: r.id,
          organizationId: "10000000-0000-4000-8000-000000000001",
          actorId: r.actor_id ?? "",
          subjectId: r.subject_id ?? "",
          action: r.action,
          createdAt: new Date(r.created_at).toISOString(),
        })),
      });
    });
  } catch (error) {
    return failure(error);
  }
}
