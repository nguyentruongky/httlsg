import { withActor } from "../../../../../lib/server/session";
import { searchMembers } from "../../../../../lib/server/roles";
import { failure, json } from "../../../../../lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const q = params.get("q") ?? "";
    const page = params.get("page") ?? undefined;
    const pageSize = params.get("pageSize") ?? undefined;
    return await withActor(request, async (db, actor) =>
      json(await searchMembers(db, actor, { q, page, pageSize })),
    );
  } catch (error) {
    return failure(error);
  }
}
