import { z } from "zod";
import type { AuthUser } from "./auth-contract";
import { parseEventText } from "./event-parser";
export const CALENDAR_ZONE = "Asia/Ho_Chi_Minh";
export const CALENDAR_WEEKDAYS = [
  "Chúa nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
] as const;
const weekdayCodes = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CALENDAR_ZONE,
  weekday: "short",
});
// A date-only calendar value represents a day in GMT+7, never the device zone.
export function calendarDateInChurch(value: string) {
  return new Date(`${value}T12:00:00+07:00`);
}
export function calendarWeekday(value: string) {
  const index = weekdayCodes.indexOf(
    weekdayFormatter.format(calendarDateInChurch(value)),
  );
  if (index < 0) throw new RangeError("Invalid calendar weekday");
  return index;
}

export const calendarPermissions = [
  "calendar.read",
  "calendar.write",
  "calendar.export",
  "calendar.groups",
  "calendar.notify",
] as const;
export function canCalendar(
  user: AuthUser | null | undefined,
  permission: (typeof calendarPermissions)[number] = "calendar.read",
) {
  return Boolean(
    user &&
    !user.requiresPasswordSetup &&
    ["admin", "secretary"].includes(user.role) &&
    (user.role === "admin" ||
      ["calendar.read", "calendar.export"].includes(permission)) &&
    user.permissions.includes(permission),
  );
}
export const CalendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ.")
  .refine((value) => {
    const d = new Date(value + "T12:00:00Z");
    return (
      !isNaN(d.getTime()) &&
      d.toISOString().slice(0, 10) === value &&
      value >= "1900-01-01" &&
      value <= "2100-12-31"
    );
  }, "Ngày không hợp lệ.");
export const CalendarRange = z
  .object({ from: CalendarDate, to: CalendarDate })
  .strict()
  .refine((v) => v.from <= v.to, "Ngày kết thúc phải từ ngày bắt đầu.")
  .refine(
    (v) => (Date.parse(v.to) - Date.parse(v.from)) / 86400000 <= 366,
    "Chọn tối đa 367 ngày.",
  );
export const EventInput = z
  .object({
    eventDate: CalendarDate,
    originalText: z.string().min(1).max(50000),
    groupIds: z.array(z.uuid()).max(50).default([]),
    requestId: z.uuid(),
    presetId: z.string().min(1).max(80).optional(),
    version: z.number().int().nonnegative().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const parsed = parseEventText(v.originalText);
    if (!parsed.title || parsed.title.length > 300)
      ctx.addIssue({
        code: "custom",
        message: "Nhập tiêu đề từ 1 đến 300 ký tự.",
        path: ["originalText"],
      });
    if (new Set(v.groupIds).size !== v.groupIds.length)
      ctx.addIssue({
        code: "custom",
        message: "Nhóm email bị trùng.",
        path: ["groupIds"],
      });
  });
export const GroupInput = z
  .object({
    name: z.string().trim().min(1).max(150),
    description: z.string().max(2000).default(""),
    version: z.number().int().nonnegative().optional(),
  })
  .strict();
export const BulkEmailInput = z
  .object({ text: z.string().min(1).max(30000) })
  .strict();
export const NotificationInput = z.object({ requestId: z.uuid() }).strict();
export const ExportInput = z
  .object({
    from: CalendarDate,
    to: CalendarDate,
    text: z
      .string()
      .max(500000)
      .refine(
        (value) => value.split(/\r\n|\n|\r/).length <= 10000,
        "Tối đa 10.000 dòng mỗi tệp Word; chia nhỏ khoảng ngày hoặc sửa bản xem trước.",
      )
      .refine(
        (value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value),
        "Văn bản có ký tự điều khiển không hợp lệ.",
      ),
  })
  .strict()
  .refine(
    (v) => CalendarRange.safeParse({ from: v.from, to: v.to }).success,
    "Khoảng ngày không hợp lệ.",
  );
