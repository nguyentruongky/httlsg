import {
  leaderDepartments,
  boardDepartments,
  assignedDepartments,
} from "./leader-access";
import { z } from "zod";
import {
  DirectoryQuerySchema,
  hasHistoryManagementRole,
  canManageMemberHistory,
  isTeamScopedUser,
  DirectoryMemberSchema,
  MemberDetailInputSchema,
  NoteInputSchema,
  VisitInputSchema,
  type AuthUser,
  type DirectoryMember,
} from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { requirePermission } from "./session";
// Compatibility field for the existing client DTO only; no organization table exists.
export const DIRECTORY_ID = "10000000-0000-4000-8000-000000000001";
function granted(code: string) {
  return `EXISTS(SELECT 1 FROM church.role_permissions rp WHERE (rp.role_id=$2::text OR EXISTS(SELECT 1 FROM church.member_roles held WHERE held.member_id=$1::uuid AND held.role_id=rp.role_id)) AND rp.permission_id='${code}')`;
}
function familyScope(alias: string) {
  return `EXISTS(SELECT 1 FROM church.household_members mine JOIN church.household_members theirs ON theirs.household_id=mine.household_id WHERE mine.user_id=$1::uuid AND theirs.user_id=${alias}.id)`;
}
function leaderScope(alias: string) {
  return `EXISTS(SELECT 1 FROM church.department_members dm JOIN church.department_leaders managed ON managed.department_id=dm.department_id WHERE dm.user_id=${alias}.id AND managed.user_id=$1::uuid)`;
}
function boardScope(alias: string) {
  return `EXISTS(SELECT 1 FROM church.department_members dm JOIN church.department_managers managed ON managed.department_id=dm.department_id WHERE dm.user_id=${alias}.id AND managed.user_id=$1::uuid)`;
}
function held(role: string) {
  return `($2::text='${role}' OR EXISTS(SELECT 1 FROM church.member_roles r WHERE r.member_id=$1::uuid AND r.role_id='${role}'))`;
}
function rolePermission(role: string, permission: string) {
  return `EXISTS(SELECT 1 FROM church.role_permissions p WHERE p.role_id='${role}' AND p.permission_id='${permission}')`;
}
function managementScope(alias: string, write = false) {
  return `((${held("board")} AND ${rolePermission("board", write ? "members.write.department" : "members.read.all")} AND ${boardScope(alias)}) OR (${held("leader")} AND ${rolePermission("leader", write ? "members.write.department" : "members.read.department")} AND ${leaderScope(alias)}))`;
}
export function readScope(alias = "u") {
  return `(${alias}.id=$1::uuid OR (($2::text IN ('admin','secretary') OR ($2::text='deacon' AND NOT(${held("board")} OR ${held("leader")}))) AND ${granted("members.read.all")}) OR ($2::text='user' AND NOT(${held("board")} OR ${held("leader")}) AND ${granted("members.read.family")} AND ${familyScope(alias)}) OR ${managementScope(alias)})`;
}
export function listReadScope(actor: AuthUser, alias = "u") {
  return `(${readScope(alias)}${isTeamScopedUser(actor) ? ` AND ${managementScope(alias)}` : ""})`;
}
export function editScope(alias = "u") {
  return `(($2::text IN ('admin','secretary') AND ${granted("members.write.all")}) OR ($2::text='user' AND NOT(${held("board")} OR ${held("leader")}) AND ${granted("members.write.family")} AND (${alias}.id=$1::uuid OR ${familyScope(alias)})) OR ${managementScope(alias, true)})`;
}
const projection = (
  team = false,
  includeHistory = true,
) => `SELECT u.id,u.email,u.full_name,u.phone,u.role_id,u.enabled,u.date_of_birth,u.address,u.occupation,u.bio,u.area,u.location,u.church_status,u.faith_date,u.baptism_date,u.preferred_name,u.gender,u.household_role,u.source,u.is_test_account,u.version,u.created_at,u.updated_at,EXISTS(SELECT 1 FROM church.users account WHERE account.id=u.id AND account.password_hash IS NOT NULL) AS can_login, ${editScope()} AS can_edit,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'position',dm.position) ORDER BY d.name) FROM church.department_members dm JOIN church.departments d ON d.id=dm.department_id WHERE dm.user_id=u.id),'[]') departments,
 (SELECT jsonb_build_object('name','Gia đình','members',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',relative.id,'name',relative.full_name,'relationship',hm.relationship) ORDER BY relative.full_name,relative.id) FROM church.household_members hm JOIN church.member_profiles relative ON relative.id=hm.user_id AND relative.deleted_at IS NULL WHERE hm.household_id=mine.household_id AND hm.user_id<>u.id AND ${team ? "true" : `($2::text='leader' OR ${readScope("relative")})`}),'[]')) FROM church.household_members mine WHERE mine.user_id=u.id) family,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',n.id,'authorId',n.author_id,'authorName',COALESCE(a.full_name,''),'text',n.text,'createdAt',n.created_at) ORDER BY n.created_at DESC,n.id) FROM church.notes n LEFT JOIN church.member_profiles a ON a.id=n.author_id WHERE n.member_id=u.id AND ${includeHistory ? "u.id<>$1::uuid" : "false"}),'[]') notes,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',v.id,'authorId',v.author_id,'authorName',COALESCE(a.full_name,''),'visitedOn',to_char(v.visited_on,'YYYY-MM-DD'),'createdAt',v.created_at) ORDER BY v.visited_on DESC,v.created_at DESC,v.id) FROM church.visits v LEFT JOIN church.member_profiles a ON a.id=v.author_id WHERE v.member_id=u.id AND ${includeHistory ? "u.id<>$1::uuid" : "false"}),'[]') visits
 FROM church.member_profiles u`;
