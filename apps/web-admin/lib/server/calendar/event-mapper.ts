import type { CalendarEvent } from "@org/core";
import type { CalendarEventRow } from "./event-repository";

const iso = (value: unknown) =>
  value instanceof Date
    ? value.toISOString()
    : new Date(String(value)).toISOString();

export function eventDto(
  row: CalendarEventRow,
  privateGroups: boolean,
): CalendarEvent {
  return {
    id: row.id,
    presetId: row.preset_id ?? null,
    eventDate: row.event_date,
    endDate: row.end_date,
    title: row.title,
    timeText: row.time_text,
    startTime: row.start_time?.slice(0, 5) ?? null,
    endTime: row.end_time?.slice(0, 5) ?? null,
    details: row.details,
    originalText: row.original_text,
    groupIds: privateGroups ? (row.group_ids ?? []) : [],
    version: row.version,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}
