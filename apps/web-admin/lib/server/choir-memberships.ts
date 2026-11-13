import { currentMemberScope } from "./member-visibility";
import {
  CHOIR_DEPARTMENT_AGE_BANDS,
  choirDepartmentForAge,
  getAgeByYear,
  type AuthUser,
} from "@org/core";
import type { DB } from "./db";
import { z } from "zod";
import { HttpError } from "./http";
import { requirePermission } from "./session";
import { audit, canonicalMemberId, getMember } from "./members";

export function currentChurchYear(now = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
    }).format(now),
  );
}

export async function reassignChoirMemberships(db: DB, year: number) {
  if (!Number.isInteger(year) || year < 1900 || year > 2200)
    throw new RangeError("Invalid choir membership year.");
  const asOfDate = `${year}-03-01`;
  const ageBandIds = CHOIR_DEPARTMENT_AGE_BANDS.map(
    (band) => band.departmentId,
  );
  // Only update members who already belong to a choir department.
  const currentChoirMembers = (
    await db.query(
      `SELECT DISTINCT dm.user_id FROM church.department_members dm WHERE dm.department_id=ANY($1::text[])`,
      [ageBandIds],
    )
  ).rows;
  const choirMemberIds = new Set(currentChoirMembers.map((row) => row.user_id));
  const profiles = (
    await db.query(
      `SELECT id,date_of_birth,choir_assignment_manual FROM church.member_profiles p WHERE deleted_at IS NULL AND NOT is_test_account AND ${currentMemberScope("p")} ORDER BY id`,
    )
  ).rows;
  const assignments: { memberId: string; departmentId: string }[] = [];
  for (const profile of profiles) {
    if (profile.choir_assignment_manual || !choirMemberIds.has(profile.id))
      continue;
    const dateOfBirth = profile.date_of_birth
      ? String(profile.date_of_birth).slice(0, 10)
      : null;
    const age = getAgeByYear(dateOfBirth, year);
    if (age === null) continue;
    const departmentId = choirDepartmentForAge(age);
    if (departmentId) assignments.push({ memberId: profile.id, departmentId });
  }

  const memberIds = assignments.map((assignment) => assignment.memberId);
  const departmentIds = assignments.map(
    (assignment) => assignment.departmentId,
  );
  let removed: { user_id: string; department_id: string }[] = [];
  let added: { user_id: string; department_id: string }[] = [];
  if (assignments.length) {
    removed = (
      await db.query(
        `DELETE FROM church.department_members dm
         WHERE dm.user_id=ANY($1::uuid[])
           AND dm.department_id=ANY($3::text[])
           AND NOT EXISTS (
             SELECT 1 FROM unnest($1::uuid[],$2::text[]) AS target(user_id,department_id)
             WHERE target.user_id=dm.user_id AND target.department_id=dm.department_id
           )
         RETURNING dm.user_id,dm.department_id`,
        [memberIds, departmentIds, ageBandIds],
      )
    ).rows;
    added = (
      await db.query(
        `INSERT INTO church.department_members(department_id,user_id)
         SELECT target.department_id,target.user_id
         FROM unnest($1::uuid[],$2::text[]) AS target(user_id,department_id)
         ON CONFLICT DO NOTHING
         RETURNING user_id,department_id`,
        [memberIds, departmentIds],
      )
    ).rows;
  }
  const changedMemberIds = [
    ...new Set([...removed, ...added].map((row) => row.user_id)),
  ];
  const changedDepartments = [
    ...new Set([...removed, ...added].map((row) => row.department_id)),
  ];
  if (changedMemberIds.length)
    await db.query(
      "UPDATE church.member_profiles SET version=version+1 WHERE id=ANY($1::uuid[])",
      [changedMemberIds],
    );
  for (const departmentId of changedDepartments)
    await db.query("SELECT pg_notify('church_team_events',$1)", [
      JSON.stringify({ department_id: departmentId, kind: "members" }),
    ]);

  const departmentCounts = CHOIR_DEPARTMENT_AGE_BANDS.map((band) => ({
    departmentId: band.departmentId,
    memberCount: assignments.filter(
      (assignment) => assignment.departmentId === band.departmentId,
    ).length,
  }));
  return {
    asOfDate,
    updatedMemberCount: changedMemberIds.length,
    eligibleMemberCount: assignments.length,
    skippedMemberCount: profiles.length - assignments.length,
    departmentCounts,
  };
}

export async function setManualChoirMembership(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
) {
  if (!["admin", "secretary"].includes(actor.role))
    throw new HttpError(403, "Bạn không có quyền đổi Ban hát lễ.");
  requirePermission(actor, "departments.manage");
  z.uuid().parse(id);
  const fields = z
    .object({
      departmentId: z
        .string()
        .regex(/^[a-z0-9-]+$/)
        .max(100),
      version: z.number().int().nonnegative(),
    })
    .strict()
    .parse(input);
  if ((await canonicalMemberId(db, id)) !== id.toLowerCase())
    throw new HttpError(409, "Hồ sơ đã được hợp nhất. Vui lòng tải lại.");
  const profile = (
    await db.query(
      "SELECT version FROM church.member_profiles WHERE id=$1 AND deleted_at IS NULL FOR UPDATE",
      [id],
    )
  ).rows[0];
  if (!profile) throw new HttpError(404, "Không tìm thấy thành viên.");
  if (profile.version !== fields.version)
    throw new HttpError(
      409,
      "Hồ sơ đã thay đổi. Vui lòng tải lại trước khi lưu.",
    );
  if (
    !(
      await db.query(
        "SELECT id FROM church.departments WHERE id=$1 AND department_type='choir'",
        [fields.departmentId],
      )
    ).rowCount
  )
    throw new HttpError(400, "Ban hát lễ không hợp lệ.");
  const removed = (
    await db.query(
      "DELETE FROM church.department_members dm USING church.departments d WHERE dm.department_id=d.id AND dm.user_id=$1 AND d.department_type='choir' AND dm.department_id<>$2 RETURNING dm.department_id",
      [id, fields.departmentId],
    )
  ).rows;
  await db.query(
    "INSERT INTO church.department_members(department_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
    [fields.departmentId, id],
  );
  await db.query(
    "UPDATE church.member_profiles SET choir_assignment_manual=true,version=version+1 WHERE id=$1",
    [id],
  );
  for (const departmentId of new Set<string>([
    fields.departmentId,
    ...removed.map((row) => String(row.department_id)),
  ]))
    await db.query("SELECT pg_notify('church_team_events',$1)", [
      JSON.stringify({ department_id: departmentId, kind: "members" }),
    ]);
  await audit(db, actor, id, "Đã đổi Ban hát lễ thủ công");
  return getMember(db, actor, id, false, false);
}
