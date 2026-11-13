import { z } from "zod";
import type { AuthUser } from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { calendarEvent } from "./calendar";
import { responsibilitiesForDates } from "./calendar-responsibilities";

export async function clientSchedule(db: DB, actor: AuthUser, input: unknown) {
  if (actor.role !== "admin")
    throw new HttpError(403, "Chỉ quản trị viên được xem lịch tổng hợp.");
  const filter = z
    .object({
      page: z.coerce.number().int().min(1).max(10000).default(1),
      id: z.uuid().optional(),
    })
    .strict()
    .parse(input);
  if (filter.id) {
    const event = await calendarEvent(db, actor, filter.id);
    return {
      event,
      reception: await responsibilitiesForDates(db, actor, [event.eventDate]),
    };
  }
  const rows = (
    await db.query(
      `SELECT e.id,e.event_date AS "eventDate",e.title,e.time_text AS "timeText",
      left(e.details,160) AS summary,
      e.event_date < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 7 AS expanded,
      CASE WHEN e.event_date < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 7
        THEN e.original_text ELSE NULL END AS "originalText"
    FROM church.events e WHERE e.deleted_at IS NULL
      AND e.event_date >= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
    ORDER BY e.event_date,e.start_time NULLS LAST,e.created_at,e.id
    LIMIT 21 OFFSET $1`,
      [(filter.page - 1) * 20],
    )
  ).rows;
  const items = rows.slice(0, 20);
  const dates = [
    ...new Set<string>(
      items.filter((event) => event.expanded).map((event) => event.eventDate),
    ),
  ];
  return {
    items,
    reception: await responsibilitiesForDates(db, actor, dates),
    nextPage: rows.length > 20 ? filter.page + 1 : null,
  };
}
