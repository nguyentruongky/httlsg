import { sortDepartments, type AuthUser } from "@org/core";
import type { DB } from "./db";
export async function authBootstrap(db: DB, user: AuthUser) {
  if (user.requiresPasswordSetup)
    return { departments: [], navigation: { hasAssignments: false } };
  const { rows } = await db.query(
    `SELECT
    (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'name',name) ORDER BY name),'[]') FROM church.departments) departments,
    EXISTS(SELECT 1 FROM church.schedules s
      JOIN church.schedule_events e ON e.schedule_id=s.id
      JOIN church.schedule_responsibilities r ON r.event_id=e.id
      WHERE s.deleted_at IS NULL AND (s.status='published' OR (s.status='cancelled' AND s.published_at IS NOT NULL))
      AND (EXISTS(SELECT 1 FROM church.schedule_assignments a WHERE a.responsibility_id=r.id AND a.member_id=$1)
        OR EXISTS(SELECT 1 FROM church.schedule_department_assignments da JOIN church.department_members dm ON dm.department_id=da.department_id WHERE da.responsibility_id=r.id AND dm.user_id=$1))) AS "hasAssignments"`,
    [user.id],
  );
  return {
    departments: sortDepartments(rows[0].departments),
    navigation: { hasAssignments: rows[0].hasAssignments },
  };
}
