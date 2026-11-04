import { z } from "zod";
import { AccessRoleSchema, type AuthUser } from "@org/core";
import type { DB } from "./db";
import { requirePermission } from "./session";
import { HttpError } from "./http";
import { audit } from "./members";
const allowed: Record<string, string[]> = {
  deacon: ["members.read.all"],
  board: ["members.read.all", "members.write.department"],
  user: ["members.read.family", "members.write.family"],
  leader: [
    "members.read.department",
    "members.write.department",
    "leader.otps.read",
  ],
};
function admin(actor: AuthUser) {
  if (actor.role !== "admin" && actor.role !== "secretary")
    throw new HttpError(403, "Trang này dành cho Admin và Thư ký.");
  requirePermission(actor, "access.manage");
}
export async function getRoles(db: DB, actor: AuthUser) {
  admin(actor);
  return {
    roles: (
      await db.query(
        "SELECT r.id,r.name,ARRAY(SELECT permission_id FROM church.role_permissions rp WHERE rp.role_id=r.id ORDER BY permission_id) permissions FROM church.roles r ORDER BY r.id",
      )
    ).rows,
    permissions: (
      await db.query(
        "SELECT id,code,name FROM church.permissions ORDER BY code",
      )
    ).rows,
    departments: (
      await db.query("SELECT id,name FROM church.departments ORDER BY name")
    ).rows,
    users: (
      await db.query(
        `SELECT p.id,p.full_name name,p.role_id role,u.department_id,EXISTS(SELECT 1 FROM church.users a WHERE a.id=p.id) has_account,(SELECT department_id FROM church.department_leaders l WHERE l.user_id=p.id) leader_department_id FROM church.member_profiles p LEFT JOIN church.users u ON u.id=p.id WHERE p.deleted_at IS NULL ORDER BY p.full_name,p.id`,
      )
    ).rows,
    allowed,
  };
}
const Input = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("assign-user"),
      user_id: z.uuid(),
      role_id: AccessRoleSchema,
      department_id: z
        .string()
        .regex(/^[a-z0-9-]+$/)
        .nullable()
        .optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("update-role-permissions"),
      role_id: AccessRoleSchema,
      permissions: z
        .array(z.string())
        .max(30)
        .refine((v) => new Set(v).size === v.length),
    })
    .strict(),
]);
export async function updateRoles(db: DB, actor: AuthUser, input: unknown) {
  admin(actor);
  const f = Input.parse(input);
  if (f.action === "update-role-permissions") {
    if (f.role_id === "admin" || f.role_id === "secretary")
      throw new HttpError(
        400,
        "Admin và Thư ký luôn có quyền đầy đủ và giống nhau.",
      );
    if (f.permissions.some((p) => !allowed[f.role_id]?.includes(p)))
      throw new HttpError(400, "Quyền không phù hợp với phạm vi của vai trò.");
    await db.query("DELETE FROM church.role_permissions WHERE role_id=$1", [
      f.role_id,
    ]);
    for (const code of f.permissions)
      await db.query(
        "INSERT INTO church.role_permissions(role_id,permission_id) VALUES($1,$2)",
        [f.role_id, code],
      );
    await db.query(
      "UPDATE church.users SET auth_version=auth_version+1 WHERE role_id=$1",
      [f.role_id],
    );
    await db.query(
      "UPDATE church.sessions SET revoked_at=now() WHERE user_id IN(SELECT id FROM church.users WHERE role_id=$1) AND revoked_at IS NULL",
      [f.role_id],
    );
    await db.query(
      "UPDATE church.otps SET is_used=true,used_at=now() WHERE user_id IN(SELECT id FROM church.users WHERE role_id=$1) AND NOT is_used",
      [f.role_id],
    );
    await audit(db, actor, actor.id, "Đã cập nhật quyền của vai trò");
    return { ok: true };
  }
  if (f.user_id === actor.id)
    throw new HttpError(
      400,
      "Không thể thay đổi quyền của tài khoản đang đăng nhập.",
    );
  const profile = (
    await db.query(
      "SELECT id FROM church.member_profiles WHERE id=$1 AND deleted_at IS NULL FOR UPDATE",
      [f.user_id],
    )
  ).rows[0];
  if (!profile) throw new HttpError(404, "Không tìm thấy thành viên.");
  if (f.role_id === "leader" && !f.department_id)
    throw new HttpError(400, "Chọn Ban ngành cho trưởng Ban.");
  if (
    f.department_id &&
    !(
      await db.query("SELECT id FROM church.departments WHERE id=$1", [
        f.department_id,
      ])
    ).rowCount
  )
    throw new HttpError(400, "Ban ngành không hợp lệ.");
  const account = (
    await db.query("SELECT id FROM church.users WHERE id=$1 FOR UPDATE", [
      f.user_id,
    ])
  ).rows[0];
  if (f.role_id === "leader" && !account)
    throw new HttpError(
      400,
      "Thiết lập thông tin đăng nhập cho thành viên trước khi phân công trưởng Ban.",
    );
  await db.query("UPDATE church.member_profiles SET role_id=$2 WHERE id=$1", [
    f.user_id,
    f.role_id,
  ]);
  await db.query(
    "UPDATE church.users SET department_id=$2,auth_version=auth_version+1 WHERE id=$1",
    [f.user_id, f.department_id ?? null],
  );
  await db.query("DELETE FROM church.department_leaders WHERE user_id=$1", [
    f.user_id,
  ]);
  if (f.role_id === "leader")
    await db.query(
      "INSERT INTO church.department_members(user_id,department_id,position) VALUES($1,$2,'Trưởng Ban') ON CONFLICT DO NOTHING",
      [f.user_id, f.department_id],
    );
  if (f.role_id === "leader")
    await db.query(
      "INSERT INTO church.department_leaders(user_id,department_id) VALUES($1,$2)",
      [f.user_id, f.department_id],
    );
  if (f.role_id !== "board")
    await db.query("DELETE FROM church.department_managers WHERE user_id=$1", [
      f.user_id,
    ]);
  await db.query(
    "UPDATE church.otps SET is_used=true,used_at=now() WHERE user_id=$1 AND NOT is_used",
    [f.user_id],
  );
  await db.query(
    "UPDATE church.sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
    [f.user_id],
  );
  await audit(
    db,
    actor,
    f.user_id,
    "Đã cập nhật vai trò và phân công Ban ngành",
  );
  return { ok: true };
}
