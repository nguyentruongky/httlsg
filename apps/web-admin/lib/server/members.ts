import { personnelMemberScope } from "./personnel-scope";
import { directoryMemberScope } from "./member-visibility";
import { assignedDepartments } from "./leader-access";
import { z } from "zod";
import {
  departments as departmentCatalog,
  DirectoryQuerySchema,
  hasHistoryManagementRole,
  canManageMemberHistory,
  canReadMemberHistory,
  isTeamScopedUser,
  DirectoryMemberSchema,
  MemberDetailInputSchema,
  memberDetailValues,
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
export function departmentMemberScope(alias = "u") {
  return `EXISTS(SELECT 1 FROM church.department_members scoped_member WHERE scoped_member.user_id=${alias}.id AND scoped_member.department_id IN (
    SELECT department_id FROM church.department_members WHERE user_id=$1::uuid
    UNION SELECT department_id FROM church.department_managers WHERE user_id=$1::uuid
    UNION SELECT department_id FROM church.department_leaders WHERE user_id=$1::uuid))`;
}
export function readScope(alias = "u") {
  return `($2::text IN ('admin','secretary','deacon') OR ${alias}.id=$1::uuid OR ${departmentMemberScope(alias)}
    OR EXISTS(SELECT 1 FROM church.household_members family_target JOIN church.household_members family_member ON family_member.household_id=family_target.household_id
      JOIN church.member_profiles family_profile ON family_profile.id=family_member.user_id AND family_profile.deleted_at IS NULL
      WHERE family_target.user_id=${alias}.id AND (family_profile.id=$1::uuid OR ${departmentMemberScope("family_profile")})))`;
}
export function listReadScope(actor: AuthUser, alias = "u") {
  return isTeamScopedUser(actor)
    ? `(${departmentMemberScope(alias)} AND $2::text IS NOT NULL)`
    : readScope(alias);
}
export function editScope(alias = "u") {
  return `($2::text IN ('admin','secretary','deacon') OR ${alias}.id=$1::uuid OR ${departmentMemberScope(alias)})`;
}
const projection = (
  _team = false,
  includeHistory = true,
  includeStatusHistory = false,
) => `SELECT u.id,u.email,u.full_name,u.phone,u.role_id,u.enabled,u.date_of_birth,u.address,u.occupation,u.bio,u.area,u.location,u.church_status,u.faith_date,u.baptism_date,u.preferred_name,u.gender,u.household_role,u.source,u.is_test_account,u.version,u.created_at,u.updated_at,EXISTS(SELECT 1 FROM church.users account WHERE account.id=u.id AND account.password_hash IS NOT NULL) AS can_login, ${editScope()} AS can_edit,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'position',dm.position) ORDER BY d.name) FROM church.department_members dm JOIN church.departments d ON d.id=dm.department_id WHERE dm.user_id=u.id),'[]') departments,
 (SELECT jsonb_build_object('name','Gia đình','members',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',relative.id,'name',relative.full_name,'relationship',hm.relationship) ORDER BY relative.full_name,relative.id) FROM church.household_members hm JOIN church.member_profiles relative ON relative.id=hm.user_id AND relative.deleted_at IS NULL WHERE hm.household_id=mine.household_id AND hm.user_id<>u.id AND ${readScope("relative")}),'[]')) FROM church.household_members mine WHERE mine.user_id=u.id) family,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',n.id,'authorId',n.author_id,'authorName',COALESCE(a.full_name,''),'text',n.text,'visibility',n.visibility,'createdAt',n.created_at) ORDER BY n.created_at DESC,n.id) FROM church.notes n LEFT JOIN church.member_profiles a ON a.id=n.author_id WHERE n.member_id=u.id AND (n.visibility='public' OR n.author_id=$1::uuid) AND ${includeHistory ? "u.id<>$1::uuid" : "false"}),'[]') notes,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',v.id,'authorId',v.author_id,'authorName',COALESCE(a.full_name,''),'visitedOn',to_char(v.visited_on,'YYYY-MM-DD'),'createdAt',v.created_at) ORDER BY v.visited_on DESC,v.created_at DESC,v.id) FROM church.visits v LEFT JOIN church.member_profiles a ON a.id=v.author_id WHERE v.member_id=u.id AND ${includeHistory ? "u.id<>$1::uuid" : "false"}),'[]') visits
 ,u.chuyen_hoi_den,
 (SELECT to_char(v.visited_on,'YYYY-MM-DD') FROM church.visits v WHERE v.member_id=u.id ORDER BY v.visited_on DESC,v.created_at DESC,v.id DESC LIMIT 1) last_visit_date,
 (SELECT h.previous_status FROM church.member_church_status_history h WHERE h.member_id=u.id ORDER BY h.changed_at DESC,h.id DESC LIMIT 1) previous_church_status,
 ${includeStatusHistory ? "COALESCE((SELECT jsonb_agg(jsonb_build_object('status',h.new_status,'time',h.changed_at) ORDER BY h.changed_at DESC,h.id DESC) FROM church.member_church_status_history h WHERE h.member_id=u.id),'[]'::jsonb)" : "'[]'::jsonb"} status_history
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
  const restricted = Boolean(row.team_view);
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
      !restricted && ["admin", "secretary", "deacon"].includes(row.actor_role),
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
    historyLoaded: row.history_loaded !== false,
    churchStatus: row.church_status,
    chuyenHoiDen: row.chuyen_hoi_den,
    previousChurchStatus: row.previous_church_status,
    statusHistory: (row.status_history ?? [])
      .slice()
      .reverse()
      .filter(
        (
          entry: { status: string | null },
          index: number,
          entries: { status: string | null }[],
        ) => index === 0 || entry.status !== entries[index - 1].status,
      )
      .reverse(),
    preferredName: row.preferred_name,
    gender: row.gender,
    householdRole: row.household_role,
    faithDate: date(row.faith_date),
    baptismDate: date(row.baptism_date),
    lastVisitDate: row.can_read_notes
      ? (date(row.last_visit_date) ?? row.visits[0]?.visitedOn ?? null)
      : null,
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
  _team: boolean | "board" = false,
  includeHistory = true,
) {
  id = await canonicalMemberId(db, id);
  const assigned = isTeamScopedUser(actor);
  const led = assigned ? await assignedDepartments(db, actor, true) : undefined;
  z.uuid().parse(id);
  const result = await db.query(
    `${projection(false, includeHistory && hasHistoryManagementRole(actor), true)} WHERE u.id=$3 AND u.deleted_at IS NULL AND ${readScope()}`,
    [actor.id, actor.role, id],
  );
  if (!result.rowCount) throw new HttpError(404, "Không tìm thấy thành viên.");
  return memberDto({
    ...result.rows[0],
    actor_role: actor.role,
    history_loaded: includeHistory,
    can_read_notes: canReadMemberHistory(actor, id),
    team_view: false,
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
  _team: boolean | "board" = false,
) {
  const assigned = isTeamScopedUser(actor);
  const led = assigned ? await assignedDepartments(db, actor, true) : undefined;
  const q = DirectoryQuerySchema.parse(input);
  const values: unknown[] = [actor.id, actor.role];
  const conditions = ["u.deleted_at IS NULL", listReadScope(actor)];
  conditions.push(directoryMemberScope("u", q.search, q.churchStatuses));
  if (q.personnelOnly) conditions.push(personnelMemberScope("u"));
  if (!all) conditions.push("NOT u.is_test_account");
  const bind = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  if (q.search.trim()) {
    const p = bind(q.search.trim().replace(/[\\%_]/g, "\\$&"));
    conditions.push(
      `public.unaccent(lower(concat_ws(' ',u.full_name,u.email,u.phone,u.church_status,u.preferred_name,u.area,u.location,(SELECT string_agg(d.name,' ') FROM church.department_members dm JOIN church.departments d ON d.id=dm.department_id WHERE dm.user_id=u.id)))) ILIKE '%'||public.unaccent(lower(${p}::text))||'%'`,
    );
  }
  if (q.departmentIds.length)
    conditions.push(
      `EXISTS(SELECT 1 FROM church.department_members dm WHERE dm.user_id=u.id AND dm.department_id=ANY(${bind(q.departmentIds)}::text[]))`,
    );
  if (q.areas?.length) conditions.push(`u.area=ANY(${bind(q.areas)}::text[])`);
  else if (q.area !== "all") conditions.push(`u.area=${bind(q.area)}`);
  if (q.locations?.length)
    conditions.push(`u.location=ANY(${bind(q.locations)}::text[])`);
  else if (q.location !== "all")
    conditions.push(`u.location=${bind(q.location)}`);
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
    `${projection(false, false)} WHERE ${where} ORDER BY lower(public.unaccent(COALESCE(substring(u.full_name from '([^[:space:]]+)[[:space:]]*$'),''))),lower(public.unaccent(u.full_name)),u.id${limit}`,
    values,
  );
  return {
    items: result.rows.map((row) =>
      memberDto({
        ...row,
        actor_role: actor.role,
        can_read_notes: canReadMemberHistory(actor, row.id),
        team_view: false,
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
  _team: boolean | "board" = false,
) {
  const canonical = await canonicalMemberId(db, id);
  if (canonical !== id.toLowerCase())
    throw new HttpError(409, "Hồ sơ đã được hợp nhất. Vui lòng tải lại hồ sơ.");
  id = canonical;
  const request = z
    .object({
      values: z
        .object(MemberDetailInputSchema.shape)
        .partial()
        .strict()
        .refine(
          (values) => Object.keys(values).length > 0,
          "Chọn thông tin cần cập nhật.",
        ),
      version: z.number().int().nonnegative(),
    })
    .strict()
    .parse(input);
  const target = await editable(db, actor, id);
  if (target.version !== request.version)
    throw new HttpError(
      409,
      "Hồ sơ đã thay đổi. Vui lòng tải lại trước khi lưu.",
    );
  const f = MemberDetailInputSchema.parse({
    ...memberDetailValues(target),
    ...request.values,
  });
  const previousStatusChanged =
    request.values.previousChurchStatus !== undefined &&
    (request.values.previousChurchStatus || null) !==
      (target.previousChurchStatus ?? null);
  const currentStatusChanged =
    (f.churchStatus || null) !== (target.churchStatus ?? null);
  if (previousStatusChanged && !currentStatusChanged && !f.churchStatus)
    throw new HttpError(
      400,
      "Cập nhật tình trạng hiện tại trước khi sửa tình trạng trước đó.",
    );
  const led = isTeamScopedUser(actor)
    ? await assignedDepartments(db, actor, true)
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
  if (f.departmentIds.length) {
    const valid = await db.query(
      "SELECT id FROM church.departments WHERE id=ANY($1::text[])",
      [f.departmentIds],
    );
    if (valid.rowCount !== new Set(f.departmentIds).size)
      throw new HttpError(400, "Ban ngành không hợp lệ.");
  }
  const links =
    ["admin", "secretary", "deacon"].includes(actor.role) ||
    actor.permissions.includes("families.manage");
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
    `UPDATE church.member_profiles SET full_name=$2,email=$3,phone=$4,date_of_birth=$5,address=$6,occupation=$7,bio=$8,area=$9,location=$10,faith_date=$11,baptism_date=$12,preferred_name=$13,gender=$14,household_role=$15,church_status=$16,chuyen_hoi_den=$17,version=version+1 WHERE id=$1`,
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
      f.chuyenHoiDen || null,
    ],
  );
  if (currentStatusChanged) {
    await db.query(
      `INSERT INTO church.member_church_status_history(member_id,previous_status,new_status,destination,changed_by) VALUES($1,$2,$3,$4,$5)`,
      [
        id,
        target.churchStatus,
        f.churchStatus || null,
        f.chuyenHoiDen || null,
        actor.id,
      ],
    );
  } else if (previousStatusChanged && f.churchStatus) {
    await db.query(
      `INSERT INTO church.member_church_status_history(member_id,previous_status,new_status,destination,changed_by)
       VALUES($1,$2,$3,$4,$5)`,
      [
        id,
        f.previousChurchStatus || null,
        f.churchStatus,
        f.chuyenHoiDen || null,
        actor.id,
      ],
    );
    await audit(db, actor, id, "Đã sửa tình trạng trước đó của thành viên");
  }
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
  return getMember(db, actor, id);
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
      "INSERT INTO church.notes(member_id,author_id,text,visibility) VALUES($1,$2,$3,$4)",
      [id, actor.id, f.text, f.visibility],
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
export async function deleteHistory(
  db: DB,
  actor: AuthUser,
  id: string,
  kind: "notes" | "visits",
  entryId: string,
) {
  z.uuid().parse(entryId);
  id = await canonicalMemberId(db, id);
  if (!canManageMemberHistory(actor, id))
    throw new HttpError(403, "Bạn không có quyền xóa lịch sử thành viên này.");
  await editable(db, actor, id);
  const result =
    kind === "notes"
      ? await db.query(
          "DELETE FROM church.notes WHERE id=$1 AND member_id=$2 AND (visibility='public' OR author_id=$3) RETURNING id",
          [entryId, id, actor.id],
        )
      : await db.query(
          "DELETE FROM church.visits WHERE id=$1 AND member_id=$2 RETURNING id",
          [entryId, id],
        );
  if (!result.rowCount) throw new HttpError(404, "Không tìm thấy mục cần xóa.");
  await audit(
    db,
    actor,
    id,
    kind === "notes" ? "Đã xóa ghi chú" : "Đã xóa lần thăm viếng",
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
  return {
    departments: ids
      ? departmentCatalog.filter((item) => ids.includes(item.id))
      : departmentCatalog,
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
