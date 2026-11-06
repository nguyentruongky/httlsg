import { createHmac, randomInt, randomUUID } from "node:crypto";
import { CompactEncrypt } from "jose";
import { otpSecret as secret } from "./otp-secret";
import type { DB } from "./db";
export function otpDigest(id: string, userId: string, code: string) {
  return createHmac("sha256", secret("otp-verification"))
    .update(`${id}:${userId}:${code}`)
    .digest("hex");
}
export async function issueOtp(
  db: DB,
  userId: string,
  type: "EMAIL" | "PHONE_LEADER",
  departmentId: string | null,
  identifier?: string,
) {
  const requested =
    identifier ??
    (
      await db.query(
        "SELECT CASE WHEN $2='EMAIL' THEN email ELSE phone END identifier FROM church.users WHERE id=$1",
        [userId, type],
      )
    ).rows[0]?.identifier;
  const id = randomUUID(),
    code = String(randomInt(0, 1000000)).padStart(6, "0");
  const ciphertext =
    type === "PHONE_LEADER"
      ? await new CompactEncrypt(new TextEncoder().encode(code))
          .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
          .encrypt(secret("leader-otp-display"))
      : null;
  await db.query(
    "UPDATE church.otps SET is_used=true,used_at=now() WHERE user_id=$1 AND type=$2 AND NOT is_used",
    [userId, type],
  );
  await db.query(
    `INSERT INTO church.otps(id,user_id,otp_code,otp_ciphertext,type,department_id,identifier,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,now(),now()+CASE WHEN $5='EMAIL' THEN interval '10 minutes' ELSE interval '24 hours' END)`,
    [
      id,
      userId,
      otpDigest(id, userId, code),
      ciphertext,
      type,
      departmentId,
      requested,
    ],
  );
  return code;
}
