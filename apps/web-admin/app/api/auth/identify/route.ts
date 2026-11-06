import { findAccountIdentity } from "../../../../lib/server/account-lookup";
import { requestPhoneSignIn } from "../../../../lib/server/phone-sign-in";
import { z } from "zod";
import { IdentifierSchema } from "@org/core";
import { pool } from "../../../../lib/server/db";
import { rateLimit } from "../../../../lib/server/limits";
import { assertOrigin, body, failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const { identifier } = z
      .object({ identifier: IdentifierSchema })
      .strict()
      .parse(await body(request));
    await rateLimit(`identify:${identifier}`, 10);
    if (identifier.startsWith("+")) {
      const message = await requestPhoneSignIn(identifier);
      return json({ next: "otp", ...(message ? { message } : {}) });
    }
    const identity = await findAccountIdentity(pool(), identifier);
    const row = identity?.account;
    // Pending OTP-only accounts resume onboarding. A locked account never becomes a new signup.
    return json({
      next:
        row && (row.password_hash || !row.enabled || row.deleted_at)
          ? "password"
          : "otp",
    });
  } catch (error) {
    return failure(error);
  }
}
