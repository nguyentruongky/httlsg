import {
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { CompactEncrypt, compactDecrypt } from "jose";
import {
  EmailOtpRequestSchema,
  PhoneOtpRequestSchema,
  VerifyOtpSchema,
  type AuthUser,
} from "@org/core";
import { transaction, type DB } from "./db";
import { HttpError } from "./http";
import { rateLimit } from "./limits";
import { actorById, createSession, requirePermission } from "./session";
import { sendOtpEmail, emailDeliveryConfigured } from "./mail";
function secret(label: string) {
  const master = Buffer.from(process.env.OTP_SECRET ?? "", "base64");
  if (master.length !== 32)
    throw new Error("OTP_SECRET must contain 32 random bytes");
  return createHmac("sha256", master).update(label).digest();
}
function digest(id: string, userId: string, code: string) {
  return createHmac("sha256", secret("otp-verification"))
    .update(`${id}:${userId}:${code}`)
    .digest("hex");
}
const instructions = {
  message:
    "Nếu thông tin hợp lệ, yêu cầu đã được ghi nhận. Vui lòng liên hệ trưởng Ban ngành để nhận mã OTP. Mã có hiệu lực trong 24 giờ.",
};
async function issue(
  db: DB,
  userId: string,
  type: "EMAIL" | "PHONE_LEADER",
  departmentId: string | null,
) {
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
    `INSERT INTO church.otps(id,user_id,otp_code,otp_ciphertext,type,department_id,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,now(),now()+CASE WHEN $5='EMAIL' THEN interval '10 minutes' ELSE interval '24 hours' END)`,
    [id, userId, digest(id, userId, code), ciphertext, type, departmentId],
  );
  return code;
}
async function lock(db: DB) {
  await db.query("SELECT pg_advisory_xact_lock(74298331)");
}
export async function requestPhoneOtp(input: unknown) {
  const f = PhoneOtpRequestSchema.parse(input);
  await rateLimit(`otp-request:${f.phone}`, 3);
  return transaction(async (db) => {
    await lock(db);
    const department = await db.query(
      "SELECT id FROM church.departments WHERE id=$1",
      [f.department_id],
    );
    if (!department.rowCount)
      throw new HttpError(400, "Ban ngành không hợp lệ.");
    let account = (
      await db.query("SELECT * FROM church.users WHERE phone=$1 FOR UPDATE", [
        f.phone,
      ])
    ).rows[0];
    if (account) {
      // Anonymous requests cannot reset an established account, rename a member, or move departments.
      // Accounts provisioned by an admin without credentials may still request
      // an OTP that their department leader delivers in person.
      if (
        !account.enabled ||
        account.deleted_at ||
        account.is_password_set ||
        account.department_id !== f.department_id
      )
        return instructions;
    } else {
      const profiles = await db.query(
        `SELECT p.id,p.full_name,p.role_id,p.enabled FROM church.member_profiles p WHERE church.normalize_phone(p.phone)=$1 AND p.deleted_at IS NULL ORDER BY p.id`,
        [f.phone],
      );
      let profile;
      if (profiles.rowCount) {
        const matching = await db.query(
          `SELECT p.id,p.full_name,p.role_id,p.enabled FROM church.member_profiles p WHERE church.normalize_phone(p.phone)=$1 AND p.deleted_at IS NULL AND p.role_id='user' AND p.enabled AND lower(public.unaccent(p.full_name))=lower(public.unaccent($2)) AND EXISTS(SELECT 1 FROM church.department_members dm WHERE dm.user_id=p.id AND dm.department_id=$3)`,
          [f.phone, f.full_name, f.department_id],
        );
        if (matching.rowCount !== 1) return instructions;
        profile = matching.rows[0];
        if (
          (
            await db.query("SELECT id FROM church.users WHERE id=$1", [
              profile.id,
            ])
          ).rowCount
        )
          return instructions;
      } else {
        profile = (
          await db.query(
            "INSERT INTO church.member_profiles(full_name,phone) VALUES($1,$2) RETURNING id,full_name",
            [f.full_name, f.phone],
          )
        ).rows[0];
      }
      account = (
        await db.query(
          "INSERT INTO church.users(id,phone,full_name,department_id) VALUES($1,$2,$3,$4) RETURNING *",
          [profile.id, f.phone, profile.full_name, f.department_id],
        )
      ).rows[0];
    }
    await issue(db, account.id, "PHONE_LEADER", f.department_id);
    return instructions;
  });
}
export async function requestEmailOtp(input: unknown) {
  const f = EmailOtpRequestSchema.parse(input);
  await rateLimit(`otp-request:${f.email}`, 3);
  if (!emailDeliveryConfigured())
    throw new HttpError(
      503,
      "Gửi email chưa được cấu hình. Vui lòng liên hệ quản trị viên.",
    );
  return transaction(async (db) => {
    await lock(db);
    let account = (
      await db.query("SELECT * FROM church.users WHERE email=$1 FOR UPDATE", [
        f.email,
      ])
    ).rows[0];
    const response = {
      message:
        "Nếu email hợp lệ, mã OTP đã được gửi. Vui lòng kiểm tra hộp thư. Mã có hiệu lực trong 10 phút.",
    };
    if (account && (!account.enabled || account.deleted_at)) return response;
    if (!account) {
      // Profile contact fields are editable data, not proof of login ownership.
      // Bind existing profiles only through explicit admin provisioning; public
      // email self-registration gets a separate self-only profile.
      const profile = (
        await db.query(
          "INSERT INTO church.member_profiles(email,full_name) VALUES($1,'Thành viên mới') RETURNING id,full_name",
          [f.email],
        )
      ).rows[0];
      account = (
        await db.query(
          "INSERT INTO church.users(id,email,full_name) VALUES($1,$2,$3) RETURNING *",
          [profile.id, f.email, profile.full_name],
        )
      ).rows[0];
    }
    const code = await issue(db, account.id, "EMAIL", null);
    await sendOtpEmail(f.email, code);
    return response;
  });
}
export async function verifyOtp(input: unknown) {
  const f = VerifyOtpSchema.parse(input);
  await rateLimit(`otp-verify:${f.identifier}`, 10);
  // Invalid attempts must COMMIT so a rollback cannot reset the attempt counter.
  const result = await transaction(async (db) => {
    await lock(db);
    const found = await db.query(
      `SELECT o.*,u.auth_version,u.is_password_set,u.must_reset_password,u.department_id current_department FROM church.otps o JOIN church.users u ON u.id=o.user_id WHERE (u.email=$1 OR u.phone=$1) AND u.enabled AND u.deleted_at IS NULL AND NOT o.is_used AND o.attempts<5 AND o.expires_at>now() AND o.type=CASE WHEN position('@' IN $1)>0 THEN 'EMAIL' ELSE 'PHONE_LEADER' END ORDER BY o.created_at DESC LIMIT 1 FOR UPDATE OF o,u`,
      [f.identifier],
    );
    const otp = found.rows[0];
    if (!otp) return { ok: false as const };
    if (
      otp.type === "PHONE_LEADER" &&
      (otp.is_password_set || otp.department_id !== otp.current_department)
    )
      return { ok: false as const };
    const expected = Buffer.from(otp.otp_code, "hex"),
      received = Buffer.from(digest(otp.id, otp.user_id, f.otp_code), "hex");
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      await db.query(
        "UPDATE church.otps SET attempts=attempts+1,is_used=(attempts+1>=5),used_at=CASE WHEN attempts+1>=5 THEN now() ELSE NULL END WHERE id=$1",
        [otp.id],
      );
      return { ok: false as const };
    }
    await db.query(
      "UPDATE church.otps SET is_used=true,used_at=now() WHERE id=$1",
      [otp.id],
    );
    if (otp.type === "PHONE_LEADER")
      await db.query(
        "INSERT INTO church.department_members(user_id,department_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [otp.user_id, otp.department_id],
      );
    if (!otp.is_password_set) {
      await db.query(
        "UPDATE church.users SET password_hash=NULL,temporary_password_expires_at=NULL,must_reset_password=false,auth_version=auth_version+1 WHERE id=$1",
        [otp.user_id],
      );
      await db.query(
        "UPDATE church.sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
        [otp.user_id],
      );
      await db.query(
        "UPDATE church.otps SET is_used=true,used_at=now() WHERE user_id=$1 AND NOT is_used",
        [otp.user_id],
      );
    }
    const user = await actorById(db, otp.user_id);
    if (!user) return { ok: false as const };
    return { ok: true as const, user, token: await createSession(db, user) };
  });
  if (!result.ok)
    throw new HttpError(401, "Mã OTP không hợp lệ hoặc đã hết hạn.");
  return result;
}
export async function listLeaderOtps(db: DB, actor: AuthUser, page = 1) {
  requirePermission(actor, "leader.otps.read");
  const leaderDepartments = (
    await db.query(
      "SELECT department_id FROM church.department_leaders WHERE user_id=$1 ORDER BY department_id",
      [actor.id],
    )
  ).rows.map((row) => row.department_id as string);
  if (!leaderDepartments.length)
    throw new HttpError(
      403,
      "Chỉ trưởng Ban ngành được xem mã OTP của Ban ngành mình.",
    );
  const where = `u.department_id=ANY($1::text[]) AND o.department_id=ANY($1::text[]) AND o.type='PHONE_LEADER' AND NOT o.is_used AND o.attempts<5 AND o.expires_at>now() AND u.enabled AND u.deleted_at IS NULL AND NOT u.is_password_set`;
  const total = (
    await db.query(
      `SELECT count(*)::int count FROM church.otps o JOIN church.users u ON u.id=o.user_id WHERE ${where}`,
      [leaderDepartments],
    )
  ).rows[0].count;
  const rows = (
    await db.query(
      `SELECT o.id,o.otp_ciphertext,o.expires_at,u.full_name,u.phone,d.name department_name FROM church.otps o JOIN church.users u ON u.id=o.user_id JOIN church.departments d ON d.id=u.department_id WHERE ${where} ORDER BY o.created_at,o.id LIMIT 20 OFFSET $2`,
      [leaderDepartments, (page - 1) * 20],
    )
  ).rows;
  const items = [];
  for (const row of rows) {
    const decrypted = await compactDecrypt(
      row.otp_ciphertext,
      secret("leader-otp-display"),
      {
        keyManagementAlgorithms: ["dir"],
        contentEncryptionAlgorithms: ["A256GCM"],
      },
    );
    items.push({
      id: row.id,
      full_name: row.full_name,
      phone: row.phone,
      department_name: row.department_name,
      otp_code: new TextDecoder().decode(decrypted.plaintext),
      expires_at: new Date(row.expires_at).toISOString(),
    });
  }
  return { items, total, page };
}
