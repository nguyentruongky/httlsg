import { IdentifierSchema } from "@org/core";
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
  identifier = IdentifierSchema.parse(identifier);
  const accounts = (
    await db.query(
      "SELECT * FROM church.users WHERE email=$1 OR church.normalize_phone(phone)=$1 ORDER BY id",
      [identifier],
    )
  ).rows;
  // A pending account without a password must not hide the explicitly assigned password.
  // Never choose arbitrarily between multiple credential-bearing identities.
  const credentialAccounts = accounts.filter(
    (account) => account.password_hash,
  );
  if (
    credentialAccounts.length > 1 ||
    (accounts.length > 1 && credentialAccounts.length !== 1)
  )
    throw new HttpError(
      409,
      "Số điện thoại trùng nhiều tài khoản. Vui lòng liên hệ Admin để hợp nhất hồ sơ.",
    );
  const account = credentialAccounts[0] ?? accounts[0];
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
        "SELECT id FROM church.users WHERE email=$1 OR church.normalize_phone(phone)=church.normalize_phone($2)",
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
