import { browserSession } from "../../../../lib/server/persistent-session";
import { withActor } from "../../../../lib/server/session";
import { setPassword } from "../../../../lib/server/password-setup";
import { assertOrigin, body, failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const input = await body(request);
    return await withActor(
      request,
      async (db, actor) => {
        const { user, token } = await setPassword(db, actor, input);
        return browserSession(user, token, request, db);
      },
      true,
      true,
    );
  } catch (error) {
    return failure(error);
  }
}
