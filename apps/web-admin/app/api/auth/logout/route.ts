import {
  revokeSession,
  requestToken,
  cookieName,
  cookieOptions,
} from "../../../../lib/server/session";
import { assertOrigin, failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    await revokeSession(requestToken(request));
    const response = json({ ok: true });
    response.cookies.set(cookieName(), "", { ...cookieOptions(), maxAge: 0 });
    return response;
  } catch (error) {
    return failure(error);
  }
}
