import { z } from "zod";
import {
  AccessRoleSchema,
  CHOIR_DEPARTMENT_AGE_BANDS,
  CreateAccountSchema,
  type AuthUser,
} from "@org/core";
import type { DB } from "./db";
import { requirePermission } from "./session";
import { hashPassword } from "./password";
import { audit, getMember } from "./members";
import { HttpError } from "./http";
export async function createAccount(db: DB, actor: AuthUser, input: unknown) {
  requirePermission(actor, "access.manage");
  const fields = CreateAccountSchema.strict().parse(input);
  const result = await db.query(
    "INSERT INTO church.member_profiles(email,full_name,role_id) VALUES($1,$2,$3) RETURNING id",
    [fields.email, fields.name, fields.accessRole],
  );
  await db.query(
    "INSERT INTO church.users(id,email,full_name,role_id,password_hash,is_password_set,must_reset_password,temporary_password_expires_at) VALUES($1,$2,$3,$4,$5,false,true,now()+interval '24 hours')",
    [
      result.rows[0].id,
      fields.email,
      fields.name,
      fields.accessRole,
      await hashPassword(fields.password),
    ],
  );
  await audit(db, actor, result.rows[0].id, "Đã tạo tài khoản");
  return getMember(db, actor, result.rows[0].id);
}
export const AccessChangeSchema = z
  .object({
    ids: z
      .array(z.uuid())
      .min(1)
      .max(100)
      .refine((v) => new Set(v).size === v.length),
    accessRole: AccessRoleSchema.optional(),
    status: z.enum(["active", "suspended"]).optional(),
    departmentIds: z
      .array(z.string().regex(/^[a-z0-9-]+$/))
      .max(100)
      .optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.accessRole !== undefined ||
      v.status !== undefined ||
      v.departmentIds !== undefined,
    "Chọn thay đổi cần lưu.",
  );
export async function changeAccess(db: DB, actor: AuthUser, input: unknown) {
  requirePermission(actor, "access.manage");
  const f = AccessChangeSchema.parse(input);
  if (f.accessRole === "leader")
    throw new HttpError(
      400,
      "Vui lòng phân công trưởng Ban trong trang Phân quyền.",
    );
  if (f.ids.includes(actor.id))
    throw new HttpError(
      400,
      "Không thể thay đổi quyền của tài khoản đang đăng nhập.",
    );
  const found = await db.query(
    "SELECT id,role_id FROM church.member_profiles WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL FOR UPDATE",
    [f.ids],
  );
  if (found.rowCount !== f.ids.length)
    throw new HttpError(404, "Không tìm thấy thành viên.");
  if (f.departmentIds !== undefined) {
    if (found.rows.some((row) => (f.accessRole ?? row.role_id) !== "board"))
      throw new HttpError(400, "Chỉ giao Ban ngành cho Ban điều hành.");
    const departments = await db.query(
      "SELECT id FROM church.departments WHERE id=ANY($1::text[])",
      [f.departmentIds],
    );
    if (departments.rowCount !== new Set(f.departmentIds).size)
      throw new HttpError(400, "Ban ngành không hợp lệ.");
  }
  await db.query(
    "UPDATE church.member_profiles SET role_id=COALESCE($2,role_id),enabled=COALESCE($3,enabled) WHERE id=ANY($1::uuid[])",
    [
      f.ids,
      f.accessRole ?? null,
      f.status === undefined ? null : f.status === "active",
    ],
  );
  if (f.accessRole)
    await db.query(
      "DELETE FROM church.department_leaders WHERE user_id=ANY($1::uuid[])",
      [f.ids],
    );
  if (f.accessRole && f.accessRole !== "board")
    await db.query(
      "DELETE FROM church.department_managers WHERE user_id=ANY($1::uuid[])",
      [f.ids],
    );
  if (f.departmentIds !== undefined)
    for (const id of f.ids) {
      await db.query(
        "DELETE FROM church.department_managers WHERE user_id=$1",
        [id],
      );
      for (const department of new Set(f.departmentIds))
        await db.query(
          "INSERT INTO church.department_managers(user_id,department_id) VALUES($1,$2)",
          [id, department],
        );
    }
  await db.query(
    "UPDATE church.otps SET is_used=true,used_at=now() WHERE user_id=ANY($1::uuid[]) AND NOT is_used",
    [f.ids],
  );
  await db.query(
    "UPDATE church.sessions SET revoked_at=now() WHERE user_id=ANY($1::uuid[]) AND revoked_at IS NULL",
    [f.ids],
  );
  for (const id of f.ids)
    await audit(db, actor, id, "Đã cập nhật quyền truy cập");
  return { ok: true };
}
export async function manageDepartment(
  db: DB,
  actor: AuthUser,
  input: unknown,
  method: string,
) {
  requirePermission(actor, "departments.manage");
  const f = z
    .object({
      id: z
        .string()
        .regex(/^[a-z0-9-]+$/)
        .max(100),
      name: z.string().trim().min(2).max(100).optional(),
      departmentType: z.enum(["choir", "ministry", "other"]).optional(),
    })
    .strict()
    .parse(input);
  if (method === "DELETE") {
    if (CHOIR_DEPARTMENT_AGE_BANDS.some((band) => band.departmentId === f.id))
      throw new HttpError(
        400,
        "Không thể xóa Ban hát lễ đang được cập nhật tự động theo độ tuổi.",
      );
    const affected = await db.query(
      "UPDATE church.users SET auth_version=auth_version+1 WHERE department_id=$1 OR id IN(SELECT user_id FROM church.department_leaders WHERE department_id=$1 UNION SELECT user_id FROM church.department_managers WHERE department_id=$1) RETURNING id",
      [f.id],
    );
    await db.query(
      "UPDATE church.sessions SET revoked_at=now() WHERE user_id=ANY($1::uuid[]) AND revoked_at IS NULL",
      [affected.rows.map((row) => row.id)],
    );
    await db.query("DELETE FROM church.departments WHERE id=$1", [f.id]);
  } else {
    if (!f.name) throw new HttpError(400, "Vui lòng nhập tên Ban ngành.");
    if (method === "POST")
      await db.query(
        "INSERT INTO church.departments(id,name,department_type) VALUES($1,$2,$3)",
        [f.id, f.name, f.departmentType ?? "ministry"],
      );
    else {
      const updated = await db.query(
        "UPDATE church.departments SET name=$2,department_type=COALESCE($3,department_type) WHERE id=$1",
        [f.id, f.name, f.departmentType ?? null],
      );
      if (!updated.rowCount)
        throw new HttpError(404, "Không tìm thấy Ban ngành.");
    }
  }
  await audit(db, actor, actor.id, "Đã cập nhật danh mục Ban ngành");
  return { ok: true };
}
