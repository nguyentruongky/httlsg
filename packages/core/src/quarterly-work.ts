import { z } from "zod";
import {
  CalendarDate,
  addCalendarDays,
  calendarWeekday,
  displayCalendarDate,
} from "./calendar";
import { createRequestId } from "./random-id";
import type { ScheduleDraftValue, ScheduleEventValue } from "./schedules";

export const QUARTERLY_DOCUMENT_FOOTER =
  "* Nếu có việc cần, các Chấp sự có thể tự hoán chuyển người hướng dẫn và thông báo cho Ban Thư ký.";
export function quarterlyDocumentFilename(schedule: { periodStart: string }) {
  const quarter = Math.floor(
    (Number(schedule.periodStart.slice(5, 7)) - 1) / 3,
  );
  return `Lich huong dan chuong trinh - quy ${["I", "II", "III", "IV"][quarter]}-${schedule.periodStart.slice(0, 4)}.docx`;
}
export function quarterlyDocumentHeading(schedule: { periodStart: string }) {
  const quarter = Math.floor(
    (Number(schedule.periodStart.slice(5, 7)) - 1) / 3,
  );
  return [
    "HỘI THÁNH TIN LÀNH VIỆT NAM - CHI HỘI SÀI GÒN",
    `LỊCH PHÂN CÔNG CÁC CHƯƠNG TRÌNH THỜ PHƯỢNG CHÚA & TRUYỀN GIÁNG - QUÝ ${["I", "II", "III", "IV"][quarter]}/${schedule.periodStart.slice(0, 4)}`,
  ];
}

export const QUARTERLY_SESSIONS = [
  "Chủ nhật - Sáng",
  "Chủ nhật - Chiều",
  "Thứ tư",
] as const;
export const QUARTERLY_ROLES = [
  "HDTP",
  "HD hát",
  "Nhóm hát",
  "Ban hát",
  "Ban nhạc",
  "Giữ xe",
] as const;
export const QUARTERLY_SECTIONS = [
  "SÁNG CHÚA NHẬT",
  "CHIỀU CHÚA NHẬT",
  "THỨ TƯ",
] as const;
export function quarterlyColumns(session: string): readonly string[] {
  return session === QUARTERLY_SESSIONS[2]
    ? [QUARTERLY_ROLES[0]]
    : QUARTERLY_ROLES;
}
export function quarterlyTextNames(text: string) {
  return text
    .split(/[\n;,]+/)
    .map((line) =>
      normalizeRosterName(
        line
          .trim()
          .replace(/^[-•]\s*/, "")
          .replace(/^(CS\.?|Ô\.|Ông|B\.|Bà)\s+/i, ""),
      ),
    )
    .filter(Boolean)
    .map((name) => normalizeRosterName(quarterlyRosterName(name) ?? name));
}
export function quarterlyPersonnelColumn(role: string) {
  return ["HDTP", "HD hát", "Ban nhạc"].includes(role);
}
export const QUARTERLY_ROSTERS = {
  morning: [
    "Phan Ngọc Danh",
    "Phan Thiệu Huy",
    "Trương Nhật Linh",
    "Nguyễn Hồ Văn Hiển",
    "Nguyễn Sơn Hải",
    "Lâm Hoàng Vũ",
  ],
  afternoon: [
    "Nguyễn Trường Kỷ",
    "Nguyễn Thanh Tân",
    "Nguyễn Viết Nhẫn",
    "Nguyễn Linh Công",
    "Trần Trọng Huy",
    "Lê Minh Quân",
    "Nguyễn Khánh Linh",
    "Lê Quốc Anh",
    "Nguyễn Hồ Văn Hiển",
  ],
  wednesday: [
    "Võ Thị Thùy Linh",
    "Nguyễn Thị Mai Loan",
    "Phan Thị Phương Trang",
    "Nguyễn Thị Thanh Thúy",
    "Diệp Thị Xuân Thu",
    "Lê Ngọc Hà",
    "Lê Thị Thu Hồng",
    "Nguyễn Thị Phương Chi",
  ],
  worship: [
    "Nguyễn Khánh Linh",
    "Lâm Hoàng Vũ",
    "Nguyễn Linh Công",
    "Huỳnh Lê Minh Hoàng Nguyên",
    "Nguyễn Sơn Hải",
    "Quách Hoàng Giang",
  ],
} as const;
export function quarterlyAllowedNames(
  session: string,
  role: string,
): readonly string[] | null {
  if (role === QUARTERLY_ROLES[1]) return QUARTERLY_ROSTERS.worship;
  if (role !== QUARTERLY_ROLES[0]) return null;
  if (session === QUARTERLY_SESSIONS[2]) return QUARTERLY_ROSTERS.wednesday;
  if (session === QUARTERLY_SESSIONS[1]) return QUARTERLY_ROSTERS.afternoon;
  return QUARTERLY_ROSTERS.morning.filter(
    (name) =>
      !QUARTERLY_ROSTERS.afternoon.some(
        (evening) => normalizeRosterName(evening) === normalizeRosterName(name),
      ),
  );
}
export function quarterlyRosterName(
  text: string,
  pool: readonly string[] = Object.values(QUARTERLY_ROSTERS).flat(),
) {
  const key = normalizeRosterName(text);
  const exact = pool.find((name) => normalizeRosterName(name) === key);
  if (exact) return exact;
  const matches = [...new Set(pool)].filter(
    (name) =>
      normalizeRosterName(shortQuarterlyName(name)) === key ||
      normalizeRosterName(name).split(" ").slice(-2).join(" ") === key,
  );
  return matches.length === 1 ? matches[0] : undefined;
}
export const QUARTERLY_TEAMS = ["1", "2", "3", "4"] as const;
export const QUARTERLY_CHOIRS = [
  "Lão niên",
  "Trung niên",
  "Tráng niên",
  "Thanh tráng",
  "Thanh niên",
  "Thiếu niên",
] as const;
export const QUARTERLY_PARKING_GROUPS = [
  "Trung niên",
  "Tráng niên",
  "Thanh tráng",
  "Thanh niên",
] as const;
export const QuarterlyInput = z
  .object({
    year: z.number().int().min(1900).max(2100),
    quarter: z.number().int().min(1).max(4),
  })
  .strict();
