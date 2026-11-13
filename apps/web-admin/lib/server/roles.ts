import {
  sortDepartments,
  PERSONNEL_MINISTRY_NAMES,
  prioritizePersonnelAssignments,
} from "@org/core";
import { z } from "zod";
import {
  AccessRoleSchema,
  accessRoleLabels,
  departmentScopedRoles,
  primaryAccessRole,
  roleRequiresDepartment,
  type AccessRole,
  type AuthUser,
} from "@org/core";
import type { DB } from "./db";
import { requirePermission, isAdministrativeRead } from "./session";
import { HttpError } from "./http";
import { audit } from "./members";
// Permissions a role is allowed to hold. Admin/Thư ký general grants are fixed; calendar has explicit role ceilings.
const allowed: Record<string, string[]> = {
  deacon: ["members.read.all"],
  board: ["members.read.all", "members.write.department", "leader.otps.read"],
  user: ["members.read.family", "members.write.family"],
  leader: [
    "members.read.department",
    "members.write.department",
    "leader.otps.read",
  ],
};
function admin(actor: AuthUser) {
  if (
    !isAdministrativeRead(actor) &&
    actor.role !== "admin" &&
    actor.role !== "secretary"
  )
    throw new HttpError(403, "Trang này dành cho Admin và Thư ký.");
  requirePermission(actor, "access.manage");
}
function loginEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
    ? email
    : null;
}
// Departmental roles live in department-scoped tables that reference
// church.users, so the member needs a login account. Members may hold such a
// role before they register, so we create a credential-less account and let
// them claim it later through OTP or an admin-issued temporary password.
async function provisionPendingAccount(
  db: DB,
  id: string,
  member: {
    full_name: string;
    email: string | null;
    enabled: boolean;
    normalized_phone: string | null;
  },
  role: AccessRole,
  department: string | null,
) {
  let email = loginEmail(member.email),
    phone = member.normalized_phone ?? null;
  // Login identifiers are unique, so drop any contact already claimed by
  // another account rather than failing the whole assignment.
  if (
    email &&
    (
      await db.query(
        "SELECT 1 FROM church.users WHERE id<>$1 AND email=$2 LIMIT 1",
        [id, email],
      )
    ).rowCount
  )
    email = null;
  if (
    phone &&
    (
      await db.query(
        "SELECT 1 FROM church.users WHERE id<>$1 AND church.normalize_phone(phone)=$2 LIMIT 1",
        [id, phone],
      )
    ).rowCount
  )
    phone = null;
  if (!email && !phone)
    throw new HttpError(
      400,
      "Thành viên cần số điện thoại hoặc email chưa dùng cho tài khoản khác để tạo tài khoản đăng nhập.",
    );
  await db.query(
    `INSERT INTO church.users(id,email,phone,full_name,role_id,enabled,department_id,is_password_set,must_reset_password) VALUES($1,$2,$3,$4,$5,$6,$7,false,false)`,
    [id, email, phone, member.full_name, role, member.enabled, department],
  );
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
    departments: sortDepartments(
      (await db.query("SELECT id,name FROM church.departments ORDER BY name"))
        .rows,
    ),
    users: (
      await db.query(
        `SELECT p.id,p.full_name name,p.role_id role,u.department_id,EXISTS(SELECT 1 FROM church.users a WHERE a.id=p.id) has_account,(SELECT department_id FROM church.department_leaders l WHERE l.user_id=p.id ORDER BY department_id LIMIT 1) leader_department_id FROM church.member_profiles p LEFT JOIN church.users u ON u.id=p.id WHERE p.deleted_at IS NULL ORDER BY p.full_name,p.id`,
      )
    ).rows,
    allowed,
  };
}
export async function getPermissionMatrix(db: DB, actor: AuthUser) {
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
    allowed,
  };
}
const PermissionInput = z
  .object({
    role_id: AccessRoleSchema,
    permissions: z
      .array(z.string())
      .max(30)
      .refine((v) => new Set(v).size === v.length),
  })
  .strict();
