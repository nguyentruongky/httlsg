import { withActor } from "../../../../lib/server/session";
import { failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return await withActor(
      request,
      async (_db, user) => json({ user }),
      false,
      true,
    );
  } catch (error) {
    return failure(error);
  }
}
