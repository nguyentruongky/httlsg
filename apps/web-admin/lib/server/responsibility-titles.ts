import type { ScheduleRecord } from "@org/core";
import type { DB } from "./db";

export async function addResponsibilityTitles(
  db: DB,
  schedules: ScheduleRecord[],
) {
  if (!schedules.length) return schedules;
  const rows = (
    await db.query(
      `SELECT p.id,p.full_name AS name FROM church.member_profiles p
     WHERE p.deleted_at IS NULL AND (
       p.role_id='deacon'
       OR EXISTS(SELECT 1 FROM church.member_roles r WHERE r.member_id=p.id AND r.role_id='deacon')
       OR EXISTS(SELECT 1 FROM church.department_members dm
         JOIN church.departments d ON d.id=dm.department_id
         WHERE dm.user_id=p.id
           AND regexp_replace(lower(public.unaccent(d.name)),'[^a-z0-9]','','g')='banchapsu')
     )`,
    )
  ).rows;
  const deaconMembers = Object.fromEntries(
    rows.map((row) => [row.id, row.name]),
  );
  return schedules.map((schedule) => ({ ...schedule, deaconMembers }));
}
