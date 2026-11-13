import { measureRequest } from "../../../../lib/server/performance";
import { verifyOtp } from "../../../../lib/server/otp";
import { browserSession } from "../../../../lib/server/persistent-session";
import { assertOrigin, body, failure } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return measureRequest(request, async () => {
    try {
      assertOrigin(request);
      const { user, token } = await verifyOtp(await body(request));
      return await browserSession(user, token, request);
    } catch (error) {
      return failure(error);
    }
  });
}