export type QuarterlyPerson = { memberId: string; name: string };
export type QuarterlyConflict = {
  memberId: string;
  date: string;
  session: string;
  name?: string;
  scheduleTitle?: string;
  startTime?: string | null;
  endTime?: string | null;
};
export type QuarterlyPreview = {
  draft: ScheduleDraftValue;
  memberNames: Record<string, string>;
  warnings: string[];
};
export function normalizeRosterName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
export function workSession(session: string) {
  const text = normalizeRosterName(session);
  if (text.includes("sang")) return "morning";
  if (text.includes("chieu")) return "afternoon";
  if (text.includes("toi")) return "evening";
  return "any";
}
export function workSessionsOverlap(a: string, b: string) {
  const first = workSession(a),
    second = workSession(b);
  return first === "any" || second === "any" || first === second;
}
export function workAssignmentsOverlap(
  a: { session: string; startTime?: string | null; endTime?: string | null },
  b: { session: string; startTime?: string | null; endTime?: string | null },
) {
  if (a.startTime && b.startTime && a.endTime && b.endTime)
    return a.startTime < b.endTime && b.startTime < a.endTime;
  if (a.startTime && a.startTime === b.startTime) return true;
  return workSessionsOverlap(a.session, b.session);
}
export function quarterlyPeriod(year: number, quarter: number) {
  QuarterlyInput.parse({ year, quarter });
  return {
    from: `${year}-${String((quarter - 1) * 3 + 1).padStart(2, "0")}-01`,
    to: new Date(Date.UTC(year, quarter * 3, 0, 12)).toISOString().slice(0, 10),
  };
}
export function isQuarterlyWork(
  schedule: Pick<ScheduleDraftValue, "categoryId" | "settings">,
) {
  return (
    schedule.categoryId === "program_guidance" &&
    schedule.settings.template === "quarterly_work"
  );
}

