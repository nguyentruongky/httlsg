import { login } from "../../../../lib/server/auth-service";
import {
  cookieName,
  cookieOptions,
  SETUP_SESSION_SECONDS,
} from "../../../../lib/server/session";
import { assertOrigin, body, failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const { user, token } = await login(await body(request));
    const response = json({
      user,
      redirectTo: user.requiresPasswordSetup ? "/set-password" : "/client",
      requires_password_setup: user.requiresPasswordSetup,
    });
    response.cookies.set(
      cookieName(),
      token,
      cookieOptions(
        user.requiresPasswordSetup ? SETUP_SESSION_SECONDS : undefined,
      ),
    );
    return response;
  } catch (error) {
    return failure(error);
  }
}
