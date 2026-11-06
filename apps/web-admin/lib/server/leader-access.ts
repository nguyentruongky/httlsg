import type { AuthUser } from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { requirePermission } from "./session";
export async function leaderDepartments(
  db: DB,
  actor: AuthUser,
  permission = "members.read.department",
) {
  requirePermission(actor, permission);
  const rows = (
    await db.query(
      `SELECT l.department_id FROM church.department_leaders l JOIN church.users u ON u.id=l.user_id WHERE l.user_id=$1 AND (u.role_id='leader' OR EXISTS(SELECT 1 FROM church.member_roles mr WHERE mr.member_id=u.id AND mr.role_id='leader' AND mr.department_id=l.department_id)) ORDER BY l.department_id`,
      [actor.id],
    )
  ).rows;
  if (!rows.length)
    throw new HttpError(403, "Bạn chưa được phân công làm trưởng Ban ngành.");
  return rows.map((row) => row.department_id as string);
}

export async function boardDepartments(
  db: DB,
  actor: AuthUser,
  permission = "members.read.all",
) {
  requirePermission(actor, permission);
  const { rows } = await db.query(
    `SELECT m.department_id FROM church.department_managers m JOIN church.users u ON u.id=m.user_id WHERE m.user_id=$1 AND (u.role_id='board' OR EXISTS(SELECT 1 FROM church.member_roles mr WHERE mr.member_id=u.id AND mr.role_id='board' AND mr.department_id=m.department_id)) ORDER BY m.department_id`,
    [actor.id],
  );
  if (!rows.length)
    throw new HttpError(403, "Bạn chưa được phân công vào Ban điều hành.");
  return rows.map((row) => row.department_id as string);
}

// Admin-only gate shared by OTP management, snapshots, and the live stream.
export function requireOtpAdmin(actor: AuthUser) {
  if (actor.role !== "admin" || actor.requiresPasswordSetup)
    throw new HttpError(403, "Chỉ Admin có quyền xem mã OTP.");
  requirePermission(actor, "leader.otps.read");
}
export async function otpDepartments(db: DB, actor: AuthUser) {
  requireOtpAdmin(actor);
  const { rows } = await db.query(
    "SELECT id AS department_id FROM church.departments ORDER BY id",
  );
  return rows.map((row) => row.department_id as string);
}

export async function assignedDepartments(
  db: DB,
  actor: AuthUser,
  write = false,
) {
  const { rows } = await db.query(
    `
    SELECT m.department_id FROM church.department_managers m JOIN church.users u ON u.id=m.user_id
    WHERE m.user_id=$1 AND (u.role_id='board' OR EXISTS(SELECT 1 FROM church.member_roles r WHERE r.member_id=u.id AND r.role_id='board' AND r.department_id=m.department_id))
      AND EXISTS(SELECT 1 FROM church.role_permissions p WHERE p.role_id='board' AND p.permission_id=$2)
    UNION
    SELECT m.department_id FROM church.department_leaders m JOIN church.users u ON u.id=m.user_id
    WHERE m.user_id=$1 AND (u.role_id='leader' OR EXISTS(SELECT 1 FROM church.member_roles r WHERE r.member_id=u.id AND r.role_id='leader' AND r.department_id=m.department_id))
      AND EXISTS(SELECT 1 FROM church.role_permissions p WHERE p.role_id='leader' AND p.permission_id=$3)
  `,
    [
      actor.id,
      write ? "members.write.department" : "members.read.all",
      write ? "members.write.department" : "members.read.department",
    ],
  );
  return rows.map((row) => row.department_id as string);
}