export async function updatePermissionMatrix(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  admin(actor);
  const f = PermissionInput.parse(input);
  if (f.role_id === "admin" || f.role_id === "secretary")
    throw new HttpError(
      400,
      "Quyền hệ thống của Admin và Thư ký không thể chỉnh sửa tại đây.",
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
    "UPDATE church.users SET auth_version=auth_version+1 WHERE role_id=$1 OR id IN (SELECT member_id FROM church.member_roles WHERE role_id=$1)",
    [f.role_id],
  );
  await db.query(
    "UPDATE church.sessions SET revoked_at=now() WHERE user_id IN(SELECT id FROM church.users WHERE role_id=$1 OR id IN (SELECT member_id FROM church.member_roles WHERE role_id=$1)) AND revoked_at IS NULL",
    [f.role_id],
  );
  await db.query(
    "UPDATE church.otps SET is_used=true,used_at=now() WHERE user_id IN(SELECT id FROM church.users WHERE role_id=$1 OR id IN (SELECT member_id FROM church.member_roles WHERE role_id=$1)) AND NOT is_used",
    [f.role_id],
  );
  await audit(db, actor, actor.id, "Đã cập nhật quyền của vai trò");
  return { ok: true };
}
const AssignInput = z
  .object({
    user_id: z.uuid(),
    roles: z
      .array(
        z
          .object({
            role_id: AccessRoleSchema,
            department_id: z
              .string()
              .regex(/^[a-z0-9-]+$/)
              .max(100)
              .nullable()
              .optional(),
          })
          .strict(),
      )
      .max(20)
      .refine(
        (v) =>
          new Set(v.map((e) => `${e.role_id}:${e.department_id ?? ""}`))
            .size === v.length,
        "Vai trò bị trùng.",
      ),
  })
  .strict();
