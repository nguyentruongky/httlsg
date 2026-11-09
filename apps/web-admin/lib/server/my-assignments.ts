import { z } from "zod";
import type { AuthUser } from "@org/core";
import type { DB } from "./db";
export async function myAssignments(db: DB, actor: AuthUser, input: unknown) {
  const f = z
    .object({
      view: z.enum(["upcoming", "past", "all"]).default("upcoming"),
      page: z.coerce.number().int().min(1).max(10000).default(1),
    })
    .strict()
    .parse(input);
  const scope = `s.deleted_at IS NULL AND (s.status='published' OR (s.status='cancelled' AND s.published_at IS NOT NULL)) AND (EXISTS(SELECT 1 FROM church.schedule_assignments a WHERE a.responsibility_id=r.id AND a.member_id=$1) OR EXISTS(SELECT 1 FROM church.schedule_department_assignments da JOIN church.department_members dm ON dm.department_id=da.department_id WHERE da.responsibility_id=r.id AND dm.user_id=$1))`;
  const time =
    f.view === "upcoming"
      ? "AND s.status='published' AND e.event_date>=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date"
      : f.view === "past"
        ? "AND (s.status='cancelled' OR e.event_date<(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)"
        : "";
  const rows = (
    await db.query(
      `SELECT s.id AS "scheduleId",s.title AS "scheduleTitle",s.status,c.name AS "categoryName",s.category_id AS "categoryId",e.id AS "eventId",e.event_date date,to_char(e.start_time,'HH24:MI') AS "startTime",to_char(e.end_time,'HH24:MI') AS "endTime",e.title,e.location,e.description,e.session,r.id AS "responsibilityId",r.name AS responsibility,r.description AS "responsibilityDescription",COALESCE((SELECT a.notes FROM church.schedule_assignments a WHERE a.responsibility_id=r.id AND a.member_id=$1),'') notes FROM church.schedules s JOIN church.schedule_categories c ON c.id=s.category_id JOIN church.schedule_events e ON e.schedule_id=s.id JOIN church.schedule_responsibilities r ON r.event_id=e.id WHERE ${scope} ${time} ORDER BY e.event_date ${f.view === "past" ? "DESC" : "ASC"},e.start_time NULLS LAST,CASE e.session WHEN 'Sáng' THEN 0 WHEN 'Chiều' THEN 1 WHEN 'Tối' THEN 2 ELSE 3 END,r.sort_order,r.id LIMIT 26 OFFSET $2`,
      [actor.id, (f.page - 1) * 25],
    )
  ).rows;
  const notices = (
    await db.query(
      'SELECT id,kind,schedule_title AS title,created_at AS "createdAt" FROM church.schedule_notifications WHERE member_id=$1 ORDER BY created_at DESC,id DESC LIMIT 20',
      [actor.id],
    )
  ).rows;
  return {
    items: rows.slice(0, 25),
    nextPage: rows.length > 25 ? f.page + 1 : null,
    notices,
  };
}
