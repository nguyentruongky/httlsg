import { SetPasswordSchema, type AuthUser } from "@org/core";
import type { DB } from "./db";
import { actorById, createSession } from "./session";
import { hashPassword, verifyPassword } from "./password";
import { HttpError } from "./http";
import { audit } from "./members";
export async function setPassword(db: DB, actor: AuthUser, input: unknown) {
  if (!actor.requiresPasswordSetup)
    throw new HttpError(403, "Tài khoản đã có mật khẩu.");
  const fields = SetPasswordSchema.parse(input);
  const row = (
    await db.query(
      "SELECT password_hash FROM church.users WHERE id=$1 FOR UPDATE",
      [actor.id],
    )
  ).rows[0];
  if (
    row?.password_hash &&
    (await verifyPassword(row.password_hash, fields.new_password))
  )
    throw new HttpError(400, "Mật khẩu mới phải khác mật khẩu tạm thời.");
  await db.query(
    "UPDATE church.users SET password_hash=$2,is_password_set=true,must_reset_password=false,temporary_password_expires_at=NULL,password_changed_at=now(),auth_version=auth_version+1 WHERE id=$1",
    [actor.id, await hashPassword(fields.new_password)],
  );
  await db.query(
    "UPDATE church.sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
    [actor.id],
  );
  await db.query(
    "UPDATE church.otps SET is_used=true,used_at=now() WHERE user_id=$1 AND NOT is_used",
    [actor.id],
  );
  await audit(db, actor, actor.id, "Đã thiết lập mật khẩu");
  const user = await actorById(db, actor.id);
  if (!user) throw new HttpError(401, "Tài khoản không khả dụng.");
  return { user, token: await createSession(db, user) };
}