export function generateQuarterlyWork(
  year: number,
  quarter: number,
  people: QuarterlyPerson[],
  conflicts: QuarterlyConflict[],
): QuarterlyPreview {
  const { from, to } = quarterlyPeriod(year, quarter);
  const warnings: string[] = [];
  const byName = new Map<string, QuarterlyPerson[]>();
  for (const person of people) {
    const name = normalizeRosterName(person.name);
    byName.set(name, [...(byName.get(name) ?? []), person]);
  }
  const rosters = Object.fromEntries(
    Object.entries(QUARTERLY_ROSTERS).map(([role, names]) => [
      role,
      names.flatMap((name) => {
        const matches = byName.get(normalizeRosterName(name)) ?? [];
        if (matches.length !== 1)
          return [{ memberId: `name:${normalizeRosterName(name)}`, name }];
        return matches;
      }),
    ]),
  ) as Record<keyof typeof QUARTERLY_ROSTERS, QuarterlyPerson[]>;
  rosters.morning = rosters.morning.filter(
    (person) =>
      !QUARTERLY_ROSTERS.afternoon.some(
        (name) =>
          normalizeRosterName(name) === normalizeRosterName(person.name),
      ),
  );
  const parkingCounts = new Map<string, number>();
  const parkingSessionCounts = new Map<string, number>();
  const count = new Map<string, number>();
  const roleCount = new Map<string, number>();
  const lastUsed = new Map<string, number>();
  const events: ScheduleEventValue[] = [];
  let sessionIndex = 0;
  for (let date = from; date <= to; date = addCalendarDays(date, 1)) {
    const weekday = calendarWeekday(date);
    if (weekday !== 0 && weekday !== 3) continue;
    const sessions =
      weekday === 0 ? QUARTERLY_SESSIONS.slice(0, 2) : [QUARTERLY_SESSIONS[2]];
    const slots = sessions.flatMap((session) => {
      const mc =
        weekday === 3
          ? "wednesday"
          : workSession(session) === "morning"
            ? "morning"
            : "afternoon";
      return [
        {
          session,
          role: "HDTP",
          pool: mc as keyof typeof QUARTERLY_ROSTERS,
        },
        ...(weekday === 0
          ? [{ session, role: "HD hát", pool: "worship" as const }]
          : []),
      ];
    });
    const candidates = slots.map((slot) =>
      rosters[slot.pool].filter(
        (person) =>
          !conflicts.some(
            (conflict) =>
              (conflict.memberId === person.memberId ||
                quarterlyTextNames(conflict.name ?? "").includes(
                  normalizeRosterName(person.name),
                )) &&
              conflict.date === date &&
              workAssignmentsOverlap(conflict, slot),
          ),
      ),
    );
    // Solve the whole day together: greedy choices for morning must not block afternoon.
    const order = slots
      .map((_, index) => index)
      .sort((a, b) => candidates[a].length - candidates[b].length);
    let best: (QuarterlyPerson | null)[] = slots.map(() => null),
      bestFilled = -1,
      bestCost = Infinity;
    const selected: (QuarterlyPerson | null)[] = slots.map(() => null);
    const used = new Set<string>();
    function choose(depth: number, filled: number, cost: number) {
      if (filled + order.length - depth < bestFilled) return;
      if (depth === order.length) {
        if (filled > bestFilled || (filled === bestFilled && cost < bestCost)) {
          best = [...selected];
          bestFilled = filled;
          bestCost = cost;
        }
        return;
      }
      const index = order[depth],
        slot = slots[index];
      for (const person of candidates[index]) {
        if (used.has(person.memberId)) continue;
        const key = `${slot.pool}:${person.memberId}`;
        // Balance each role pool first, then total work, using oldest turn as the tie-breaker.
        const score =
          ((roleCount.get(key) ?? 0) * 2 + 1) * 10000 +
          ((count.get(person.memberId) ?? 0) * 2 + 1) * 100 +
          (lastUsed.get(key) ?? -1);
        selected[index] = person;
        used.add(person.memberId);
        choose(depth + 1, filled + 1, cost + score);
        used.delete(person.memberId);
      }
      selected[index] = null;
      choose(depth + 1, filled, cost);
    }
    choose(0, 0, 0);
    for (const [index, person] of best.entries()) {
      const slot = slots[index];
      if (!person) {
        warnings.push(
          `${displayCalendarDate(date)} · ${slot.session} · ${slot.role}: không có người hợp lệ, cần phân công trước khi công bố.`,
        );
        continue;
      }
      const key = `${slot.pool}:${person.memberId}`;
      roleCount.set(key, (roleCount.get(key) ?? 0) + 1);
      count.set(person.memberId, (count.get(person.memberId) ?? 0) + 1);
      lastUsed.set(key, events.length + Math.floor(index / 2));
    }
    for (const [index, session] of sessions.entries()) {
      const people = [best[index * 2], best[index * 2 + 1]];
      const choir = QUARTERLY_CHOIRS[sessionIndex % QUARTERLY_CHOIRS.length];
      const parking = [...QUARTERLY_PARKING_GROUPS]
        .filter((group) => String(group) !== String(choir))
        .sort(
          (a, b) =>
            (parkingCounts.get(a) ?? 0) - (parkingCounts.get(b) ?? 0) ||
            (parkingSessionCounts.get(`${session}:${a}`) ?? 0) -
              (parkingSessionCounts.get(`${session}:${b}`) ?? 0),
        )[0];
      if (weekday === 0) {
        parkingCounts.set(parking, (parkingCounts.get(parking) ?? 0) + 1);
        parkingSessionCounts.set(
          `${session}:${parking}`,
          (parkingSessionCounts.get(`${session}:${parking}`) ?? 0) + 1,
        );
      }
      events.push({
        id: createRequestId(),
        date,
        session,
        title: session,
        startTime: null,
        endTime: null,
        description: "",
        location: "",
        responsibilities: quarterlyColumns(session).map((role, roleIndex) => ({
          id: createRequestId(),
          name: role,
          description: "",
          departmentIds: [],
          assignments:
            roleIndex < 2 &&
            people[roleIndex] &&
            !people[roleIndex]!.memberId.startsWith("name:")
              ? [{ memberId: people[roleIndex]!.memberId, notes: "" }]
              : [],
          ...(roleIndex < 2 && people[roleIndex]?.memberId.startsWith("name:")
            ? { displayText: people[roleIndex]!.name }
            : {}),
          ...(roleIndex === 2
            ? {
                displayText:
                  QUARTERLY_TEAMS[
                    (Math.floor(sessionIndex / 2) + index * 2) %
                      QUARTERLY_TEAMS.length
                  ],
              }
            : {}),
          ...(roleIndex === 4 ? { displayText: "" } : {}),
          ...(roleIndex === 5
            ? {
                displayText: parking,
              }
            : {}),
          ...(roleIndex === 3
            ? {
                displayText:
                  QUARTERLY_CHOIRS[sessionIndex % QUARTERLY_CHOIRS.length],
              }
            : {}),
        })),
      });
      if (weekday === 0) sessionIndex++;
    }
  }
  return {
    draft: {
      categoryId: "program_guidance",
      title: `Lịch công tác quý ${["I", "II", "III", "IV"][quarter - 1]} - ${year}`,
      description: "",
      periodStart: from,
      periodEnd: to,
      settings: {
        layout: "table",
        template: "quarterly_work",
        weekdayTime: null,
        sundayTime: null,
        sessions: [...QUARTERLY_SESSIONS],
      },
      events,
    },
    memberNames: Object.fromEntries(
      people.map((person) => [person.memberId, person.name]),
    ),
    warnings: [...new Set(warnings)],
  };
}