function date(v: unknown) {
  return v instanceof Date
    ? v.toISOString().slice(0, 10)
    : v
      ? String(v).slice(0, 10)
      : null;
}
function iso(v: unknown) {
  return new Date(String(v)).toISOString();
}
function memberDto(row: Record<string, any>): DirectoryMember {
  const restricted = Boolean(row.team_view) || row.actor_role === "leader";
  const accessRole = row.role_id;
  return DirectoryMemberSchema.parse({
    id: row.id,
    organizationId: DIRECTORY_ID,
    userId: row.id,
    role: ["admin", "secretary"].includes(accessRole)
      ? "admin"
      : accessRole === "board"
        ? "manager"
        : "member",
    accessRole,
    canLogin: row.can_login,
    canReadNotes: row.can_read_notes,
    canReadVisitHistory: row.can_read_notes,
    canEdit: row.team_view ? row.team_can_edit : row.can_edit,
    canManageLinks:
      !restricted && ["admin", "secretary"].includes(row.actor_role),
    familyDetailsRestricted: restricted,
    teamDepartmentIds: row.team_departments,
    familySummaries: restricted
      ? (row.family?.members ?? []).map((r: any) => ({
          name: r.name,
          relationship: r.relationship,
        }))
      : undefined,
    status: row.enabled ? "active" : "suspended",
    joinedAt: iso(row.created_at),
    user: {
      id: row.id,
      name: row.full_name,
      email: row.email,
      avatarUrl: null,
      createdAt: iso(row.created_at),
    },
    phone: row.phone,
    dateOfBirth: date(row.date_of_birth),
    address: row.address || null,
    occupation: row.occupation || null,
    bio: row.bio,
    version: row.version,
    area: row.area,
    location: row.location,
    position: "Ban viên",
    churchStatus: row.church_status,
    preferredName: row.preferred_name,
    gender: row.gender,
    householdRole: row.household_role,
    faithDate: date(row.faith_date),
    baptismDate: date(row.baptism_date),
    lastVisitDate: row.visits[0]?.visitedOn ?? null,
    source: row.source
      ? { ...row.source, ...(!row.can_read_notes ? { lastVisitDate: "" } : {}) }
      : undefined,
    membershipDateKnown: false,
    testAccount: row.is_test_account,
    departments: row.departments.map((d: any) => ({
      ...d,
      description: "",
      meeting: "",
      location: "",
      leader: "",
    })),
    family: restricted ? null : row.family,
    notes: row.notes.map((n: any) => ({
      ...n,
      organizationId: DIRECTORY_ID,
      memberId: row.id,
      authorId: n.authorId ?? row.id,
    })),
    visitHistory: row.visits.map((v: any) => ({
      ...v,
      organizationId: DIRECTORY_ID,
      memberId: row.id,
      source: v.authorId ? "user" : "import",
      summary: "",
    })),
  });
}
export async function getMember(
  db: DB,
  actor: AuthUser,
  id: string,
  team: boolean | "board" = false,
) {
  id = await canonicalMemberId(db, id);
  const assigned = !team && isTeamScopedUser(actor);
  const led = assigned
    ? await assignedDepartments(db, actor, true)
    : team
      ? await (team === "board"
          ? boardDepartments(db, actor)
          : leaderDepartments(db, actor))
      : actor.role === "leader"
        ? (
            await db.query(
              "SELECT department_id FROM church.department_leaders WHERE user_id=$1",
              [actor.id],
            )
          ).rows.map((row) => row.department_id as string)
        : undefined;
  z.uuid().parse(id);
  const result = await db.query(
    `${projection(Boolean(team || assigned), hasHistoryManagementRole(actor))} WHERE u.id=$3 AND u.deleted_at IS NULL AND ${readScope()}${team ? ` AND ${team === "board" ? boardScope("u") : leaderScope("u")}` : ""}`,
    [actor.id, actor.role, id],
  );
  if (!result.rowCount) throw new HttpError(404, "Không tìm thấy thành viên.");
  return memberDto({
    ...result.rows[0],
    actor_role: actor.role,
    can_read_notes: canManageMemberHistory(actor, id),
    team_view: Boolean(team || assigned),
    team_departments: led,
    team_can_edit: assigned
      ? result.rows[0].can_edit
      : actor.permissions.includes("members.write.department"),
  });
}
export async function listMembers(
  db: DB,
  actor: AuthUser,
  input: unknown,
  all = false,
  team: boolean | "board" = false,
) {
  const assigned = !team && isTeamScopedUser(actor);
  const led = assigned
    ? await assignedDepartments(db, actor, true)
    : team
      ? await (team === "board"
          ? boardDepartments(db, actor)
          : leaderDepartments(db, actor))
      : actor.role === "leader"
        ? (
            await db.query(
              "SELECT department_id FROM church.department_leaders WHERE user_id=$1",
              [actor.id],
            )
          ).rows.map((row) => row.department_id as string)
        : undefined;
  const q = DirectoryQuerySchema.parse(input);
  const values: unknown[] = [actor.id, actor.role];
  const conditions = [
    "u.deleted_at IS NULL",
    listReadScope(actor),
    ...(team ? [team === "board" ? boardScope("u") : leaderScope("u")] : []),
  ];
  if (!all) conditions.push("NOT u.is_test_account");
  const bind = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  if (q.search.trim()) {
    const p = bind(q.search.trim().replace(/[\\%_]/g, "\\$&"));
    conditions.push(
      `public.unaccent(lower(concat_ws(' ',u.full_name,u.email,u.phone,u.preferred_name,u.area,u.location,(SELECT string_agg(d.name,' ') FROM church.department_members dm JOIN church.departments d ON d.id=dm.department_id WHERE dm.user_id=u.id)))) ILIKE '%'||public.unaccent(lower(${p}::text))||'%'`,
    );
  }
  if (q.departmentIds.length)
    conditions.push(
      `EXISTS(SELECT 1 FROM church.department_members dm WHERE dm.user_id=u.id AND dm.department_id=ANY(${bind(q.departmentIds)}::text[]))`,
    );
  if (q.area !== "all") conditions.push(`u.area=${bind(q.area)}`);
  if (q.location !== "all") conditions.push(`u.location=${bind(q.location)}`);
  if (q.ageUnknownOnly) conditions.push("u.date_of_birth IS NULL");
  else {
    if (q.minAge !== null)
      conditions.push(
        `EXTRACT(YEAR FROM age(CURRENT_DATE,u.date_of_birth))>=${bind(q.minAge)}`,
      );
    if (q.maxAge !== null)
      conditions.push(
        `EXTRACT(YEAR FROM age(CURRENT_DATE,u.date_of_birth))<=${bind(q.maxAge)}`,
      );
  }
  const where = conditions.join(" AND ");
  const count = await db.query(
    `SELECT count(*)::integer total FROM church.member_profiles u WHERE ${where}`,
    values,
  );
  const limit = all
    ? ""
    : ` LIMIT ${bind(q.pageSize)} OFFSET ${bind((q.page - 1) * q.pageSize)}`;
  const result = await db.query(
    `${projection(Boolean(team || assigned), hasHistoryManagementRole(actor))} WHERE ${where} ORDER BY lower(public.unaccent(COALESCE(substring(u.full_name from '([^[:space:]]+)[[:space:]]*$'),''))),lower(public.unaccent(u.full_name)),u.id${limit}`,
    values,
  );
  return {
    items: result.rows.map((row) =>
      memberDto({
        ...row,
        actor_role: actor.role,
        can_read_notes: canManageMemberHistory(actor, row.id),
        team_view: Boolean(team || assigned),
        team_departments: led,
        team_can_edit: assigned
          ? row.can_edit
          : actor.permissions.includes("members.write.department"),
      }),
    ),
    total: count.rows[0].total,
    nextPage:
      !all && q.page * q.pageSize < count.rows[0].total
        ? q.page + 1
        : undefined,
  };
}
async function editable(
  db: DB,
  actor: AuthUser,
  id: string,
  team: boolean | "board" = false,
) {
  const member = await getMember(db, actor, id, team);
  if (!member.canEdit)
    throw new HttpError(403, "Bạn không có quyền chỉnh sửa hồ sơ này.");
  await db.query(
    "SELECT id FROM church.member_profiles WHERE id=$1 FOR UPDATE",
    [id],
  );
  return member;
}
export async function audit(
  db: DB,
  actor: AuthUser,
  subject: string,
  action: string,
) {
  await db.query(
    "INSERT INTO church.audit_log(actor_id,subject_id,action) VALUES($1,$2,$3)",
    [actor.id, subject, action],
  );
}
function sorted(values: string[]) {
  return [...values].sort().join("|");
}
export async function updateMember(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
  team: boolean | "board" = false,
) {
  const canonical = await canonicalMemberId(db, id);
  if (canonical !== id.toLowerCase())
    throw new HttpError(409, "Hồ sơ đã được hợp nhất. Vui lòng tải lại hồ sơ.");
  id = canonical;
  const request = z
    .object({
      values: MemberDetailInputSchema.strict(),
      version: z.number().int().nonnegative(),
    })
    .strict()
    .parse(input);
  const target = await editable(db, actor, id, team),
    f = request.values;
  if (target.version !== request.version)
    throw new HttpError(
      409,
      "Hồ sơ đã thay đổi. Vui lòng tải lại trước khi lưu.",
    );
  const restricted = team || target.familyDetailsRestricted;
  const led = restricted
    ? await (!team && isTeamScopedUser(actor)
        ? assignedDepartments(db, actor, true)
        : team === "board"
          ? boardDepartments(db, actor, "members.write.department")
          : leaderDepartments(db, actor, "members.write.department"))
    : null;
  if (led) {
    for (const d of target.departments)
      if (
        !led.includes(d.id) &&
        (f.departmentRoles?.[d.id] ?? "") !==
          (d.position === "Chưa cập nhật" ? "" : d.position)
      )
        throw new HttpError(
          403,
          "Bạn chỉ được sửa vai trò trong Ban ngành phụ trách.",
        );
  }
  const links = !restricted && actor.permissions.includes("families.manage");
  const familyChanged =
    sorted(f.familyMembers.map((x) => `${x.id}:${x.relationship}`)) !==
    sorted(
      target.family?.members.map((x) => `${x.id}:${x.relationship}`) ?? [],
    );
  const departmentsChanged =
    sorted(f.departmentIds) !== sorted(target.departments.map((d) => d.id));
  if (!links && (familyChanged || departmentsChanged))
    throw new HttpError(
      403,
      "Bạn không có quyền thay đổi liên kết gia đình hoặc Ban ngành.",
    );
  // Ordinary profile edits can never write application roles, board scopes, credentials, or account enablement.
  await db.query(
    `UPDATE church.member_profiles SET full_name=$2,email=$3,phone=$4,date_of_birth=$5,address=$6,occupation=$7,bio=$8,area=$9,location=$10,faith_date=$11,baptism_date=$12,preferred_name=$13,gender=$14,household_role=$15,church_status=$16,version=version+1 WHERE id=$1`,
    [
      id,
      f.name,
      f.email || null,
      f.phone || null,
      f.dateOfBirth || null,
      f.address,
      f.occupation,
      f.bio,
      f.area || null,
      f.location || null,
      f.faithDate || null,
      f.baptismDate || null,
      f.preferredName ?? "",
      f.gender ?? "",
      f.householdRole ?? "",
      f.churchStatus || null,
    ],
  );
  if (links) {
    await db.query(
      "DELETE FROM church.department_members WHERE user_id=$1 AND NOT(department_id=ANY($2::text[]))",
      [id, f.departmentIds],
    );
  }
  for (const department of f.departmentIds) {
    if (led && !led.includes(department)) continue;
    await db.query(
      `INSERT INTO church.department_members(user_id,department_id,position) VALUES($1,$2,$3) ON CONFLICT(department_id,user_id) DO UPDATE SET position=EXCLUDED.position`,
      [id, department, f.departmentRoles?.[department] ?? ""],
    );
  }
  if (links && familyChanged) await updateFamily(db, id, f.familyMembers);
  await audit(db, actor, id, "Đã cập nhật hồ sơ thành viên");
  return getMember(db, actor, id, team);
}
async function updateFamily(
  db: DB,
  id: string,
  relatives: { id: string; relationship: string }[],
) {
  const ids = [id, ...relatives.map((x) => x.id)];
  const valid = await db.query(
    "SELECT id FROM church.member_profiles WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL",
    [ids],
  );
  if (valid.rowCount !== ids.length || new Set(ids).size !== ids.length)
    throw new HttpError(400, "Liên kết gia đình không hợp lệ.");
  const current = await db.query(
    "SELECT household_id,relationship FROM church.household_members WHERE user_id=$1",
    [id],
  );
  const household =
    current.rows[0]?.household_id ??
    (
      await db.query(
        "INSERT INTO church.households DEFAULT VALUES RETURNING id",
      )
    ).rows[0].id;
  // Removing a relative changes only this household; it never deletes the person's profile.
  const affected = await db.query(
    "SELECT user_id FROM church.household_members WHERE household_id=$1 OR user_id=ANY($2::uuid[])",
    [household, ids],
  );
  await db.query(
    "UPDATE church.member_profiles SET version=version+1 WHERE id=ANY($1::uuid[]) AND id<>$2",
    [[...new Set([...affected.rows.map((row) => row.user_id), ...ids])], id],
  );
  await db.query(
    "DELETE FROM church.household_members WHERE household_id=$1 AND NOT(user_id=ANY($2::uuid[]))",
    [household, ids],
  );
  for (const r of [
    { id, relationship: current.rows[0]?.relationship ?? "Thành viên" },
    ...relatives,
  ])
    await db.query(
      `INSERT INTO church.household_members(user_id,household_id,relationship) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET household_id=EXCLUDED.household_id,relationship=EXCLUDED.relationship`,
      [r.id, household, r.relationship],
    );
}
export async function addHistory(
  db: DB,
  actor: AuthUser,
  id: string,
  kind: "notes" | "visits",
  input: unknown,
) {
  id = await canonicalMemberId(db, id);
  if (!canManageMemberHistory(actor, id))
    throw new HttpError(
      403,
      "Chỉ người quản lý có quyền thêm ghi chú và lịch sử thăm viếng cho thành viên khác.",
    );
  await editable(db, actor, id);
  if (kind === "notes") {
    const f = NoteInputSchema.parse(input);
    await db.query(
      "INSERT INTO church.notes(member_id,author_id,text) VALUES($1,$2,$3)",
      [id, actor.id, f.text],
    );
  } else {
    const f = VisitInputSchema.pick({ visitedOn: true }).strict().parse(input);
    await db.query(
      "INSERT INTO church.visits(member_id,author_id,visited_on) VALUES($1,$2,$3)",
      [id, actor.id, f.visitedOn],
    );
  }
  await audit(
    db,
    actor,
    id,
    kind === "notes" ? "Đã thêm ghi chú" : "Đã thêm lần thăm viếng",
  );
  return { ok: true };
}
export async function deleteMember(db: DB, actor: AuthUser, id: string) {
  const canonical = await canonicalMemberId(db, id);
  if (canonical !== id.toLowerCase())
    throw new HttpError(
      409,
      "Hồ sơ đã được hợp nhất. Vui lòng tải lại danh sách.",
    );
  id = canonical;
  requirePermission(actor, "members.delete");
  if (id === actor.id)
    throw new HttpError(400, "Không thể xóa tài khoản đang đăng nhập.");
  await editable(db, actor, id);
  await db.query(
    "UPDATE church.member_profiles SET deleted_at=now(),enabled=false WHERE id=$1",
    [id],
  );
  await db.query(
    "UPDATE church.sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
    [id],
  );
  await audit(db, actor, id, "Đã xóa thành viên");
  return { ok: true };
}

