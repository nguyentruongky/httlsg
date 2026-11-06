import type { DB } from "./db";
import { HttpError } from "./http";
export type ProfileIdentity = {
  profile: Record<string, any>;
  account: Record<string, any> | null;
  profileContact: boolean;
};
// Credential identifiers retain precedence. Descriptive contacts may be shared,
// so profile-only matches must be unique and still require authentication proof.
export async function findAccountIdentity(
  db: DB,
  identifier: string,
): Promise<ProfileIdentity | null> {
  const account = (
    await db.query("SELECT * FROM church.users WHERE email=$1 OR phone=$1", [
      identifier,
    ])
  ).rows[0];
  if (account) {
    const profile = (
      await db.query(
        "SELECT id,full_name,email,phone,role_id,enabled,deleted_at FROM church.member_profiles WHERE id=$1",
        [account.id],
      )
    ).rows[0];
    return { account, profile, profileContact: false };
  }
  const match = identifier.includes("@")
    ? "p.email=$1"
    : "church.normalize_phone(p.phone)=$1";
  const profiles = (
    await db.query(
      `SELECT p.id,p.full_name,p.email,p.phone,p.role_id,p.enabled,p.deleted_at FROM church.member_profiles p WHERE p.deleted_at IS NULL AND ${match} ORDER BY p.id LIMIT 2`,
      [identifier],
    )
  ).rows;
  if (profiles.length > 1)
    throw new HttpError(
      409,
      "Thông tin liên hệ trùng nhiều hồ sơ. Vui lòng liên hệ Admin để xác minh.",
    );
  if (!profiles.length) return null;
  const existing =
    (await db.query("SELECT * FROM church.users WHERE id=$1", [profiles[0].id]))
      .rows[0] ?? null;
  if (!existing) {
    const owned = (
      await db.query(
        "SELECT id FROM church.users WHERE email=$1 OR phone=church.normalize_phone($2)",
        [profiles[0].email, profiles[0].phone],
      )
    ).rows;
    if (owned.length)
      throw new HttpError(
        409,
        "Thông tin liên hệ đã gắn với hồ sơ đăng nhập khác. Vui lòng nhờ Admin hợp nhất hồ sơ trước.",
      );
  }
  return { profile: profiles[0], account: existing, profileContact: true };
}
// Existing-profile claims use an Admin-delivered code, never automatic email
// delivery to an editable contact address. No new member profile is created.
export async function ensureProfileAccount(
  db: DB,
  identity: ProfileIdentity,
  identifier: string,
): Promise<Record<string, any>> {
  if (identity.account) return identity.account;
  const p = identity.profile;
  const department =
    (
      await db.query(
        "SELECT department_id FROM church.member_roles WHERE member_id=$1 AND department_id IS NOT NULL ORDER BY CASE WHEN role_id=$2 THEN 0 ELSE 1 END,department_id LIMIT 1",
        [p.id, p.role_id],
      )
    ).rows[0]?.department_id ??
    (
      await db.query(
        "SELECT department_id FROM church.department_members WHERE user_id=$1 ORDER BY department_id LIMIT 1",
        [p.id],
      )
    ).rows[0]?.department_id ??
    null;
  const account = (
    await db.query(
      "INSERT INTO church.users(id,email,phone,full_name,role_id,enabled,department_id,requires_admin_email_otp) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
      [
        p.id,
        identifier.includes("@") ? identifier : null,
        identifier.startsWith("+") ? identifier : null,
        p.full_name,
        p.role_id,
        p.enabled,
        department,
        identifier.includes("@"),
      ],
    )
  ).rows[0];
  return account;
}