export async function assignUserRole(db: DB, actor: AuthUser, input: unknown) {
  admin(actor);
  const f = AssignInput.parse(input);
  if (f.user_id === actor.id)
    throw new HttpError(
      400,
      "Không thể thay đổi quyền của tài khoản đang đăng nhập.",
    );
  // Normalise the submitted set before touching anything.
  const entries = f.roles.map((entry) => {
    if (entry.role_id === "user")
      throw new HttpError(
        400,
        "Vai trò User là mặc định; bỏ chọn mọi vai trò để thu hồi.",
      );
    const needsDepartment = roleRequiresDepartment(entry.role_id);
    const department = needsDepartment ? (entry.department_id ?? null) : null;
    if (needsDepartment && !department)
      throw new HttpError(
        400,
        `Vai trò ${accessRoleLabels[entry.role_id]} bắt buộc phải chọn một Ban ngành.`,
      );
    if (!needsDepartment && entry.department_id)
      throw new HttpError(
        400,
        `Vai trò ${accessRoleLabels[entry.role_id]} không thuộc Ban ngành nào.`,
      );
    return { role: entry.role_id, department };
  });
  const departmentIds = [
    ...new Set(entries.map((entry) => entry.department).filter(Boolean)),
  ] as string[];
  if (departmentIds.length) {
    const known = await db.query(
      "SELECT id FROM church.departments WHERE id=ANY($1::text[])",
      [departmentIds],
    );
    if (known.rowCount !== departmentIds.length)
      throw new HttpError(400, "Ban ngành không hợp lệ.");
  }
  const profile = await db.query(
    "SELECT id,full_name,email,enabled,church.normalize_phone(phone) AS normalized_phone FROM church.member_profiles WHERE id=$1 AND deleted_at IS NULL FOR UPDATE",
    [f.user_id],
  );
  if (!profile.rowCount) throw new HttpError(404, "Không tìm thấy thành viên.");
  const primary = primaryAccessRole(entries.map((entry) => entry.role));
  const primaryDepartment =
    entries.find((entry) => entry.role === primary)?.department ?? null;
  const account = await db.query(
    "SELECT id FROM church.users WHERE id=$1 FOR UPDATE",
    [f.user_id],
  );
  // Departmental roles are stored in tables that reference church.users, so a
  // login account must exist. Provision a pending one so the role and Ban
  // ngành can be assigned before the member completes registration.
  if (departmentIds.length && !account.rowCount)
    await provisionPendingAccount(
      db,
      f.user_id,
      profile.rows[0],
      primary,
      primaryDepartment,
    );
  // The submitted set replaces the stored one, so the form is authoritative.
  await db.query("DELETE FROM church.member_roles WHERE member_id=$1", [
    f.user_id,
  ]);
  for (const entry of entries)
    await db.query(
      "INSERT INTO church.member_roles(member_id,role_id,department_id) VALUES($1,$2,$3)",
      [f.user_id, entry.role, entry.department],
    );
  await db.query("UPDATE church.member_profiles SET role_id=$2 WHERE id=$1", [
    f.user_id,
    primary,
  ]);
  await db.query(
    "UPDATE church.users SET department_id=$2,auth_version=auth_version+1 WHERE id=$1",
    [f.user_id, primaryDepartment],
  );
  await db.query("DELETE FROM church.department_leaders WHERE user_id=$1", [
    f.user_id,
  ]);
  await db.query("DELETE FROM church.department_managers WHERE user_id=$1", [
    f.user_id,
  ]);
  for (const entry of entries) {
    if (entry.role === "leader") {
      await db.query(
        "INSERT INTO church.department_members(user_id,department_id,position) VALUES($1,$2,'Trưởng Ban') ON CONFLICT(department_id,user_id) DO UPDATE SET position='Trưởng Ban'",
        [f.user_id, entry.department],
      );
      await db.query(
        "INSERT INTO church.department_leaders(user_id,department_id) VALUES($1,$2)",
        [f.user_id, entry.department],
      );
    }
    if (entry.role === "board")
      await db.query(
        "INSERT INTO church.department_managers(user_id,department_id) VALUES($1,$2)",
        [f.user_id, entry.department],
      );
  }
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
const Input = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("assign-user"),
      user_id: z.uuid(),
      roles: z
        .array(
          z
            .object({
              role_id: AccessRoleSchema,
              department_id: z
                .string()
                .regex(/^[a-z0-9-]+$/)
                .max(100)
                .nullable()
                .optional(),
            })
            .strict(),
        )
        .max(20),
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
  if (f.action === "update-role-permissions")
    return updatePermissionMatrix(db, actor, {
      role_id: f.role_id,
      permissions: f.permissions,
    });
  return assignUserRole(db, actor, {
    user_id: f.user_id,
    roles: f.roles,
  });
}
const SearchQuery = z.object({
  memberId: z.uuid().optional(),
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(5000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type MemberRole = {
  roleId: AccessRole;
  departmentId: string | null;
  departmentName?: string | null;
};
// church.member_roles is authoritative, but members created through older paths
// (account creation, bulk access changes) only carry the single role column.
function roleSet(row: {
  role: AccessRole;
  roles?: MemberRole[] | null;
  departmentId?: string | null;
}): MemberRole[] {
  if (row.roles?.length) return row.roles;
  return row.role === "user"
    ? []
    : [{ roleId: row.role, departmentId: row.departmentId ?? null }];
}
export async function searchMembers(db: DB, actor: AuthUser, input: unknown) {
  admin(actor);
  const f = SearchQuery.parse(input ?? {});
  const values: unknown[] = [];
  const conditions = ["p.deleted_at IS NULL"];
  if (f.memberId) {
    values.push(f.memberId);
    conditions.push(`p.id=$${values.length}`);
  }
  if (f.q) {
    values.push(f.q.replace(/[\\%_]/g, "\\$&"));
    conditions.push(
      `public.unaccent(lower(concat_ws(' ',p.full_name,p.email,p.phone))) ILIKE '%'||public.unaccent(lower($${values.length}::text))||'%'`,
    );
  }
  const where = conditions.join(" AND ");
  const total = (
    await db.query(
      `SELECT count(*)::integer total FROM church.member_profiles p WHERE ${where}`,
      values,
    )
  ).rows[0].total;
  values.push(f.pageSize, (f.page - 1) * f.pageSize);
  const rows = (
    await db.query(
      `SELECT p.id,p.full_name AS name,p.email,p.phone,p.role_id AS role,
 EXISTS(SELECT 1 FROM church.users a WHERE a.id=p.id) AS "hasAccount",
 u.department_id AS "departmentId",
 COALESCE((SELECT jsonb_agg(d.name ORDER BY d.name) FROM church.department_members dm JOIN church.departments d ON d.id=dm.department_id WHERE dm.user_id=p.id),'[]') AS "allDepartments",
 COALESCE((SELECT jsonb_agg(jsonb_build_object('roleId',mr.role_id,'departmentId',mr.department_id) ORDER BY mr.role_id,mr.department_id) FROM church.member_roles mr WHERE mr.member_id=p.id),'[]') AS roles
 FROM church.member_profiles p LEFT JOIN church.users u ON u.id=p.id WHERE ${where}
 ORDER BY lower(public.unaccent(p.full_name)),p.id
 LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    )
  ).rows;
  return {
    items: rows.map((row) => ({ ...row, roles: roleSet(row) })),
    total,
    page: f.page,
    pageSize: f.pageSize,
    nextPage: f.page * f.pageSize < total ? f.page + 1 : undefined,
  };
}
const personnelPosition = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
const isPersonnelPosition = (value: string) =>
  /^(ban dieu hanh|truong ban|pho ban|thu ky|thu quy|uy vien|chap su|dac trach)(\s|$)/.test(
    personnelPosition(value),
  );
export async function listAssignedRoles(
  db: DB,
  actor: AuthUser,
  input: unknown = {},
) {
  const filter = z
    .object({
      q: z.string().trim().max(200).default(""),
      role: z
        .union([AccessRoleSchema, z.literal("specialist"), z.literal("")])
        .default(""),
      department: z.string().max(100).default(""),
      roles: z
        .string()
        .max(500)
        .default("")
        .transform((value) => (value ? value.split(",") : []))
        .pipe(
          z.array(z.union([AccessRoleSchema, z.literal("specialist")])).max(7),
        ),
      departments: z
        .string()
        .max(10000)
        .default("")
        .transform((value) => (value ? value.split(",") : []))
        .pipe(
          z
            .array(
              z
                .string()
                .regex(/^[a-z0-9-]+$/)
                .max(100),
            )
            .max(100),
        ),
      page: z.coerce.number().int().min(1).max(100000).optional(),
    })
    .strict()
    .parse(input);
  const limit = 24;
  const names = PERSONNEL_MINISTRY_NAMES.map((name) =>
    personnelPosition(name).replace(/[^a-z0-9]/g, ""),
  );
  admin(actor);
  const base = `WITH current_boards AS (
        SELECT DISTINCT ON (department_id) department_id,members
        FROM church.department_board_history
        WHERE year=extract(year FROM now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::int
        ORDER BY department_id,revision DESC
      ), memberships AS (
        SELECT user_id,department_id,position FROM church.department_members
        UNION
        SELECT user_id,department_id,'Ban điều hành' FROM church.department_managers
        UNION
        SELECT member_id,department_id,'Đặc trách' FROM church.personnel_missions WHERE kind='specialist'
        UNION
        SELECT (entry->>'id')::uuid,department_id,COALESCE(entry->>'position','Ban điều hành')
        FROM current_boards CROSS JOIN LATERAL jsonb_array_elements(members) entry
        UNION
        SELECT (entry->>'id')::uuid,department_id,'Ban điều hành'
        FROM current_boards CROSS JOIN LATERAL jsonb_array_elements(members) entry
      ), candidates AS (
      SELECT p.id,p.full_name AS name,p.email,p.phone,p.role_id AS role,
 EXISTS(SELECT 1 FROM church.users a WHERE a.id=p.id) AS "hasAccount",
 u.department_id AS "departmentId",
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'position',dm.position) ORDER BY d.name) FROM memberships dm JOIN church.departments d ON d.id=dm.department_id WHERE dm.user_id=p.id),'[]') AS memberships,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('roleId',mr.role_id,'departmentId',mr.department_id,'departmentName',d.name) ORDER BY mr.role_id,mr.department_id) FROM church.member_roles mr LEFT JOIN church.departments d ON d.id=mr.department_id WHERE mr.member_id=p.id),'[]') AS roles
 FROM church.member_profiles p LEFT JOIN church.users u ON u.id=p.id
 WHERE p.deleted_at IS NULL AND NOT p.is_test_account AND (
   p.role_id<>'user' OR EXISTS(SELECT 1 FROM church.member_roles mr WHERE mr.member_id=p.id AND mr.role_id<>'user')
   OR EXISTS(SELECT 1 FROM memberships dm JOIN church.departments d ON d.id=dm.department_id WHERE dm.user_id=p.id AND (
     public.unaccent(lower(trim(dm.position))) ~ '^(ban dieu hanh|truong ban|pho ban|thu ky|thu quy|uy vien|chap su|dac trach)([[:space:]]|$)'
     OR regexp_replace(public.unaccent(lower(d.name)),'[^a-z0-9]','','g')=ANY($1::text[])
   ))
 )
 )`;
  const prefixes: Record<string, string> = {
    board: "ban dieu hanh",
    leader: "truong ban",
    deacon: "chap su",
    secretary: "thu ky",
    specialist: "dac trach",
    admin: "admin",
    user: "user",
  };
  const selectedRoles = filter.roles.length
    ? filter.roles
    : filter.role
      ? [filter.role]
      : [];
  const selectedDepartments = filter.departments.length
    ? filter.departments
    : filter.department
      ? [filter.department]
      : [];
  const where = `($2::text='' OR public.unaccent(lower(concat_ws(' ',p.name,p.email,p.phone))) LIKE '%'||public.unaccent(lower($2))||'%')
    AND (
      (cardinality($3::text[])=0 AND cardinality($4::text[])=0)
      OR (cardinality($3::text[])>0 AND (
        p.role=ANY($3::text[])
        OR EXISTS(SELECT 1 FROM jsonb_array_elements(p.roles) r WHERE r->>'roleId'=ANY($3::text[]))
        OR EXISTS(SELECT 1 FROM jsonb_array_elements(p.memberships) m WHERE public.unaccent(lower(trim(m->>'position'))) LIKE ANY($5::text[]))
      ))
      OR (cardinality($4::text[])>0 AND (
        p."departmentId"=ANY($4::text[])
        OR EXISTS(SELECT 1 FROM jsonb_array_elements(p.roles) r WHERE r->>'departmentId'=ANY($4::text[]))
        OR EXISTS(SELECT 1 FROM jsonb_array_elements(p.memberships) m WHERE m->>'id'=ANY($4::text[]))
      ))
    )`;
  const params: unknown[] = [
    names,
    filter.q.replace(/[\\%_]/g, "\\$&"),
    selectedRoles,
    selectedDepartments,
    selectedRoles.map((role) => (prefixes[role] ?? role) + "%"),
  ];
  const total =
    !filter.page || filter.page === 1
      ? (
          await db.query(
            base +
              ` SELECT count(*)::int total FROM candidates p WHERE ${where}`,
            params,
          )
        ).rows[0].total
      : undefined;
  let pagination = "";
  if (filter.page) {
    params.push(limit + 1, (filter.page - 1) * limit);
    pagination = " LIMIT $6 OFFSET $7";
  }
  const result = await db.query(
    base +
      ` SELECT * FROM candidates p WHERE ${where} ORDER BY lower(public.unaccent(COALESCE(substring(p.name from '([^[:space:]]+)[[:space:]]*$'),''))),lower(public.unaccent(p.name)),p.id` +
      pagination,
    params,
  );
  const rows = filter.page ? result.rows.slice(0, limit) : result.rows;
  const items = rows.map((row) => {
    const roles = roleSet(row);
    const memberships = row.memberships as {
      id: string;
      name: string;
      position: string;
    }[];
    const departmentIds = [
      ...new Set([
        ...memberships.map((item) => item.id),
        ...roles
          .map((role) => role.departmentId)
          .filter((id): id is string => Boolean(id)),
      ]),
    ];
    const departmentNames = [
      ...new Set([
        ...memberships.map((item) => item.name),
        ...roles
          .map((role) => role.departmentName)
          .filter((name): name is string => Boolean(name)),
      ]),
    ];
    const personnelAssignments = memberships
      .filter((item) => isPersonnelPosition(item.position))
      .map((item) => ({
        role: item.position,
        departmentName: item.name as string | null,
      }));
    const roleKey = (label: string) => {
      const normalized = personnelPosition(label);
      if (normalized.startsWith("truong ban")) return "leader";
      if (normalized.startsWith("ban dieu hanh")) return "board";
      if (normalized.startsWith("chap su")) return "deacon";
      return normalized;
    };
    for (const held of roles) {
      const label = accessRoleLabels[held.roleId];
      const departmentName =
        held.departmentName ??
        memberships.find((item) => item.id === held.departmentId)?.name ??
        null;
      if (
        !personnelAssignments.some(
          (item) =>
            roleKey(item.role) === roleKey(label) &&
            (!departmentName || item.departmentName === departmentName),
        )
      ) {
        personnelAssignments.push({ role: label, departmentName });
      }
    }
    const uniqueAssignments = [
      ...new Map(
        personnelAssignments.map((item) => [
          `${roleKey(item.role)}:${item.departmentName ?? ""}`,
          item,
        ]),
      ).values(),
    ];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role as AccessRole,
      hasAccount: row.hasAccount,
      roles,
      personnelAssignments: prioritizePersonnelAssignments(uniqueAssignments),
      personnelRoles: [
        ...new Set([
          ...roles.map((role) => accessRoleLabels[role.roleId]),
          ...memberships
            .map((item) => item.position)
            .filter(isPersonnelPosition),
        ]),
      ],
      allDepartments: departmentNames,
      departmentId:
        roles.find((role) => role.departmentId)?.departmentId ??
        row.departmentId ??
        null,
      departmentIds,
      departmentNames,
      departmental: departmentIds.length > 0,
    };
  });
  return {
    items,
    total,
    nextPage:
      filter.page && result.rows.length > limit ? filter.page + 1 : undefined,
    departments:
      filter.page && filter.page > 1
        ? []
        : sortDepartments(
            (
              await db.query(
                "SELECT id,name FROM church.departments ORDER BY name",
              )
            ).rows,
          ),
  };
}
