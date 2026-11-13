import { withActor } from "../../../../../lib/server/session";
import { getMember } from "../../../../../lib/server/members";
import { failure, json } from "../../../../../lib/server/http";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return await withActor(request, async (db, actor) => {
      const member = await getMember(db, actor, id);
      return json({
        notes: member.notes,
        visitHistory: member.visitHistory,
        lastVisitDate: member.lastVisitDate,
      });
    });
  } catch (error) {
    return failure(error);
  }
}
