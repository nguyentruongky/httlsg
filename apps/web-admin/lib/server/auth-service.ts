import { findAccountIdentity } from "./account-lookup";
import { LoginRequestSchema } from "@org/core";
import { pool, transaction } from "./db";
import { actorById, createSession } from "./session";
import { dummyHash, verifyPassword } from "./password";
import { HttpError } from "./http";
import { rateLimit } from "./limits";
export async function login(input: unknown) {
  const fields = LoginRequestSchema.parse(input);
  await rateLimit(fields.identifier, 8);
  if (fields.identifier.startsWith("+"))
    throw new HttpError(
      400,
      "Vui lòng đăng nhập bằng mã OTP cho số điện thoại.",
    );
  const identity = await findAccountIdentity(pool(), fields.identifier);
  const row = identity?.account,
    valid = await verifyPassword(
      row?.password_hash ?? (await dummyHash()),
      fields.password,
    );
  if (!valid || !row?.password_hash)
    throw new HttpError(401, "Số điện thoại, email hoặc mật khẩu không đúng.");
  return transaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(74298331)");
    const fresh = await findAccountIdentity(db, fields.identifier);
    if (fresh?.account?.id !== row.id)
      throw new HttpError(
        401,
        "Số điện thoại, email hoặc mật khẩu không đúng.",
      );
    const locked = await db.query(
      "SELECT id FROM church.users WHERE id=$1 AND enabled AND deleted_at IS NULL AND password_hash=$2 AND (NOT must_reset_password OR temporary_password_expires_at IS NULL OR temporary_password_expires_at>now()) FOR SHARE",
      [row.id, row.password_hash],
    );
    if (!locked.rowCount)
      throw new HttpError(
        401,
        "Số điện thoại, email hoặc mật khẩu không đúng.",
      );
    const user = await actorById(db, row.id);
    if (!user)
      throw new HttpError(
        401,
        "Số điện thoại, email hoặc mật khẩu không đúng.",
      );
    return { user, token: await createSession(db, user) };
  });
}
