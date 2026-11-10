import { CalendarRange, type AuthUser, type ScheduleRecord } from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { getSchedule } from "./schedules";
import { addResponsibilityTitles } from "./responsibility-titles";

export async function calendarResponsibilities(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  if (actor.role !== "admin")
    throw new HttpError(
      403,
      "Chỉ quản trị viên được xem lịch phân công tổng hợp.",
    );
  const range = CalendarRange.parse(input);
  const rows = (
    await db.query(
      `SELECT DISTINCT s.id FROM church.schedules s
     JOIN church.schedule_events e ON e.schedule_id=s.id
     WHERE s.deleted_at IS NULL AND s.status='published'
       AND e.event_date BETWEEN $1 AND $2 ORDER BY s.id`,
      [range.from, range.to],
    )
  ).rows;
  const items: ScheduleRecord[] = [];
  for (const row of rows) {
    const schedule = await getSchedule(db, actor, row.id);
    items.push({
      ...schedule,
      events: schedule.events.filter(
        (event) => event.date >= range.from && event.date <= range.to,
      ),
    });
  }
  return { items: await addResponsibilityTitles(db, items) };
}
