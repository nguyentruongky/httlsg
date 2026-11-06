import { withActor } from "../../../../lib/server/session";
import { listAdminOtps } from "../../../../lib/server/admin-otps";
import { failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const input = Object.fromEntries(new URL(request.url).searchParams);
    return await withActor(request, async (db, actor) =>
      json(await listAdminOtps(db, actor, input)),
    );
  } catch (error) {
    return failure(error);
  }
}
