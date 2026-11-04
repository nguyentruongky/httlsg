import { withActor, requirePermission } from "../../../../lib/server/session";
import { listMembers, DIRECTORY_ID } from "../../../../lib/server/members";
import { failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return await withActor(request, async (db, actor) => {
      requirePermission(actor, "dashboard");
      const members = await listMembers(db, actor, {}, true);
      const logs = await db.query(
        "SELECT id,actor_id,subject_id,action,created_at FROM church.audit_log ORDER BY created_at DESC,id LIMIT 200",
      );
      return json({
        members: members.items,
        tasks: [],
        activity: logs.rows.map((r) => ({
          id: r.id,
          organizationId: DIRECTORY_ID,
          actorId: r.actor_id ?? actor.id,
          subjectId: r.subject_id ?? actor.id,
          action: r.action,
          createdAt: new Date(r.created_at).toISOString(),
        })),
      });
    });
  } catch (error) {
    return failure(error);
  }
}