export interface CalendarEvent {
  presetId?: string | null;
  id: string;
  eventDate: string;
  endDate?: string;
  title: string;
  timeText: string | null;
  startTime: string | null;
  endTime: string | null;
  details: string;
  originalText: string;
  groupIds: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface CalendarSendSummary {
  sent?: number;
  failed?: number;
  uncertain?: number;
  pending?: number;
  sending?: number;
  cancelled?: number;
  error?: string;
}
export type CalendarSaveResult = CalendarEvent & {
  pushEventId?: string;
  notificationId?: string | null;
  worshipNotificationId?: string | null;
  delivery?: CalendarSendSummary;
};
export interface EmailGroup {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  version: number;
}
export interface EmailGroupMember {
  id: string;
  email: string;
}
export interface NotificationBatch {
  id: string;
  kind: "created" | "updated";
  createdAt: string;
  groupNames: string[];
  counts: Record<string, number>;
}
export interface CalendarDelivery {
  id: string;
  email: string;
  status: "pending" | "sending" | "sent" | "failed" | "uncertain" | "cancelled";
  attempts: number;
  error: string | null;
  sentAt: string | null;
}
export const calendarKey = ["calendar"];
export function todayInChurch(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: CALENDAR_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
// UTC is only a neutral carrier for Gregorian date arithmetic, not a display zone.
export function addCalendarDays(value: string, days: number) {
  const date = new Date(value + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function calendarWeek(value: string) {
  const day = calendarWeekday(value);
  const from = addCalendarDays(value, -day);
  return { from, to: addCalendarDays(from, 6) };
}
export function calendarMonth(value: string) {
  const first = value.slice(0, 7) + "-01";
  const next = new Date(first + "T12:00:00Z");
  next.setUTCMonth(next.getUTCMonth() + 1);
  const last = addCalendarDays(next.toISOString().slice(0, 10), -1);
  return { from: calendarWeek(first).from, to: calendarWeek(last).to };
}
export function displayCalendarDate(value: string, weekday = false) {
  const date = new Intl.DateTimeFormat("vi-VN", {
    timeZone: CALENDAR_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(calendarDateInChurch(value));
  return weekday
    ? `${CALENDAR_WEEKDAYS[calendarWeekday(value)]}, ${date}`
    : date;
}
export function parseBulkEmails(
  text: string,
  existing: readonly string[] = [],
) {
  const valid: string[] = [],
    invalid: string[] = [],
    duplicates: string[] = [],
    alreadyExisting: string[] = [];
  const seen = new Set<string>(),
    old = new Set(existing.map((v) => v.trim().toLowerCase()));
  for (const raw of text
    .split(/[\n\r,;]+/)
    .map((v) => v.trim())
    .filter(Boolean)) {
    const email = raw.toLowerCase();
    if (!z.email().max(254).safeParse(email).success) {
      invalid.push(raw);
      continue;
    }
    if (seen.has(email)) duplicates.push(email);
    else if (old.has(email)) alreadyExisting.push(email);
    else valid.push(email);
    seen.add(email);
  }
  return { valid, invalid, duplicates, alreadyExisting };
}
export function sortCalendarEvents(events: CalendarEvent[]) {
  return [...events].sort(
    (a, b) =>
      a.eventDate.localeCompare(b.eventDate) ||
      (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99") ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );
}
export function calendarExportPreview(
  events: CalendarEvent[],
  range: { from: string; to: string },
) {
  const lines: string[] = [];
  const headingRanges: { start: number; end: number }[] = [];
  let length = 0;
  function push(...values: string[]) {
    for (const value of values) {
      if (lines.length) length++;
      lines.push(value);
      length += value.length;
    }
  }
  push(
    "LỊCH CHƯƠNG TRÌNH",
    `Từ ngày: ${displayCalendarDate(range.from)}`,
    `Đến ngày: ${displayCalendarDate(range.to)}`,
    "",
  );
  let last = "";
  let order = 0;
  for (const e of sortCalendarEvents(events)) {
    order++;
    if (e.eventDate !== last) {
      push(
        displayCalendarDate(e.eventDate, true).toLocaleUpperCase("vi-VN"),
        "",
      );
      last = e.eventDate;
    }
    const heading = `${order}. ${e.timeText ? e.timeText + " | " : ""}${e.title}`;
    headingRanges.push({ start: length + 1, end: length + 1 + heading.length });
    push(heading, e.details, "");
  }
  if (!events.length) push("Không có chương trình trong khoảng ngày đã chọn.");
  return { text: lines.join("\n"), headingRanges };
}

export function calendarExportText(
  events: CalendarEvent[],
  range: { from: string; to: string },
) {
  return calendarExportPreview(events, range).text;
}
