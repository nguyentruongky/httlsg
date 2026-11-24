import { CalendarRange, type AuthUser } from "@org/core";
import type { DB } from "../db";
import { HttpError } from "../http";
import { requireCalendar, calendarId } from "./policy";
import { eventDto } from "./event-mapper";
import { findEventRow, listEventRows, lockEventRows } from "./event-repository";

export async function listCalendarEvents(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  requireCalendar(actor);
  const range = CalendarRange.parse(input);
  const rows = await listEventRows(db, range.from, range.to);
  if (rows.length > 5000)
    throw new HttpError(
      400,
      "Có quá nhiều chương trình. Vui lòng chọn khoảng ngày ngắn hơn.",
    );
  return {
    items: rows.map((row) =>
      eventDto(row, ["admin", "secretary", "deacon"].includes(actor.role)),
    ),
    ...range,
  };
}

export async function calendarEvent(
  db: DB,
  actor: AuthUser,
  id: string,
  includeDeleted = false,
) {
  requireCalendar(actor);
  calendarId(id);
  const row = await findEventRow(db, id, {
    includeDeleted: includeDeleted && actor.role === "admin",
  });
  if (!row) throw new HttpError(404, "Không tìm thấy chương trình.");
  return eventDto(row, ["admin", "secretary", "deacon"].includes(actor.role));
}

/** Load review snapshots and hold their event locks until the caller commits. */
export async function lockCalendarReviewEvents(
  db: DB,
  actor: AuthUser,
  dates: string[],
) {
  requireCalendar(actor, "calendar.write");
  const rows = await lockEventRows(db, dates);
  return rows.map((row) => eventDto(row, true));
}