/** Adapt drafts from the earlier four-column template without losing linked names. */
export function normalizeQuarterlySchedule<T extends ScheduleDraftValue>(
  schedule: T,
): T {
  if (!isQuarterlyWork(schedule)) return schedule;
  const aliases: Record<string, string> = {
    MC: "HDTP",
    "HD. TP.": "HDTP",
    "HD. Hát": "HD hát",
    "Hướng dẫn thờ phượng": "HD hát",
    "Ban thờ phượng": "Nhóm hát",
    "Nhóm Hát": "Nhóm hát",
    "Ban Hát": "Ban hát",
  };
  return {
    ...schedule,
    events: schedule.events.map((event) => ({
      ...event,
      responsibilities: quarterlyColumns(event.session).map((role) => {
        const existing = event.responsibilities.find(
          (duty) => (aliases[duty.name] ?? duty.name) === role,
        );
        return existing
          ? { ...existing, name: role }
          : {
              id: createRequestId(),
              name: role,
              description: "",
              assignments: [],
              departmentIds: [],
              displayText: "",
            };
      }),
    })),
  };
}
export function quarterlyTableSections<T extends ScheduleDraftValue>(
  schedule: T,
) {
  const normalized = normalizeQuarterlySchedule(schedule);
  return QUARTERLY_SESSIONS.map((session, index) => ({
    name: QUARTERLY_SECTIONS[index],
    session,
    columns: [...quarterlyColumns(session)],
    events: normalized.events
      .filter((event) => event.session === session)
      .sort((a, b) => a.date.localeCompare(b.date)),
  }));
}
export function quarterlyPolicyIssues(
  event: ScheduleEventValue,
  names: Record<string, string> = {},
): QuarterlyCellIssue[] {
  const issues: QuarterlyCellIssue[] = [];
  for (const duty of event.responsibilities) {
    const allowed = quarterlyAllowedNames(event.session, duty.name);
    if (!allowed) continue;
    const entered = [
      ...quarterlyTextNames(duty.displayText ?? ""),
      ...duty.assignments.flatMap((person) =>
        names[person.memberId] ? [names[person.memberId]] : [],
      ),
    ];
    if (entered.some((name) => !quarterlyRosterName(name, allowed)))
      issues.push({
        eventId: event.id,
        column: duty.name,
        severity: "error",
        message: `Tên phân công phải thuộc danh sách ${duty.name} · ${event.session}: ${allowed.map(shortQuarterlyName).join(", ")}.`,
      });
  }
  const parking = event.responsibilities.find((duty) => duty.name === "Giữ xe");
  const parkingKey = normalizeRosterName(parking?.displayText ?? "").replace(
    /^ban\s+/,
    "",
  );
  if (["lao nien", "thieu nien"].includes(parkingKey))
    issues.push({
      eventId: event.id,
      column: "Giữ xe",
      severity: "error",
      message: "Giữ xe không phân công cho Lão niên hoặc Thiếu niên.",
    });
  if (event.session === QUARTERLY_SESSIONS[0]) {
    const mc = event.responsibilities.find((duty) => duty.name === "HDTP");
    const entered = [
      ...quarterlyTextNames(mc?.displayText ?? ""),
      ...(mc?.assignments ?? []).flatMap((person) =>
        names[person.memberId]
          ? [normalizeRosterName(names[person.memberId])]
          : [],
      ),
    ];
    const forbidden = QUARTERLY_ROSTERS.afternoon.find((name) =>
      entered.some(
        (text) =>
          text === normalizeRosterName(name) ||
          text === normalizeRosterName(shortQuarterlyName(name)) ||
          text === normalizeRosterName(name).split(" ").slice(-2).join(" "),
      ),
    );
    if (forbidden)
      issues.push({
        eventId: event.id,
        column: "HDTP",
        severity: "error",
        message: `${shortQuarterlyName(forbidden)} thuộc danh sách HDTP buổi chiều, không được phân công HDTP buổi sáng.`,
      });
  }
  return issues;
}
export function quarterlyWorkIssues(
  draft: ScheduleDraftValue,
  conflicts: QuarterlyConflict[] = [],
  requireComplete = false,
  departments = new Map<string, string[]>(),
  names: Record<string, string> = {},
) {
  if (!isQuarterlyWork(draft)) return [];
  const issues: string[] = [];
  if (
    !CalendarDate.safeParse(draft.periodStart).success ||
    !CalendarDate.safeParse(draft.periodEnd).success
  )
    return ["Kỳ công tác không hợp lệ."];
  const { from, to } = quarterlyPeriod(
    Number(draft.periodStart.slice(0, 4)),
    Math.floor((Number(draft.periodStart.slice(5, 7)) - 1) / 3) + 1,
  );
  if (draft.periodStart !== from || draft.periodEnd !== to)
    issues.push("Kỳ công tác phải bao gồm trọn một quý.");
  const actual = new Set<string>();
  const assigned = new Set<string>();
  for (const event of draft.events) {
    if (!CalendarDate.safeParse(event.date).success) {
      issues.push("Ngày phân công không hợp lệ.");
      continue;
    }
    const label = `${displayCalendarDate(event.date)} · ${event.session}`;
    const key = `${event.date}|${event.session}`;
    if (actual.has(key)) issues.push(`${label}: trùng buổi phân công.`);
    actual.add(key);
    const weekday = calendarWeekday(event.date);
    const expected =
      weekday === 0
        ? QUARTERLY_SESSIONS.slice(0, 2)
        : weekday === 3
          ? [QUARTERLY_SESSIONS[2]]
          : [];
    if (!(expected as readonly string[]).includes(event.session))
      issues.push(`${label}: ngày hoặc buổi không thuộc lịch công tác quý.`);
    const columns = quarterlyColumns(event.session);
    if (event.responsibilities.length !== columns.length)
      issues.push(`${label}: các cột phân công không đúng mẫu.`);
    for (const role of columns) {
      const duties = event.responsibilities.filter(
        (duty) => duty.name === role,
      );
      if (duties.length !== 1) {
        issues.push(`${label}: cần đúng một cột ${role}.`);
        continue;
      }
      const duty = duties[0];
      const text = duty.displayText?.trim();
      if (
        requireComplete &&
        !["Ban nhạc", "Giữ xe"].includes(role) &&
        !(text || duty.assignments.length || duty.departmentIds.length)
      )
        issues.push(`${label} · ${role}: chưa có phân công.`);
      if (
        ["HDTP", "HD hát"].includes(role) &&
        (duty.assignments.length > 1 ||
          (text && quarterlyTextNames(text).length > 1))
      )
        issues.push(`${label} · ${role}: chỉ phân công một người.`);
    }
    issues.push(
      ...quarterlyPolicyIssues(event, names).map(
        (issue) => `${label}: ${issue.message}`,
      ),
    );
    if (quarterlyParkingMatchesChoir(event))
      issues.push(`${label}: Giữ xe phải khác Ban hát trong cùng buổi.`);
    for (const duty of event.responsibilities) {
      const members = [
        ...duty.assignments.map((item) => item.memberId),
        ...duty.departmentIds.flatMap((id) => departments.get(id) ?? []),
      ];
      const identities = new Set(members.map((id) => `id:${id}`));
      const textNames = quarterlyPersonnelColumn(duty.name)
        ? quarterlyTextNames(duty.displayText ?? "")
        : [];
      for (const id of members)
        if (names[id]) textNames.push(normalizeRosterName(names[id]));
      for (const name of textNames) identities.add(`name:${name}`);
      for (const identity of identities) {
        const day = `${event.date}|${identity}`;
        if (assigned.has(day))
          issues.push(
            `${displayCalendarDate(event.date)}: một người được phân công nhiều vai trò hoặc nhiều buổi trong cùng ngày.`,
          );
        assigned.add(day);
      }
      const conflict = conflicts.find(
        (person) =>
          person.date === event.date &&
          workAssignmentsOverlap(person, event) &&
          (members.includes(person.memberId) ||
            quarterlyTextNames(person.name ?? "").some((name) =>
              textNames.includes(name),
            )),
      );
      if (conflict)
        issues.push(
          `${label}: ${conflict.name ?? "Thành viên"} đã có phân công tiếp tân${conflict.scheduleTitle ? " trong " + conflict.scheduleTitle : ""}.`,
        );
    }
  }
  if (requireComplete)
    for (let date = from; date <= to; date = addCalendarDays(date, 1)) {
      const sessions =
        calendarWeekday(date) === 0
          ? QUARTERLY_SESSIONS.slice(0, 2)
          : calendarWeekday(date) === 3
            ? [QUARTERLY_SESSIONS[2]]
            : [];
      for (const session of sessions)
        if (!actual.has(`${date}|${session}`))
          issues.push(`${displayCalendarDate(date)}: thiếu buổi ${session}.`);
    }
  return [...new Set(issues)];
}

