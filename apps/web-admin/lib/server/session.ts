import { createHash, randomUUID } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";
import {
  AccessRoleSchema,
  accessRoleLabels,
  replaceDepartmentCatalog,
  type AuthUser,
} from "@org/core";
import { pool, type DB, transaction } from "./db";
import { HttpError } from "./http";
export const SESSION_SECONDS = 15 * 60;
export const SETUP_SESSION_SECONDS = 15 * 60;
export const cookieName = () =>
  process.env.NODE_ENV === "production"
    ? "__Host-church-session"
    : "church-session";
export const cookieOptions = (maxAge = SESSION_SECONDS) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});
function key() {
  const value = Buffer.from(process.env.SESSION_SECRET ?? "", "base64");
  if (value.length !== 32)
    throw new Error("SESSION_SECRET must contain 32 random bytes");
  return value;
}
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function requestToken(request: Request) {
  const header = request.headers.get("authorization");
  return header?.match(/^Bearer ([^\s]+)$/)?.[1] ?? "";
}
export async function actorById(db: DB, id: string): Promise<AuthUser | null> {
  const { rows } = await db.query(
    `SELECT EXISTS(SELECT 1 FROM church.security_events e WHERE e.user_id=u.id AND e.created_at>now()-interval '24 hours') security_alert,u.id,COALESCE(u.email,(SELECT p.email FROM church.member_profiles p WHERE p.id=u.id)) email,u.full_name,COALESCE(u.phone,(SELECT church.normalize_phone(p.phone) FROM church.member_profiles p WHERE p.id=u.id)) phone,u.created_at,u.updated_at,u.role_id,u.department_id,u.auth_version,u.is_password_set,u.must_reset_password,
 ARRAY(SELECT permission_id FROM church.role_permissions rp WHERE (rp.role_id=u.role_id OR EXISTS(SELECT 1 FROM church.member_roles mr WHERE mr.member_id=u.id AND mr.role_id=rp.role_id)) AND (permission_id NOT LIKE 'schedule.%' OR u.role_id IN ('admin','secretary')) UNION SELECT 'schedule.'||m.category_id||'.manage' FROM church.schedule_manager_permissions m JOIN church.schedule_categories c ON c.id=m.category_id WHERE m.member_id=u.id AND m.is_active AND c.is_active ORDER BY 1) permissions,
 ARRAY(SELECT department_id FROM church.department_managers WHERE user_id=u.id ORDER BY department_id) board_departments,
 ARRAY(SELECT role_id FROM church.member_roles WHERE member_id=u.id UNION SELECT u.role_id) held_roles,
 ARRAY(SELECT department_id FROM church.department_leaders WHERE user_id=u.id ORDER BY department_id) leader_departments,
 ARRAY(SELECT department_id FROM church.department_managers WHERE user_id=u.id UNION SELECT department_id FROM church.department_leaders WHERE user_id=u.id) departments,
 (SELECT department_id FROM church.department_leaders WHERE user_id=u.id ORDER BY department_id LIMIT 1) leader_department_id
 FROM church.users u WHERE u.id=$1 AND u.enabled AND u.deleted_at IS NULL`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  const role = AccessRoleSchema.parse(row.role_id),
    requiresPasswordSetup = !row.is_password_set || row.must_reset_password;
  return {
    id: row.id,
    email: row.email,
    name: row.full_name,
    phone: row.phone,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    role,
    roleLabel: accessRoleLabels[role],
    roles: row.held_roles,
    leaderDepartmentIds: row.leader_departments,
    boardDepartmentIds: row.board_departments,
    departmentIds: row.departments,
    departmentId: row.department_id,
    permissions: requiresPasswordSetup ? [] : row.permissions,
    isPasswordSet: row.is_password_set,
    requiresPasswordSetup,
    securityAlert: Boolean(row.security_alert),
    authVersion: row.auth_version,
    leaderDepartmentId: row.leader_department_id,
  };
}
export async function createSession(db: DB, actor: AuthUser) {
  const id = randomUUID(),
    purpose = actor.requiresPasswordSetup ? "password_setup" : "access";
  const expires = new Date(
    Date.now() +
      (actor.requiresPasswordSetup ? SETUP_SESSION_SECONDS : SESSION_SECONDS) *
        1000,
  );
  const token = await new EncryptJWT({
    role: actor.role,
    departmentIds: actor.departmentIds,
    departmentId: actor.departmentId,
    sid: id,
    av: actor.authVersion,
    purpose,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setSubject(actor.id)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expires.getTime() / 1000))
    .setIssuer("church")
    .setAudience("church-app")
    .encrypt(key());
  await db.query(
    "INSERT INTO church.sessions(id,user_id,token_hash,expires_at,auth_version,purpose) VALUES($1,$2,$3,$4,$5,$6)",
    [id, actor.id, tokenHash(token), expires, actor.authVersion, purpose],
  );
  return token;
}
export async function authenticate(db: DB, token: string): Promise<AuthUser> {
  if (!token) throw new HttpError(401, "Vui lòng đăng nhập.");
  let payload;
  try {
    ({ payload } = await jwtDecrypt(token, key(), {
      issuer: "church",
      audience: "church-app",
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
    }));
  } catch {
    throw new HttpError(401, "Phiên đăng nhập đã hết hạn.");
  }
  if (
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string" ||
    typeof payload.av !== "number"
  )
    throw new HttpError(401, "Phiên đăng nhập không hợp lệ.");
  const result = await db.query(
    `SELECT s.purpose,u.auth_version FROM church.sessions s JOIN church.users u ON u.id=s.user_id
 WHERE s.id=$1 AND s.user_id=$2 AND s.token_hash=$3 AND s.revoked_at IS NULL AND s.expires_at>now() AND s.auth_version=u.auth_version AND u.enabled AND u.deleted_at IS NULL
 AND (s.refresh_family IS NULL OR EXISTS(SELECT 1 FROM church.refresh_tokens r WHERE r.family_id=s.refresh_family AND NOT r.revoked AND (r.expires_at IS NULL OR r.expires_at>now()) AND r.auth_version=u.auth_version))
 AND (NOT u.must_reset_password OR u.temporary_password_expires_at IS NULL OR u.temporary_password_expires_at>now()) FOR SHARE OF s,u`,
    [payload.sid, payload.sub, tokenHash(token)],
  );
  const session = result.rows[0];
  if (
    !session ||
    session.auth_version !== payload.av ||
    session.purpose !== payload.purpose
  )
    throw new HttpError(401, "Phiên đăng nhập đã hết hạn.");
  const actor = await actorById(db, payload.sub);
  if (
    !actor ||
    (actor.requiresPasswordSetup ? "password_setup" : "access") !==
      session.purpose
  )
    throw new HttpError(401, "Phiên đăng nhập đã hết hạn.");
  return actor;
}
export async function withActor<T>(
  request: Request,
  fn: (db: DB, actor: AuthUser) => Promise<T>,
  write = false,
  allowPasswordSetup = false,
) {
  return transaction(async (db) => {
    if (write) await db.query("SELECT pg_advisory_xact_lock(74298331)");
    const actor = await authenticate(db, requestToken(request));
    if (actor.requiresPasswordSetup && !allowPasswordSetup)
      throw new HttpError(
        403,
        "Vui lòng đặt mật khẩu trước khi tiếp tục.",
        "PASSWORD_SETUP_REQUIRED",
      );
    replaceDepartmentCatalog(
      (await db.query("SELECT id,name FROM church.departments ORDER BY name"))
        .rows,
    );
    return fn(db, actor);
  });
}
export function requirePermission(actor: AuthUser, permission: string) {
  if (!actor.permissions.includes(permission))
    throw new HttpError(403, "Bạn không có quyền thực hiện thao tác này.");
}
export async function revokeSession(token: string) {
  if (token)
    await pool().query(
      "UPDATE church.sessions SET revoked_at=now() WHERE token_hash=$1",
      [tokenHash(token)],
    );
}