export async function directoryFilters(db: DB, actor: AuthUser) {
  const scope = `u.deleted_at IS NULL AND NOT u.is_test_account AND ${listReadScope(actor)}`;
  const values = [actor.id, actor.role];
  const { rows } = await db.query(
    `SELECT COALESCE(array_agg(DISTINCT u.area ORDER BY u.area) FILTER(WHERE u.area IS NOT NULL),'{}') areas, COALESCE(array_agg(DISTINCT u.location ORDER BY u.location) FILTER(WHERE u.location IS NOT NULL),'{}') locations FROM church.member_profiles u WHERE ${scope}`,
    values,
  );
  const ids = isTeamScopedUser(actor)
    ? await assignedDepartments(db, actor)
    : null;
  const departments = await db.query(
    `SELECT d.id,d.name FROM church.departments d WHERE ${ids ? "d.id=ANY($1::text[])" : "true"} ORDER BY d.name`,
    ids ? [ids] : [],
  );
  return {
    departments: departments.rows,
    areas: rows[0].areas,
    locations: rows[0].locations,
  };
}

export async function canonicalMemberId(db: DB, id: string) {
  const parsed = z.uuid().parse(id).toLowerCase();
  const alias = await db.query(
    "SELECT target_id FROM church.profile_merges WHERE source_id=$1",
    [parsed],
  );
  return (alias.rows[0]?.target_id as string | undefined) ?? parsed;
}
