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
    const row = (
      await pool().query(
        "SELECT password_hash IS NOT NULL has_password,enabled,deleted_at FROM church.users WHERE email=$1 OR phone=$1",
        [identifier],
      )
    ).rows[0];
    // Pending OTP-only accounts resume onboarding. A locked account never becomes a new signup.
    return json({
      next:
        row && (row.has_password || !row.enabled || row.deleted_at)
          ? "password"
          : "otp",
    });
  } catch (error) {
    return failure(error);
  }
}
