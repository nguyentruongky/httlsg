import {
  CalendarRange,
  type AuthUser,
  type ScheduleRecord,
  normalizeQuarterlySchedule,
} from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";

export async function calendarResponsibilities(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  if (actor.role !== "admin" && actor.role !== "secretary")
    throw new HttpError(403, "Bạn không có quyền xem lịch phân công tổng hợp.");
  const range = CalendarRange.parse(input);
  return loadPublishedResponsibilities(db, actor, range);
}
export async function responsibilitiesForDates(
  db: DB,
  actor: AuthUser,
  dates: string[],
) {
  if (actor.role !== "admin")
    throw new HttpError(403, "Bạn không có quyền xem lịch tổng hợp.");
  if (!dates.length) return [];
  const sorted = [...new Set(dates)].sort();
  return (
    await loadPublishedResponsibilities(
      db,
      actor,
      { from: sorted[0], to: sorted[sorted.length - 1] },
      sorted,
    )
  ).items;
}
async function loadPublishedResponsibilities(
  db: DB,
  actor: AuthUser,
  range: { from: string; to: string },
  dates?: string[],
) {
  const schedules = (
    await db.query(
      `SELECT s.id,
              s.category_id AS "categoryId",
              s.title,
              s.settings,
              s.period_start AS "periodStart",
              s.period_end AS "periodEnd",
              s.status,
              s.version,
              s.created_by AS "createdBy",
              s.updated_by AS "updatedBy",
              s.published_at AS "publishedAt",
              s.cancelled_at AS "cancelledAt"
       FROM church.schedules s
       WHERE s.deleted_at IS NULL AND s.status='published'
         AND EXISTS (
           SELECT 1 FROM church.schedule_events e
           WHERE e.schedule_id=s.id AND e.event_date BETWEEN $1 AND $2
             AND ($3::date[] IS NULL OR e.event_date=ANY($3::date[]))
         )
       ORDER BY s.id`,
      [range.from, range.to, dates ?? null],
    )
  ).rows;

  if (!schedules.length) return { items: [] };

  const scheduleIds = schedules.map((row) => row.id);

  const events = (
    await db.query(
      `SELECT e.id,
              e.schedule_id AS "scheduleId",
              e.event_date AS "date",
              to_char(e.start_time,'HH24:MI') AS "startTime",
              to_char(e.end_time,'HH24:MI') AS "endTime",
              e.title, e.description, e.location, e.session
       FROM church.schedule_events e
       WHERE e.schedule_id = ANY($1::uuid[])
         AND e.event_date BETWEEN $2 AND $3
         AND ($4::date[] IS NULL OR e.event_date=ANY($4::date[]))
       ORDER BY e.event_date, e.start_time NULLS LAST, e.id`,
      [scheduleIds, range.from, range.to, dates ?? null],
    )
  ).rows;

  const eventIds = [...new Set(events.map((row) => row.id))];

  const duties = eventIds.length
    ? (
        await db.query(
          `SELECT r.id, r.event_id AS "eventId", r.name, r.description,
                  r.display_text AS "displayText", r.sort_order
           FROM church.schedule_responsibilities r
           WHERE r.event_id = ANY($1::uuid[])
           ORDER BY r.sort_order, r.id`,
          [eventIds],
        )
      ).rows
    : [];

  const dutyIds = [...new Set(duties.map((row) => row.id))];

  const assignments = dutyIds.length
    ? (
        await db.query(
          `SELECT a.responsibility_id AS "responsibilityId",
                  a.member_id AS "memberId", a.notes
           FROM church.schedule_assignments a
           WHERE a.responsibility_id = ANY($1::uuid[])`,
          [dutyIds],
        )
      ).rows
    : [];

  const teams = dutyIds.length
    ? (
        await db.query(
          `SELECT a.responsibility_id AS "responsibilityId",
                  a.department_key AS "departmentId",
                  a.department_name AS "departmentName"
           FROM church.schedule_department_assignments a
           WHERE a.responsibility_id = ANY($1::uuid[])
           ORDER BY a.department_name`,
          [dutyIds],
        )
      ).rows
    : [];

  const memberIds = [...new Set(assignments.map((row) => row.memberId))];
  const memberRows = memberIds.length
    ? (
        await db.query(
          `SELECT id, full_name AS name FROM church.member_profiles
           WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`,
          [memberIds],
        )
      ).rows
    : [];
  const memberNames = Object.fromEntries(
    memberRows.map((row) => [row.id, row.name]),
  );

  const departmentNames = Object.fromEntries(
    teams.map((row) => [row.departmentId, row.departmentName]),
  );

  const deaconRows = (
    await db.query(
      `SELECT p.id, p.full_name AS name FROM church.member_profiles p
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
    deaconRows.map((row) => [row.id, row.name]),
  );

  const eventsBySchedule = new Map<string, typeof events>();
  for (const row of events) {
    const list = eventsBySchedule.get(row.scheduleId) ?? [];
    list.push(row);
    eventsBySchedule.set(row.scheduleId, list);
  }
  const dutiesByEvent = new Map<string, typeof duties>();
  for (const row of duties) {
    const list = dutiesByEvent.get(row.eventId) ?? [];
    list.push(row);
    dutiesByEvent.set(row.eventId, list);
  }
  const assignmentsByDuty = new Map<string, any[]>();
  for (const row of assignments) {
    const list = assignmentsByDuty.get(row.responsibilityId) ?? [];
    list.push(row);
    assignmentsByDuty.set(row.responsibilityId, list);
  }
  const teamsByDuty = new Map<string, string[]>();
  for (const row of teams) {
    const list = teamsByDuty.get(row.responsibilityId) ?? [];
    list.push(row.departmentId);
    teamsByDuty.set(row.responsibilityId, list);
  }

  const items: ScheduleRecord[] = schedules.map((row) => {
    const scheduleEvents = (eventsBySchedule.get(row.id) ?? []).map(
      (event) => ({
        id: event.id,
        date: event.date,
        startTime: event.startTime ?? null,
        endTime: event.endTime ?? null,
        title: event.title,
        description: event.description ?? "",
        location: event.location ?? "",
        session: event.session ?? "",
        responsibilities: (dutiesByEvent.get(event.id) ?? []).map((duty) => ({
          id: duty.id,
          name: duty.name,
          description: duty.description ?? "",
          displayText: duty.displayText ?? null,
          assignments: (assignmentsByDuty.get(duty.id) ?? []).map(
            (item: any) => ({
              memberId: item.memberId,
              notes: item.notes ?? "",
            }),
          ),
          departmentIds: teamsByDuty.get(duty.id) ?? [],
        })),
      }),
    );
    return normalizeQuarterlySchedule({
      id: row.id,
      categoryId: row.categoryId,
      title: row.title,
      description: "",
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      settings: row.settings,
      status: row.status,
      version: row.version,
      createdBy: row.createdBy ?? null,
      updatedBy: row.updatedBy ?? null,
      publishedAt: row.publishedAt
        ? new Date(row.publishedAt).toISOString()
        : null,
      cancelledAt: row.cancelledAt
        ? new Date(row.cancelledAt).toISOString()
        : null,
      memberNames,
      departmentNames,
      deaconMembers,
      events: scheduleEvents,
    } as ScheduleRecord);
  });

  return { items };
}
