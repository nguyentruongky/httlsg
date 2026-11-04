import { withActor } from "../../../../lib/server/session";
import { createAccount } from "../../../../lib/server/admin";
import { assertOrigin, body, failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const input = await body(request);
    return await withActor(
      request,
      async (db, actor) => json(await createAccount(db, actor, input), 201),
      true,
    );
  } catch (error) {
    return failure(error);
  }
}
