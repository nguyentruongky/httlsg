import type { DB } from "../db";

/** PostgreSQL representation. Date columns use the DB parser's YYYY-MM-DD strings. */
export type CalendarEventRow = {
  id: string;
  preset_id: string | null;
  event_date: string;
  end_date: string;
  title: string;
  time_text: string | null;
  start_time: string | null;
  end_time: string | null;
  details: string;
  original_text: string;
  group_ids?: string[];
  version: number;
  created_at: Date | string;
  updated_at: Date | string;
};

const eventSelect = `SELECT e.*,ARRAY(SELECT group_id FROM church.event_email_groups eg JOIN church.email_groups g ON g.id=eg.group_id WHERE eg.event_id=e.id AND g.deleted_at IS NULL ORDER BY group_id) group_ids FROM church.events e`;

/** Persistence only: callers validate identifiers, permissions and range limits. */
export async function listEventRows(db: DB, from: string, to: string) {
  return (
    await db.query<CalendarEventRow>(
      `${eventSelect} WHERE e.deleted_at IS NULL AND e.event_date BETWEEN $1 AND $2 ORDER BY e.event_date,e.start_time NULLS LAST,e.created_at,e.id LIMIT 5001`,
      [from, to],
    )
  ).rows;
}

export async function findEventRow(
  db: DB,
  id: string,
  options: { includeDeleted?: boolean; lock?: boolean } = {},
): Promise<CalendarEventRow | undefined> {
  return (
    await db.query<CalendarEventRow>(
      `${eventSelect} WHERE e.id=$1 ${options.includeDeleted ? "" : "AND e.deleted_at IS NULL"}${options.lock ? " FOR UPDATE OF e" : ""}`,
      [id],
    )
  ).rows[0];
}

/** The lock lasts until the caller's transaction ends. */
export async function lockEventRows(db: DB, dates: string[]) {
  return (
    await db.query<CalendarEventRow>(
      `${eventSelect} WHERE e.event_date=ANY($1::date[]) AND e.deleted_at IS NULL ORDER BY e.event_date,e.created_at,e.id FOR UPDATE OF e`,
      [dates],
    )
  ).rows;
}
