import { isQuarterlyWork, quarterlyTableSections } from "./quarterly-work";
import { z } from "zod";
import { CalendarDate, calendarWeekday, addCalendarDays } from "./calendar";
import { createRequestId } from "./random-id";
import type { AuthUser } from "./auth-contract";
export const SCHEDULE_CATEGORIES = [
  {
    id: "reception",
    name: "Lịch tiếp tân",
    description: "Phân công tiếp đón và hỗ trợ người tham dự.",
    layout: "table",
    duties: ["Tiếp tân", "Hỗ trợ tiếp đón", "Hỗ trợ khách mới"],
  },
  {
    id: "prayer_guidance",
    name: "Lịch hướng dẫn cầu nguyện",
    description: "Phân công hướng dẫn cầu nguyện theo ngày.",
    layout: "weekday",
    duties: ["Người hướng dẫn cầu nguyện"],
  },
  {
    id: "program_guidance",
    name: "Lịch hướng dẫn chương trình",
    description: "Phân công phục vụ theo từng buổi chương trình.",
    layout: "sessions",
    duties: [
      "HD. TP.",
      "HD. Hát.",
      "Nhóm Hát",
      "Ban Hát",
      "Ban nhạc",
      "Giữ xe",
    ],
  },
  {
    id: "communion_duty",
    name: "Lịch trực tiệc thánh",
    description: "Phân công phục vụ tiệc thánh theo nhu cầu của Hội Thánh.",
    layout: "table",
    duties: [],
  },
] as const;
export const ScheduleCategoryId = z.enum([
  "reception",
  "prayer_guidance",
  "program_guidance",
  "communion_duty",
]);
const text = (max: number) => z.string().trim().max(max);
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Giờ phải có dạng HH:mm.")
  .nullable();
const slug = z
  .string()
  .regex(/^[a-z0-9-]+$/)
  .max(100);
export const ScheduleSettings = z
  .object({
    template: z.literal("quarterly_work").optional(),
    weekdayTime: time.default(null),
    sundayTime: time.default(null),
    layout: z
      .enum(["table", "weekday", "sessions", "reception"])
      .default("table"),
    sessions: z.array(text(80).min(1)).max(12).default([]),
  })
  .strict();
export const ScheduleDuty = z
  .object({
    displayText: z.string().max(4000).nullable().optional(),
    id: z.uuid(),
    name: text(100).min(1),
    description: text(500).default(""),
    assignments: z
      .array(
        z.object({ memberId: z.uuid(), notes: text(500).default("") }).strict(),
      )
      .max(30)
      .default([]),
    departmentIds: z.array(slug).max(20).default([]),
  })
  .strict();
export const ScheduleEvent = z
  .object({
    id: z.uuid(),
    date: CalendarDate,
    startTime: time.default(null),
    endTime: time.default(null),
    title: text(200).min(1),
    description: text(1000).default(""),
    location: text(200).default(""),
    session: text(80).default(""),
    responsibilities: z.array(ScheduleDuty).max(20).default([]),
  })
  .strict();
const fields = z
  .object({
    categoryId: ScheduleCategoryId,
    title: text(200).min(2),
    description: text(2000).default(""),
    periodStart: CalendarDate,
    periodEnd: CalendarDate,
    settings: ScheduleSettings,
    events: z.array(ScheduleEvent).max(200).default([]),
  })
  .strict();
function validate(input: z.infer<typeof fields>, ctx: z.RefinementCtx) {
  if (
    input.periodEnd < input.periodStart ||
    days(input.periodStart, input.periodEnd) > 366
  )
    ctx.addIssue({
      code: "custom",
      path: ["periodEnd"],
      message: "Khoảng lịch phải hợp lệ và không quá 367 ngày.",
    });
  const ids = new Set<string>(),
    slots = new Set<string>();
  let assignments = 0;
  for (const [i, event] of input.events.entries()) {
    if (event.date < input.periodStart || event.date > input.periodEnd)
      ctx.addIssue({
        code: "custom",
        path: ["events", i, "date"],
        message: "Ngày chương trình nằm ngoài kỳ lịch.",
      });
    if (event.endTime && (!event.startTime || event.endTime <= event.startTime))
      ctx.addIssue({
        code: "custom",
        path: ["events", i, "endTime"],
        message: "Giờ kết thúc phải sau giờ bắt đầu.",
      });
    const slot = [
      event.date,
      event.startTime,
      event.session.trim().toLowerCase(),
      event.title.trim().toLowerCase(),
    ].join("|");
    if (slots.has(slot))
      ctx.addIssue({
        code: "custom",
        path: ["events", i],
        message: "Trùng ngày, buổi, giờ và tên chương trình.",
      });
    slots.add(slot);
    for (const id of [
      event.id,
      ...event.responsibilities.map((duty) => duty.id),
    ]) {
      if (ids.has(id))
        ctx.addIssue({
          code: "custom",
          message: "Mã chương trình hoặc trách nhiệm bị trùng.",
        });
      ids.add(id);
    }
    const dutyNames = new Set<string>();
    for (const [j, duty] of event.responsibilities.entries()) {
      const name = duty.name.trim().toLocaleLowerCase("vi");
      if (dutyNames.has(name))
        ctx.addIssue({
          code: "custom",
          path: ["events", i, "responsibilities", j, "name"],
          message: "Tên trách nhiệm bị trùng trong chương trình.",
        });
      dutyNames.add(name);
      assignments += duty.assignments.length;
      if (
        new Set(duty.assignments.map((item) => item.memberId.toLowerCase()))
          .size !== duty.assignments.length ||
        new Set(duty.departmentIds).size !== duty.departmentIds.length
      )
        ctx.addIssue({
          code: "custom",
          path: ["events", i, "responsibilities", j],
          message: "Phân công bị trùng.",
        });
    }
  }
  if (assignments > 2000)
    ctx.addIssue({
      code: "custom",
      message: "Tối đa 2.000 phân công trong một lịch.",
    });
}
export const ScheduleDraft = fields.superRefine(validate);
export const ScheduleCreate = fields
  .extend({ requestId: z.uuid() })
  .superRefine(validate);
