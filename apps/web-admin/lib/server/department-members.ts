import { boardExpressions } from "./department-board-sql";
import { z } from "zod";
import { DepartmentMembershipBulkInput, type AuthUser } from "@org/core";
import type { DB } from "./db";
import { requirePermission, isAdministrativeRead } from "./session";
import { HttpError } from "./http";
import { audit, canonicalMemberId } from "./members";
function authorize(actor: AuthUser) {
  if (
    !isAdministrativeRead(actor) &&
    !["admin", "secretary"].includes(actor.role)
  )
    throw new HttpError(
      403,
      "Chỉ Admin và Thư ký được quản lý thành viên Ban ngành.",
    );
  requirePermission(actor, "departments.manage");
}
async function department(db: DB, id: string) {
  z.string()
    .regex(/^[a-z0-9-]+$/)
    .max(100)
    .parse(id);
  if (
    !(await db.query("SELECT 1 FROM church.departments WHERE id=$1", [id]))
      .rowCount
  )
    throw new HttpError(404, "Không tìm thấy Ban ngành.");
}
const Query = z
  .object({
    q: z.string().trim().max(100).default(""),
    mode: z.enum(["members", "available", "all", "board"]).default("members"),
    year: z.coerce.number().int().min(1900).max(2200).optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    summary: z.enum(["0", "1"]).default("1"),
    pageSize: z.coerce.number().int().min(1).max(50).default(25),
  })
  .strict();
export async function listDepartmentMembers(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
) {
  authorize(actor);
  await department(db, id);
  const f = Query.parse(input);
  if (["available", "all"].includes(f.mode) && !f.q)
    return { items: [], total: 0, nextPage: null };
  const year =
    f.year ??
    Number(
      new Intl.DateTimeFormat("en", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
      }).format(new Date()),
    );
  const params: unknown[] = [id, year];
  const board = boardExpressions("$2::int");
  let where =
    "p.deleted_at IS NULL AND NOT p.is_test_account AND EXISTS(SELECT 1 FROM church.departments d WHERE d.id=$1) AND $2::int BETWEEN 1900 AND 2200";
  if (f.mode !== "all")
    where +=
      " AND " +
      (f.mode === "available" ? "NOT " : "") +
      "EXISTS(SELECT 1 FROM church.department_members dm WHERE dm.user_id=p.id AND dm.department_id=$1)";
  if (f.mode === "board" && !f.q) where += " AND " + board.isBoard;
  if (f.q) {
    params.push(f.q.replace(/[\\%_]/g, "\\$&"));
    where +=
      " AND public.unaccent(lower(concat_ws(' ',p.full_name,p.email,p.phone))) ILIKE '%'||public.unaccent(lower($3::text))||'%'";
  }
  const total =
    f.summary === "1"
      ? (
          await db.query(
            "SELECT count(*)::int total FROM church.member_profiles p WHERE " +
              where,
            params,
          )
        ).rows[0].total
      : undefined;
  params.push(f.pageSize + 1, (f.page - 1) * f.pageSize);
  const items = (
    await db.query(
      'SELECT p.id,p.full_name name,p.phone,p.email,p.church_status AS "churchStatus",' +
        'EXISTS(SELECT 1 FROM church.department_members dm WHERE dm.user_id=p.id AND dm.department_id=$1) AS "isMember",' +
        board.isBoard +
        ' AS "isBoardMember",' +
        board.position +
        " position " +
        "FROM church.member_profiles p WHERE " +
        where +
        " ORDER BY lower(public.unaccent(COALESCE(substring(p.full_name from '([^[:space:]]+)[[:space:]]*$'),''))),lower(public.unaccent(p.full_name)),p.id" +
        " LIMIT $" +
        (params.length - 1) +
        " OFFSET $" +
        params.length,
      params,
    )
  ).rows;
  return {
    items: items.slice(0, f.pageSize),
    total,
    nextPage: items.length > f.pageSize ? f.page + 1 : null,
  };
}
export async function changeDepartmentMember(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
  add: boolean,
) {
  authorize(actor);
  await department(db, id);
  const f = z.object({ memberId: z.uuid() }).strict().parse(input);
  const canonical = await canonicalMemberId(db, f.memberId);
  if (canonical !== f.memberId.toLowerCase())
    throw new HttpError(
      409,
      "Hồ sơ đã được hợp nhất. Vui lòng tìm lại thành viên.",
    );
  const profile = await db.query(
    "SELECT 1 FROM church.member_profiles WHERE id=$1 AND deleted_at IS NULL AND NOT is_test_account FOR UPDATE",
    [canonical],
  );
  if (!profile.rowCount) throw new HttpError(404, "Không tìm thấy thành viên.");
  const result = add
    ? await db.query(
        "INSERT INTO church.department_members(department_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING user_id",
        [id, canonical],
      )
    : await db.query(
        "DELETE FROM church.department_members WHERE department_id=$1 AND user_id=$2 RETURNING user_id",
        [id, canonical],
      );
  if (result.rowCount) {
    await db.query(
      "UPDATE church.member_profiles SET version=version+1 WHERE id=$1",
      [canonical],
    );
    await db.query("SELECT pg_notify('church_team_events',$1)", [
      JSON.stringify({ department_id: id, kind: "members" }),
    ]);
    await audit(
      db,
      actor,
      canonical,
      (add ? "Thêm vào" : "Gỡ khỏi") + " Ban ngành " + id,
    );
  }
  return { ok: true };
}

