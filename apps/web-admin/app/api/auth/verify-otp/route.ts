import { verifyOtp } from "../../../../lib/server/otp";
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
    const { user, token } = await verifyOtp(await body(request));
    const response = json({
      user,
      requires_password_setup: user.requiresPasswordSetup,
      redirectTo: user.requiresPasswordSetup ? "/set-password" : "/client",
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
