import { z } from "zod";
import { IdentifierSchema, TemporaryPasswordSchema } from "@org/core";
import {
  withActor,
  requirePermission,
} from "../../../../../../lib/server/session";
import { hashPassword } from "../../../../../../lib/server/password";
import { audit } from "../../../../../../lib/server/members";
import {
  assertOrigin,
  body,
  failure,
  json,
  HttpError,
} from "../../../../../../lib/server/http";
export const runtime = "nodejs";
const CredentialSchema = z.union([
  z.object({ identifier: IdentifierSchema, password: TemporaryPasswordSchema }).strict(),
  z
    .object({ email: IdentifierSchema, password: TemporaryPasswordSchema })
    .strict()
    .transform((f) => ({ identifier: f.email, password: f.password })),
]);
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertOrigin(request);
    const { id } = await context.params;
    z.uuid().parse(id);
    const input = await body(request);
    return await withActor(
      request,
      async (db, actor) => {
        requirePermission(actor, "access.manage");
        const fields = CredentialSchema.parse(input);
        const profile = (
          await db.query(
            "SELECT id,full_name,role_id,enabled FROM church.member_profiles WHERE id=$1 AND deleted_at IS NULL FOR UPDATE",
            [id],
          )
        ).rows[0];
        if (!profile) throw new HttpError(404, "Không tìm thấy thành viên.");
        const email = fields.identifier.includes("@")
            ? fields.identifier
            : null,
          phone = email ? null : fields.identifier;
        await db.query(
          `INSERT INTO church.users(id,email,phone,full_name,role_id,enabled,password_hash,is_password_set,must_reset_password,temporary_password_expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,false,true,now()+interval '24 hours') ON CONFLICT(id) DO UPDATE SET requires_admin_email_otp=CASE WHEN EXCLUDED.email IS NOT NULL THEN false ELSE church.users.requires_admin_email_otp END,email=COALESCE(EXCLUDED.email,church.users.email),phone=COALESCE(EXCLUDED.phone,church.users.phone),password_hash=EXCLUDED.password_hash,is_password_set=false,must_reset_password=true,temporary_password_expires_at=EXCLUDED.temporary_password_expires_at,auth_version=church.users.auth_version+1`,
          [
            id,
            email,
            phone,
            profile.full_name,
            profile.role_id,
            profile.enabled,
            await hashPassword(fields.password),
          ],
        );
        await db.query(
          "UPDATE church.sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
          [id],
        );
        await db.query(
          "UPDATE church.otps SET is_used=true,used_at=now() WHERE user_id=$1 AND NOT is_used",
          [id],
        );
        await audit(db, actor, id, "Đã cấp mật khẩu tạm thời");
        return json({ ok: true });
      },
      true,
    );
  } catch (error) {
    return failure(error);
  }
}