export type QuarterlyCellIssue = {
  eventId: string;
  column: string;
  message: string;
  severity: "error" | "warning";
};
export function shortQuarterlyName(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length < 2 || /\./.test(name)) return name;
  const middle = words.at(-2)!,
    last = words.at(-1)!;
  const initial =
    normalizeRosterName(last) === "huy"
      ? normalizeRosterName(middle) === "thieu"
        ? "Th"
        : normalizeRosterName(middle) === "trong"
          ? "Tr"
          : middle[0]
      : middle[0];
  return `${initial}. ${last}`;
}
export function quarterlyParkingMatchesChoir(event: ScheduleEventValue) {
  const choir = event.responsibilities
    .find((duty) => duty.name === "Ban hát")
    ?.displayText?.trim();
  const parking = event.responsibilities
    .find((duty) => duty.name === "Giữ xe")
    ?.displayText?.trim();
  const key = (text: string) =>
    normalizeRosterName(text).replace(/^ban\s+/, "");
  return Boolean(choir && parking && key(choir) === key(parking));
}

export function quarterlyDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? `${date.slice(8)}/${date.slice(5, 7)}`
    : date;
}
export function quarterlySundayRows(schedule: ScheduleDraftValue) {
  const sections = quarterlyTableSections(schedule);
  const dates = [
    ...new Set(
      [...sections[0].events, ...sections[1].events].map((event) => event.date),
    ),
  ].sort();
  return dates.map((date) => ({
    date,
    morning: sections[0].events.find((event) => event.date === date),
    afternoon: sections[1].events.find((event) => event.date === date),
  }));
}
export function quarterlyWeeklyRows(schedule: ScheduleDraftValue) {
  const sections = quarterlyTableSections(schedule);
  const anchors = new Set(
    [...sections[0].events, ...sections[1].events, ...sections[2].events].map(
      (event) => addCalendarDays(event.date, -calendarWeekday(event.date)),
    ),
  );
  return [...anchors].sort().map((date) => ({
    date,
    morning: sections[0].events.find((event) => event.date === date),
    afternoon: sections[1].events.find((event) => event.date === date),
    wednesday: sections[2].events.find(
      (event) => event.date === addCalendarDays(date, 3),
    ),
  }));
}
export function shortQuarterlyText(text: string, people: readonly string[]) {
  const fullNames = [
    ...new Set([...Object.values(QUARTERLY_ROSTERS).flat(), ...people]),
  ];
  return text
    .split(/([\n;,]+)/)
    .map((part) => {
      const match = fullNames.find(
        (name) =>
          normalizeRosterName(name) === normalizeRosterName(part) ||
          normalizeRosterName(name).split(" ").slice(-2).join(" ") ===
            normalizeRosterName(part),
      );
      return match ? shortQuarterlyName(match) : part;
    })
    .join("");
}
export function quarterlyCellIssues(
  draft: ScheduleDraftValue,
  conflicts: QuarterlyConflict[] = [],
  names: Record<string, string> = {},
  departments = new Map<string, string[]>(),
) {
  if (!isQuarterlyWork(draft)) return [];
  const issues: QuarterlyCellIssue[] = [];
  const seen = new Map<string, { eventId: string; column: string }>();
  function issue(eventId: string, column: string, message: string) {
    if (
      !issues.some(
        (item) =>
          item.eventId === eventId &&
          item.column === column &&
          item.message === message,
      )
    )
      issues.push({ eventId, column, message, severity: "error" });
  }
  for (const event of draft.events) {
    issues.push(...quarterlyPolicyIssues(event, names));
    if (quarterlyParkingMatchesChoir(event)) {
      issue(event.id, "Giữ xe", "Giữ xe phải khác Ban hát.");
      issue(event.id, "Ban hát", "Giữ xe phải khác Ban hát.");
    }
    for (const duty of event.responsibilities) {
      if (
        !["Ban nhạc", "Giữ xe"].includes(duty.name) &&
        !duty.assignments.length &&
        !duty.departmentIds.length &&
        !duty.displayText?.trim()
      )
        issue(event.id, duty.name, "Chưa phân công.");
      const ids = [
        ...duty.assignments.map((item) => item.memberId),
        ...duty.departmentIds.flatMap((id) => departments.get(id) ?? []),
      ];
      const textNames = quarterlyPersonnelColumn(duty.name)
        ? quarterlyTextNames(duty.displayText ?? "")
        : [];
      for (const id of ids)
        if (names[id]) textNames.push(normalizeRosterName(names[id]));
      const identities = new Set([
        ...ids.map((id) => `id:${id}`),
        ...textNames.map((name) => `name:${name}`),
      ]);
      for (const identity of identities) {
        const key = `${event.date}|${identity}`,
          previous = seen.get(key);
        if (
          previous &&
          (previous.eventId !== event.id || previous.column !== duty.name)
        ) {
          const message = "Trùng người trong cùng ngày.";
          issue(event.id, duty.name, message);
          issue(previous.eventId, previous.column, message);
        } else seen.set(key, { eventId: event.id, column: duty.name });
      }
      for (const conflict of conflicts)
        if (
          conflict.date === event.date &&
          workAssignmentsOverlap(conflict, event) &&
          (ids.includes(conflict.memberId) ||
            quarterlyTextNames(conflict.name ?? "").some((name) =>
              textNames.includes(name),
            ))
        )
          issue(
            event.id,
            duty.name,
            `${conflict.name ? shortQuarterlyName(conflict.name) : "Thành viên"} đã có lịch tiếp tân cùng buổi.`,
          );
      if (
        ["HDTP", "HD hát"].includes(duty.name) &&
        (duty.assignments.length > 1 ||
          (duty.displayText && quarterlyTextNames(duty.displayText).length > 1))
      )
        issue(event.id, duty.name, "Chỉ phân công một người.");
    }
  }
  return issues;
}
