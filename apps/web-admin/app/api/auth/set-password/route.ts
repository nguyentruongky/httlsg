import {
  withActor,
  cookieName,
  cookieOptions,
} from "../../../../lib/server/session";
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
        const response = json({
          user,
          requires_password_setup: false,
          redirectTo: "/client",
        });
        response.cookies.set(cookieName(), token, cookieOptions());
        return response;
      },
      true,
      true,
    );
  } catch (error) {
    return failure(error);
  }
}
