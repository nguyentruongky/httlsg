import { requestEmailOtp } from "../../../../lib/server/otp";
import { assertOrigin, body, failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    return json(await requestEmailOtp(await body(request)), 202);
  } catch (error) {
    return failure(error);
  }
}
