import { LoginRequestSchema } from "@org/core";
import { pool, transaction } from "./db";
import { actorById, createSession } from "./session";
import { dummyHash, verifyPassword } from "./password";
import { HttpError } from "./http";
import { rateLimit } from "./limits";
export async function login(input: unknown) {
  const fields = LoginRequestSchema.parse(input);
  await rateLimit(fields.identifier, 8);
  const result = await pool().query(
    "SELECT id,password_hash FROM church.users WHERE (email=$1 OR phone=$1) AND deleted_at IS NULL AND enabled",
    [fields.identifier],
  );
  const row = result.rows[0],
    valid = await verifyPassword(
      row?.password_hash ?? (await dummyHash()),
      fields.password,
    );
  if (!valid || !row?.password_hash)
    throw new HttpError(401, "Số điện thoại, email hoặc mật khẩu không đúng.");
  return transaction(async (db) => {
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