export const ScheduleUpdate = fields
  .extend({
    version: z.number().int().min(0),
    notifyAffected: z.boolean().default(false),
  })
  .superRefine(validate);
export const ScheduleTransition = z
  .object({ version: z.number().int().min(0) })
  .strict();
export const ScheduleCopyInput = z
  .object({
    periodStart: CalendarDate,
    periodEnd: CalendarDate,
    title: text(200).min(2),
    method: z.enum(["weekday_pattern", "exact_offset"]),
    copyAssignments: z.boolean(),
    copyResponsibilities: z.boolean(),
    skipUnmatched: z.boolean().default(false),
    requestId: z.uuid(),
    sourceVersion: z.number().int().min(0),
  })
  .strict();
export type ScheduleDraftValue = z.infer<typeof ScheduleDraft>;
export type ScheduleEventValue = z.infer<typeof ScheduleEvent>;
export type ScheduleRecord = ScheduleDraftValue & {
  id: string;
  status: "draft" | "published" | "cancelled";
  version: number;
  createdBy: string | null;
  updatedBy: string | null;
  publishedAt: string | null;
  cancelledAt: string | null;
  memberNames: Record<string, string>;
  /** Deacon identities supplied by the admin daily responsibility feed. */
  deaconMembers?: Record<string, string>;
  departmentNames: Record<string, string>;
};
export type ScheduleCategory = {
  id: z.infer<typeof ScheduleCategoryId>;
  name: string;
  description: string;
  isActive: boolean;
  version: number;
  settings: z.infer<typeof ScheduleSettings>;
  definitions: {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    sortOrder: number;
  }[];
  canManage: boolean;
};
export function canManageScheduleCategory(
  user: AuthUser | null | undefined,
  category: string,
) {
  if (!user || user.requiresPasswordSetup) return false;
  if (user.role === "admin") return true;
  if (user.role === "deacon") return false;
  if (category === "reception") return user.isReceptionLeader === true;
  return user.role === "secretary";
}
export function hasScheduleManagement(user: AuthUser | null | undefined) {
  return SCHEDULE_CATEGORIES.some((category) =>
    canManageScheduleCategory(user, category.id),
  );
}
export function canViewSchedules(user: AuthUser | null | undefined) {
  return Boolean(
    user &&
    !user.requiresPasswordSetup &&
    (["admin", "secretary", "deacon"].includes(user.role) ||
      hasScheduleManagement(user)),
  );
}
export function days(from: string, to: string) {
  return Math.round(
    (Date.parse(to + "T12:00:00Z") - Date.parse(from + "T12:00:00Z")) /
      86400000,
  );
}
export function defaultScheduleSettings(
  category: string,
): z.infer<typeof ScheduleSettings> {
  return {
    layout:
      category === "prayer_guidance"
        ? "weekday"
        : category === "program_guidance"
          ? "sessions"
          : "table",
    weekdayTime: category === "prayer_guidance" ? "05:30" : null,
    sundayTime: category === "prayer_guidance" ? "06:30" : null,
    sessions:
      category === "program_guidance"
        ? ["Sáng Chúa Nhật", "Chiều Chúa Nhật", "Thứ Tư"]
        : [],
  };
}
export function copyScheduleDraft(
  source: ScheduleDraftValue,
  input: z.infer<typeof ScheduleCopyInput>,
) {
  if (
    input.periodEnd < input.periodStart ||
    days(input.periodStart, input.periodEnd) > 366
  )
    throw new Error("Khoảng kỳ mới không hợp lệ.");
  const issues: string[] = [];
  const events: ScheduleEventValue[] = [];
  for (const event of source.events) {
    let date: string;
    if (input.method === "exact_offset")
      date = addCalendarDays(
        input.periodStart,
        days(source.periodStart, event.date),
      );
    else {
      const first = addCalendarDays(
        input.periodStart,
        (calendarWeekday(event.date) - calendarWeekday(input.periodStart) + 7) %
          7,
      );
      const ordinal = Math.floor(days(source.periodStart, event.date) / 7);
      date = addCalendarDays(first, ordinal * 7);
    }
    if (date < input.periodStart || date > input.periodEnd) {
      issues.push(`Không có ngày phù hợp cho ${event.date}: ${event.title}`);
      continue;
    }
    events.push({
      ...event,
      id: createRequestId(),
      date,
      responsibilities: input.copyResponsibilities
        ? event.responsibilities.map((duty) => ({
            ...duty,
            displayText: input.copyAssignments ? duty.displayText : null,
            id: createRequestId(),
            assignments: input.copyAssignments
              ? duty.assignments.map((item) => ({ ...item }))
              : [],
            departmentIds: input.copyAssignments ? [...duty.departmentIds] : [],
          }))
        : [],
    });
  }
  const draft: ScheduleDraftValue = {
    categoryId: source.categoryId,
    title: input.title,
    description: source.description,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    settings: { ...source.settings, sessions: [...source.settings.sessions] },
    events,
  };
  ScheduleDraft.parse(draft);
  return { draft, issues };
}
/** Signatures include only that person's duties, never another assignee's private details. */
export function assignmentSignatures(
  schedule: ScheduleDraftValue,
  departments: Map<string, string[]>,
) {
  const result = new Map<string, string[]>();
  for (const event of schedule.events)
    for (const duty of event.responsibilities) {
      const ids = new Set([
        ...duty.assignments.map((item) => item.memberId),
        ...duty.departmentIds.flatMap((id) => departments.get(id) ?? []),
      ]);
      for (const id of ids) {
        const rows = result.get(id) ?? [];
        rows.push(
          JSON.stringify([
            schedule.title,
            schedule.description,
            event.date,
            event.startTime,
            event.endTime,
            event.title,
            event.description,
            event.location,
            event.session,
            duty.name,
            duty.description,
            duty.assignments.find((item) => item.memberId === id)?.notes ?? "",
            ...(duty.displayText != null ? [duty.displayText] : []),
          ]),
        );
        result.set(id, rows);
      }
    }
  return new Map(
    [...result].map(([id, rows]) => [id, JSON.stringify(rows.sort())]),
  );
}
export function affectedAssignments(
  before: Map<string, string>,
  after: Map<string, string>,
) {
  return [...new Set([...before.keys(), ...after.keys()])]
    .filter((id) => before.get(id) !== after.get(id))
    .map(
      (id) =>
        ({
          memberId: id,
          kind: !before.has(id)
            ? "assigned"
            : !after.has(id)
              ? "removed"
              : "changed",
        }) as const,
    );
}
export function scheduleTableSections(schedule: ScheduleRecord) {
  if (isQuarterlyWork(schedule)) return quarterlyTableSections(schedule);
  const groups = new Map<string, ScheduleEventValue[]>();
  for (const event of [...schedule.events].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.startTime ?? "99").localeCompare(b.startTime ?? "99"),
  )) {
    const key =
      schedule.settings.layout === "sessions"
        ? event.session || "Chương trình khác"
        : schedule.settings.layout === "weekday"
          ? `${event.date.slice(5, 7)}/${event.date.slice(0, 4)} · ${["Chúa nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"][calendarWeekday(event.date)]}`
          : "Phân công";
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups].map(([name, events]) => ({
    name,
    events,
    columns: [
      ...new Set(
        events.flatMap((event) =>
          event.responsibilities.map((duty) => duty.name),
        ),
      ),
    ],
  }));
}
export function scheduleDutyText(
  schedule: ScheduleRecord,
  duty: z.infer<typeof ScheduleDuty> | undefined,
) {
  if (!duty) return "—";
  if (
    schedule.settings.template === "quarterly_work" &&
    duty.displayText != null
  )
    return duty.displayText;
  const parts = [
    ...duty.assignments.map(
      (assignment) =>
        (schedule.memberNames[assignment.memberId] ?? "Thành viên") +
        (assignment.notes ? " (" + assignment.notes + ")" : ""),
    ),
    ...duty.departmentIds.map((id) => schedule.departmentNames[id] ?? id),
  ];
  return (
    parts.join("; ") || (isQuarterlyWork(schedule) ? "" : "Chưa phân công")
  );
}