/** Runs inside withActor's transaction: no partially applied batch is returned. */
export async function changeDepartmentMembers(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
) {
  authorize(actor);
  await department(db, id);
  const f = DepartmentMembershipBulkInput.parse(input);
  const ids = f.memberIds.map((memberId) => memberId.toLowerCase());
  if (f.action === "move") {
    if (f.targetDepartmentId === id)
      throw new HttpError(400, "Vui lòng chọn Ban ngành khác.");
    await department(db, f.targetDepartmentId);
  }
  const aliases = await db.query(
    "SELECT 1 FROM church.profile_merges WHERE source_id=ANY($1::uuid[]) LIMIT 1",
    [ids],
  );
  if (aliases.rowCount)
    throw new HttpError(
      409,
      "Có hồ sơ đã được hợp nhất. Vui lòng tải lại danh sách.",
    );
  const profiles = await db.query(
    "SELECT id FROM church.member_profiles WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL AND NOT is_test_account ORDER BY id FOR UPDATE",
    [ids],
  );
  if (profiles.rowCount !== ids.length)
    throw new HttpError(
      404,
      "Có thành viên không còn khả dụng. Vui lòng tải lại danh sách.",
    );
  const changed = new Set<string>();
  if (f.action === "status") {
    const missing = await db.query(
      "SELECT id FROM church.member_profiles p WHERE p.id=ANY($1::uuid[]) AND NOT EXISTS(SELECT 1 FROM church.department_members dm WHERE dm.user_id=p.id AND dm.department_id=$2)",
      [ids, id],
    );
    if (missing.rowCount)
      throw new HttpError(
        409,
        "Có hồ sơ không còn thuộc Ban ngành. Vui lòng tải lại danh sách.",
      );
    const updated = await db.query(
      `WITH previous AS (
         SELECT id,church_status FROM church.member_profiles WHERE id=ANY($1::uuid[])
       ), updated AS (
         UPDATE church.member_profiles p SET church_status=$2,chuyen_hoi_den=$3
         FROM previous old WHERE p.id=old.id
         AND (p.church_status IS DISTINCT FROM $2 OR p.chuyen_hoi_den IS DISTINCT FROM $3)
         RETURNING p.id,old.church_status previous_status
       ), history AS (
         INSERT INTO church.member_church_status_history(member_id,previous_status,new_status,destination,changed_by)
         SELECT id,previous_status,$2,$3,$4::uuid FROM updated WHERE previous_status IS DISTINCT FROM $2
       ) SELECT id FROM updated`,
      [
        ids,
        f.status,
        f.status === "Chuyển hội" ? f.chuyenHoiDen || null : null,
        actor.id,
      ],
    );
    for (const row of updated.rows) changed.add(row.id);
  } else if (f.action === "move") {
    const missing = await db.query(
      "SELECT p.id FROM church.member_profiles p WHERE p.id=ANY($1::uuid[]) AND NOT EXISTS(SELECT 1 FROM church.department_members dm WHERE dm.user_id=p.id AND dm.department_id IN($2,$3))",
      [ids, id, f.targetDepartmentId],
    );
    if (missing.rowCount)
      throw new HttpError(
        409,
        "Danh sách thành viên đã thay đổi. Vui lòng tải lại trước khi chuyển.",
      );
    const added = await db.query(
      "INSERT INTO church.department_members(department_id,user_id) SELECT $1,unnest($2::uuid[]) ON CONFLICT DO NOTHING RETURNING user_id",
      [f.targetDepartmentId, ids],
    );
    const removed = await db.query(
      "DELETE FROM church.department_members WHERE department_id=$1 AND user_id=ANY($2::uuid[]) RETURNING user_id",
      [id, ids],
    );
    for (const row of [...added.rows, ...removed.rows])
      changed.add(row.user_id);
  } else {
    const result =
      f.action === "add"
        ? await db.query(
            "INSERT INTO church.department_members(department_id,user_id) SELECT $1,unnest($2::uuid[]) ON CONFLICT DO NOTHING RETURNING user_id",
            [id, ids],
          )
        : await db.query(
            "DELETE FROM church.department_members WHERE department_id=$1 AND user_id=ANY($2::uuid[]) RETURNING user_id",
            [id, ids],
          );
    for (const row of result.rows) changed.add(row.user_id);
  }
  if (changed.size) {
    await db.query(
      "UPDATE church.member_profiles SET version=version+1 WHERE id=ANY($1::uuid[])",
      [[...changed]],
    );
    for (const departmentId of f.action === "move"
      ? [id, f.targetDepartmentId]
      : [id])
      await db.query("SELECT pg_notify('church_team_events',$1)", [
        JSON.stringify({ department_id: departmentId, kind: "members" }),
      ]);
    for (const memberId of changed)
      await audit(
        db,
        actor,
        memberId,
        f.action === "move"
          ? "Chuyển Ban ngành " + id + " → " + f.targetDepartmentId
          : f.action === "status"
            ? "Cập nhật tình trạng thành viên Ban ngành " + id + ": " + f.status
            : (f.action === "add" ? "Thêm vào" : "Gỡ khỏi") +
              " Ban ngành " +
              id,
      );
  }
  return { ok: true, changedCount: changed.size };
}
