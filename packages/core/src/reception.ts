import { z } from "zod";
import {
  CalendarDate,
  addCalendarDays,
  calendarWeekday,
  displayCalendarDate,
} from "./calendar";
import { createRequestId } from "./random-id";
import {
  ScheduleDraft,
  defaultScheduleSettings,
  type ScheduleDraftValue,
  type ScheduleRecord,
  type ScheduleEventValue,
} from "./schedules";
export const ReceptionEligibility = z.enum(["male_deacon", "male", "female"]);
export type ReceptionEligibilityValue = z.infer<typeof ReceptionEligibility>;
export const RECEPTION_ELIGIBILITY_LABELS = {
  male_deacon: "Nam chấp sự",
  male: "Nam",
  female: "Nữ",
} as const;
export const ReceptionTeamInput = z
  .object({
    token: z.string().regex(/^[a-f0-9]{64}$/),
    members: z
      .array(
        z
          .object({
            memberId: z.uuid().transform((id) => id.toLowerCase()),
            eligibility: ReceptionEligibility,
          })
          .strict(),
      )
      .max(200)
      .refine(
        (items) =>
          new Set(items.map((item) => item.memberId.toLowerCase())).size ===
          items.length,
        "Thành viên bị trùng.",
      ),
  })
  .strict();
export const ReceptionMonthInput = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .refine(
        (value) => CalendarDate.safeParse(value + "-01").success,
        "Tháng không hợp lệ.",
      ),
    token: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export type ReceptionPerson = {
  memberId: string;
  name: string;
  eligibility: ReceptionEligibilityValue;
};
export const RECEPTION_POSITIONS = [
  "Cửa chính",
  "Phòng trung lão",
  "Gác lửng",
  "Phòng nhóm phụ",
] as const;
/** Heading shared by the printed and exported reception board: church name + month served. */
export function receptionDocumentHeading(
  schedule: Pick<ScheduleRecord, "periodStart">,
) {
  return `HTTL SÀI GÒN - LỊCH TIẾP TÂN THÁNG ${Number(schedule.periodStart.slice(5, 7))}`;
}
/** Notes printed under the reception board. */
export const RECEPTION_DOCUMENT_NOTES = [
  "* Lịch trực tiếp tân được phân công theo khu vực.",
  "* Nếu quý chấp sự nào có việc bận phải vắng mặt, xin liên hệ với một chấp sự khác để thay thế.",
] as const;
/** Signature block printed at the bottom right of the reception board. */
export const RECEPTION_DOCUMENT_SIGNATURE = {
  role: "TRƯỞNG BAN TIẾP TÂN",
  name: "Chấp sự Nguyễn Hồ Văn Hiển",
} as const;
export const RECEPTION_REQUIREMENTS = [
  {
    session: "Sáng",
    position: "Cửa chính",
    eligibility: "male_deacon",
    count: 2,
  },
  { session: "Sáng", position: "Cửa chính", eligibility: "female", count: 2 },
  {
    session: "Sáng",
    position: "Phòng trung lão",
    eligibility: "male_deacon",
    count: 1,
  },
  {
    session: "Sáng",
    position: "Phòng trung lão",
    eligibility: "male",
    count: 1,
  },
  {
    session: "Sáng",
    position: "Gác lửng",
    eligibility: "male_deacon",
    count: 2,
  },
  { session: "Sáng", position: "Gác lửng", eligibility: "male", count: 1 },
  {
    session: "Sáng",
    position: "Phòng nhóm phụ",
    eligibility: "male_deacon",
    count: 1,
  },
  {
    session: "Tối",
    position: "Buổi tối",
    eligibility: "male_deacon",
    count: 4,
  },
  { session: "Tối", position: "Buổi tối", eligibility: "female", count: 2 },
] as const;
const eligible = (
  person: { eligibility: ReceptionEligibilityValue | "" },
  requirement: (typeof RECEPTION_REQUIREMENTS)[number],
) =>
  requirement.eligibility === "male"
    ? person.eligibility !== "" && person.eligibility !== "female"
    : person.eligibility === requirement.eligibility;
/** Monthly max-flow/min-cost allocation: maximize filled slots, minimize total count²,
 * then minimize morning/evening imbalance among people eligible for both sessions.
 * A person/session capacity of one prevents simultaneous duties. Eligibility is roster
 * metadata, never an application role grant. Deterministic tie costs rotate by month. */
export function generateReceptionSchedule(
  month: string,
  team: ReceptionPerson[],
) {
  ReceptionMonthInput.shape.month.parse(month);
  team = team.map((person) => ({
    ...person,
    memberId: person.memberId.toLowerCase(),
  }));
  if (
    !team.length ||
    team.length > 200 ||
    new Set(team.map((person) => person.memberId)).size !== team.length
  )
    throw new Error("Chọn từ 1 đến 200 thành viên không trùng nhau.");
  for (const person of team) {
    z.uuid().parse(person.memberId);
    ReceptionEligibility.parse(person.eligibility);
  }
  const start = month + "-01",
    end = new Date(
      Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0, 12),
    )
      .toISOString()
      .slice(0, 10);
  const sundays: string[] = [];
  for (let date = start; date <= end; date = addCalendarDays(date, 1))
    if (calendarWeekday(date) === 0) sundays.push(date);
  type Edge = { to: number; rev: number; cap: number; cost: number };
  const graph: Edge[][] = [];
  const node = () => {
    graph.push([]);
    return graph.length - 1;
  };
  const edge = (a: number, b: number, cap: number, cost = 0) => {
    const forward = { to: b, rev: graph[b].length, cap, cost };
    graph[a].push(forward);
    graph[b].push({ to: a, rev: graph[a].length - 1, cap: 0, cost: -cost });
    return forward;
  };
  const source = node(),
    sink = node();
  const slots = sundays.flatMap((date) =>
    RECEPTION_REQUIREMENTS.map((requirement) => ({
      date,
      requirement,
      node: node(),
      people: [] as ReceptionPerson[],
    })),
  );
  for (const slot of slots) edge(slot.node, sink, slot.requirement.count);
  const picks: {
    edge: Edge;
    slot: (typeof slots)[number];
    person: ReceptionPerson;
  }[] = [];
  for (const person of [...team].sort((a, b) =>
    a.memberId.localeCompare(b.memberId),
  )) {
    const total = node();
    for (let k = 0; k < sundays.length * 2; k++)
      edge(source, total, 1, (2 * k + 1) * 1000000000);
    const sessions = new Map<string, number>();
    for (const session of ["Sáng", "Tối"]) {
      const bucket = node();
      sessions.set(session, bucket);
      // At a fixed total, minimizing M² + E² also minimizes (M - E)².
      // The secondary cost outranks tie/position costs but cannot outweigh
      // total-workload fairness for at most 80 monthly Sunday assignments.
      for (let k = 0; k < sundays.length; k++)
        edge(
          total,
          bucket,
          1,
          person.eligibility === "male" ? 0 : (2 * k + 1) * 100000,
        );
    }
    for (const date of sundays)
      for (const session of ["Sáng", "Tối"]) {
        const service = node();
        edge(sessions.get(session)!, service, 1);
        for (const slot of slots.filter(
          (slot) =>
            slot.date === date &&
            slot.requirement.session === session &&
            eligible(person, slot.requirement),
        )) {
          let tie = 0;
          for (const character of month +
            person.memberId +
            slot.date +
            slot.requirement.position)
            tie = (tie * 31 + character.charCodeAt(0)) % 97;
          picks.push({
            edge: edge(
              service,
              slot.node,
              1,
              tie +
                (slot.requirement.eligibility === "male" &&
                person.eligibility === "male_deacon"
                  ? 1000
                  : 0),
            ),
            slot,
            person,
          });
        }
      }
  }
  let filled = 0;
  for (;;) {
    const distance = graph.map(() => Infinity),
      previous = graph.map(() => [-1, -1]),
      queued = graph.map(() => false),
      queue = [source];
    distance[source] = 0;
    queued[source] = true;
    for (let head = 0; head < queue.length; head++) {
      const from = queue[head];
      queued[from] = false;
      for (const [i, e] of graph[from].entries())
        if (e.cap > 0 && distance[e.to] > distance[from] + e.cost) {
          distance[e.to] = distance[from] + e.cost;
          previous[e.to] = [from, i];
          if (!queued[e.to]) {
            queue.push(e.to);
            queued[e.to] = true;
          }
        }
    }
    if (!Number.isFinite(distance[sink])) break;
    for (let current = sink; current !== source;) {
      const [from, i] = previous[current],
        e = graph[from][i];
      e.cap--;
      graph[current][e.rev].cap++;
      current = from;
    }
    filled++;
  }
  for (const pick of picks)
    if (pick.edge.cap === 0) pick.slot.people.push(pick.person);
  const warnings = slots
    .filter((slot) => slot.people.length < slot.requirement.count)
    .map(
      (slot) =>
        `${displayCalendarDate(slot.date)} · ${slot.requirement.session} · ${slot.requirement.position}: thiếu ${slot.requirement.count - slot.people.length} ${RECEPTION_ELIGIBILITY_LABELS[slot.requirement.eligibility].toLowerCase()}.`,
    );
  const counts = new Map(team.map((person) => [person.memberId, 0]));
  const events: ScheduleEventValue[] = sundays.flatMap((date) =>
    ["Sáng", "Tối"].map((session) => ({
      id: createRequestId(),
      date,
      title: "Tiếp tân buổi " + (session === "Sáng" ? "sáng" : "tối"),
      session,
      startTime: null,
      endTime: null,
      description: "",
      location: "",
      responsibilities: (session === "Sáng"
        ? [...RECEPTION_POSITIONS]
        : ["Buổi tối"]
      ).map((position) => {
        const groups = slots.filter(
          (slot) =>
            slot.date === date &&
            slot.requirement.session === session &&
            slot.requirement.position === position,
        );
        const assignments = groups.flatMap((slot) =>
          slot.people.map((person) => {
            counts.set(person.memberId, counts.get(person.memberId)! + 1);
            return {
              memberId: person.memberId,
              notes: RECEPTION_ELIGIBILITY_LABELS[person.eligibility],
            };
          }),
        );
        return {
          id: createRequestId(),
          name: position,
          description: groups
            .map(
              (slot) =>
                `${slot.requirement.count} ${RECEPTION_ELIGIBILITY_LABELS[slot.requirement.eligibility].toLowerCase()}`,
            )
            .join(", "),
          assignments,
          departmentIds: [],
        };
      }),
    })),
  );
  const draft = ScheduleDraft.parse({
    categoryId: "reception",
    title: `HTTL SÀI GÒN - LỊCH TIẾP TÂN ${month.slice(5)}/${month.slice(0, 4)}`,
    description: "",
    periodStart: start,
    periodEnd: end,
    settings: { ...defaultScheduleSettings("reception"), layout: "reception" },
    events,
  });
  return {
    draft,
    warnings,
    filled,
    required: sundays.length * 16,
    counts: team
      .map((person) => ({ ...person, count: counts.get(person.memberId)! }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi")),
    memberNames: Object.fromEntries(
      team.map((person) => [person.memberId, person.name]),
    ),
  };
}
/** Extra services use morning position eligibility/quotas during automatic fill only.
 * Manual edits remain unrestricted; monthly workload breaks eligible-person ties. */
export function addReceptionExtraService(
  schedule: ScheduleRecord,
  team: readonly ReceptionRosterPerson[],
  input: { date: string; session: "Sáng" | "Tối"; count: number },
): ScheduleDraftValue {
  CalendarDate.parse(input.date);
  z.enum(["Sáng", "Tối"]).parse(input.session);
  z.number().int().min(1).max(10).parse(input.count);
  if (
    schedule.categoryId !== "reception" ||
    schedule.settings.layout !== "reception"
  )
    throw new Error("Chỉ thêm ngày bổ sung vào lịch tiếp tân.");
  if (input.date < schedule.periodStart || input.date > schedule.periodEnd)
    throw new Error("Chọn ngày trong tháng phân công.");
  if (calendarWeekday(input.date) === 0)
    throw new Error(
      "Chúa nhật đã có lịch phân công riêng. Hãy sửa trực tiếp trong bảng.",
    );
  if (
    schedule.events.some(
      (event) => event.date === input.date && event.session === input.session,
    )
  )
    throw new Error("Buổi này đã có trong bảng phân công.");
  const unique = [
    ...new Map(team.map((person) => [person.memberId, person])).values(),
  ];
  if (!unique.length)
    throw new Error("Chưa có thành viên để tự điền phân công.");
  const workload = new Map(
    receptionWorkload(schedule, unique).people.map((person) => [
      person.memberId,
      person,
    ]),
  );
  const sessionCost = (person: ReceptionRosterPerson) => {
    if (person.eligibility === "male" || !person.eligibility) return 0;
    const current = workload.get(person.memberId);
    const difference = (current?.morning ?? 0) - (current?.evening ?? 0);
    return 2 * difference * (input.session === "Sáng" ? 1 : -1) + 1;
  };
  const people = unique.sort(
    (a, b) =>
      (workload.get(a.memberId)?.total ?? 0) -
        (workload.get(b.memberId)?.total ?? 0) ||
      sessionCost(a) - sessionCost(b) ||
      compareReceptionNames(a.name, b.name) ||
      a.memberId.localeCompare(b.memberId),
  );
  const selected = new Set<string>();
  const byPosition = new Map<string, ReceptionRosterPerson[]>(
    RECEPTION_POSITIONS.map((position) => [position, []]),
  );
  // Fill constrained slots before general male slots so eligible deacons are never
  // consumed by flexible positions while a deacon-only position remains empty.
  const requirements = RECEPTION_REQUIREMENTS.filter(
    (rule) => rule.session === "Sáng",
  ).sort(
    (a, b) =>
      Number(a.eligibility === "male") - Number(b.eligibility === "male"),
  );
  for (const requirement of requirements) {
    for (
      let index = 0;
      index < requirement.count && selected.size < input.count;
      index++
    ) {
      const person = people.find(
        (person) =>
          !selected.has(person.memberId) &&
          person.eligibility &&
          eligible(person, requirement),
      );
      if (!person) break;
      selected.add(person.memberId);
      byPosition.get(requirement.position)!.push(person);
    }
  }
  const event: ScheduleEventValue = {
    id: createRequestId(),
    date: input.date,
    session: input.session,
    title: `Tiếp tân bổ sung buổi ${input.session === "Sáng" ? "sáng" : "tối"}`,
    startTime: null,
    endTime: null,
    description: "",
    location: "",
    responsibilities: RECEPTION_POSITIONS.map((name) => ({
      id: createRequestId(),
      name,
      description: "",
      departmentIds: [],
      assignments: byPosition.get(name)!.map((person) => ({
        memberId: person.memberId,
        notes: person.eligibility
          ? RECEPTION_ELIGIBILITY_LABELS[person.eligibility]
          : "",
      })),
    })),
  };
  return ScheduleDraft.parse({
    categoryId: schedule.categoryId,
    title: schedule.title,
    description: schedule.description,
    periodStart: schedule.periodStart,
    periodEnd: schedule.periodEnd,
    settings: schedule.settings,
    events: [...schedule.events, event].sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.session === "Sáng" ? 0 : 1) - (b.session === "Sáng" ? 0 : 1),
    ),
  });
}
export function isReceptionTable(schedule: ScheduleRecord) {
  return (
    schedule.categoryId === "reception" &&
    schedule.settings.layout === "reception" &&
    schedule.events.every(
      (event) =>
        ["Sáng", "Tối"].includes(event.session) &&
        (event.session === "Tối" ||
          event.responsibilities.every((duty) =>
            (RECEPTION_POSITIONS as readonly string[]).includes(duty.name),
          )),
    )
  );
}
export function receptionTableRows(schedule: ScheduleRecord) {
  return [...new Set(schedule.events.map((event) => event.date))]
    .sort()
    .map((date) => ({
      date,
      morning: schedule.events.filter(
        (event) => event.date === date && event.session === "Sáng",
      ),
      evening: schedule.events.filter(
        (event) => event.date === date && event.session === "Tối",
      ),
    }));
}
/** Sunday rows keep both sessions; each extra service uses the four position columns.
 * Retain the true session for editing, workload and linked-member notifications. */
export function receptionDisplayRows(schedule: ScheduleRecord) {
  return receptionTableRows(schedule).flatMap((row) => {
    if (calendarWeekday(row.date) === 0)
      return [
        {
          ...row,
          extraSession: null as "Sáng" | "Tối" | null,
          positions: row.morning,
        },
      ];
    return (["Sáng", "Tối"] as const)
      .filter(
        (session) =>
          (session === "Sáng" ? row.morning : row.evening).length > 0,
      )
      .map((session) => ({
        ...row,
        extraSession: session as "Sáng" | "Tối" | null,
        positions: session === "Sáng" ? row.morning : row.evening,
      }));
  });
}
function receptionPosition(event: ScheduleEventValue, name: string) {
  // Older extra evenings used one combined duty; keep its full contents under Cửa chính.
  return event.session === "Tối" &&
    calendarWeekday(event.date) !== 0 &&
    name === "Buổi tối"
    ? "Cửa chính"
    : name;
}
/** Compact printed names: the final two name words, with a known reception title. */
export function formatReceptionName(name: string, notes: string) {
  const existing = name.match(/^(CS\.?|Ô\.|B\.|Ông|Bà)\s+/i)?.[1];
  const clean = name
    .replace(/^(CS\.?|Ô\.|B\.|Ông|Bà)\s+/i, "")
    .trim()
    .split(/\s+/)
    .slice(-2)
    .join(" ");
  const prefix =
    notes === "Nam chấp sự"
      ? "CS"
      : notes === "Nam"
        ? "Ô."
        : notes === "Nữ"
          ? "CS"
          : existing;
  return [prefix, clean].filter(Boolean).join(" ");
}
export function receptionCellText(
  schedule: ScheduleRecord,
  events: ScheduleEventValue[],
  position?: string,
) {
  return events
    .flatMap((event) =>
      event.responsibilities
        .filter(
          (duty) =>
            !position || receptionPosition(event, duty.name) === position,
        )
        .map((duty) =>
          duty.displayText != null
            ? duty.displayText
            : [
                ...[...duty.assignments]
                  .sort(
                    (a, b) =>
                      receptionRank(
                        a.notes === "Nữ"
                          ? "female"
                          : a.notes === "Nam chấp sự"
                            ? "male_deacon"
                            : "male",
                      ) -
                        receptionRank(
                          b.notes === "Nữ"
                            ? "female"
                            : b.notes === "Nam chấp sự"
                              ? "male_deacon"
                              : "male",
                        ) ||
                      compareReceptionNames(
                        schedule.memberNames[a.memberId] ?? "",
                        schedule.memberNames[b.memberId] ?? "",
                      ),
                  )
                  .map((assignment) =>
                    formatReceptionName(
                      schedule.memberNames[assignment.memberId] ?? "Thành viên",
                      assignment.notes,
                    ),
                  ),
                ...duty.departmentIds.map(
                  (id) => schedule.departmentNames[id] ?? id,
                ),
              ].join("\n"),
        ),
    )
    .filter((text) => text !== "")
    .join("\n");
}
/** Edit presentation text while retaining linked members and their notification scope. */
export function editReceptionCell(
  draft: ScheduleDraftValue,
  date: string,
  session: "Sáng" | "Tối",
  position: string,
  text: string,
) {
  CalendarDate.parse(date);
  let applied = false;
  let events = draft.events.map((event) =>
    event.date === date && event.session === session
      ? {
          ...event,
          responsibilities: event.responsibilities.map((duty) => {
            if (
              position !== "Buổi tối" &&
              receptionPosition(event, duty.name) !== position
            )
              return duty;
            const displayText = applied ? "" : text;
            applied = true;
            return { ...duty, displayText };
          }),
        }
      : event,
  );
  if (!applied) {
    const duty = {
      id: createRequestId(),
      name: position,
      description: "",
      displayText: text,
      assignments: [],
      departmentIds: [],
    };
    const event = events.find(
      (item) => item.date === date && item.session === session,
    );
    if (event)
      events = events.map((item) =>
        item.id === event.id
          ? { ...item, responsibilities: [...item.responsibilities, duty] }
          : item,
      );
    else
      events.push({
        id: createRequestId(),
        date,
        session,
        title: "Tiếp tân buổi " + (session === "Sáng" ? "sáng" : "tối"),
        startTime: null,
        endTime: null,
        description: "",
        location: "",
        responsibilities: [duty],
      });
  }
  return events;
}

export type ReceptionRosterPerson = Omit<ReceptionPerson, "eligibility"> & {
  eligibility: ReceptionEligibilityValue | "";
};
export type ReceptionRuleIssue = {
  date: string;
  session: "Sáng" | "Tối";
  position: string;
  message: string;
};
export const receptionCellKey = (
  date: string,
  session: string,
  position: string,
) => `${date}|${session}|${position}`;
const receptionCollator = new Intl.Collator("vi", {
  sensitivity: "base",
  numeric: true,
});
const receptionRank = (eligibility: string) =>
  eligibility === "female" ? 0 : eligibility === "male_deacon" ? 1 : 2;
function compareReceptionNames(a: string, b: string) {
  return (
    receptionCollator.compare(
      a.trim().split(/\s+/).at(-1) ?? a,
      b.trim().split(/\s+/).at(-1) ?? b,
    ) || receptionCollator.compare(a, b)
  );
}
const receptionNameOnly = (text: string) =>
  text
    .trim()
    .replace(/^[-•]\s*/, "")
    .replace(/^(CS\.?|Ô\.|Ông|B\.|Bà)\s+/i, "");
const cleanReceptionLine = (text: string) =>
  text
    .trim()
    .replace(/^[-•]\s*/, "")
    .replace(/^(CS\.?|Ô\.|Ông|B\.|Bà)\s+/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ");
function receptionResolver(team: readonly ReceptionRosterPerson[]) {
  const exact = new Map<string, ReceptionRosterPerson[]>(),
    short = new Map<string, ReceptionRosterPerson[]>();
  for (const person of team) {
    const name = cleanReceptionLine(person.name);
    exact.set(name, [...(exact.get(name) ?? []), person]);
    const alias = cleanReceptionLine(
      formatReceptionName(
        person.name,
        RECEPTION_ELIGIBILITY_LABELS[
          person.eligibility as ReceptionEligibilityValue
        ] ?? "",
      ),
    );
    short.set(alias, [...(short.get(alias) ?? []), person]);
  }
  return (line: string) => {
    const key = cleanReceptionLine(line);
    return [
      ...new Map(
        [...(exact.get(key) ?? []), ...(short.get(key) ?? [])].map((person) => [
          person.memberId,
          person,
        ]),
      ).values(),
    ];
  };
}
export function sortReceptionCellText(
  text: string,
  team: readonly ReceptionRosterPerson[],
) {
  const resolve = receptionResolver(team);
  return text
    .split("\n")
    .map((line, index) => ({ line, index, people: resolve(line) }))
    .sort((a, b) => {
      if (!a.line.trim() || !b.line.trim())
        return (
          Number(!a.line.trim()) - Number(!b.line.trim()) || a.index - b.index
        );
      if (a.people.length !== 1 || b.people.length !== 1)
        return (
          Number(a.people.length !== 1) - Number(b.people.length !== 1) ||
          a.index - b.index
        );
      return (
        receptionRank(a.people[0].eligibility) -
          receptionRank(b.people[0].eligibility) ||
        compareReceptionNames(
          receptionNameOnly(a.line),
          receptionNameOnly(b.line),
        ) ||
        a.index - b.index
      );
    })
    .map((item) => item.line)
    .join("\n");
}
/** Advisory staffing, eligibility and simultaneous-duty checks; no monthly balance warnings. */
export function receptionRuleIssues(
  schedule: ScheduleRecord,
  team: readonly ReceptionRosterPerson[],
): ReceptionRuleIssue[] {
  const resolve = receptionResolver(team),
    issues: ReceptionRuleIssue[] = [],
    seen = new Map<
      string,
      { date: string; session: "Sáng" | "Tối"; position: string }
    >();
  function issue(cell: Omit<ReceptionRuleIssue, "message">, message: string) {
    if (
      !issues.some(
        (item) =>
          receptionCellKey(item.date, item.session, item.position) ===
            receptionCellKey(cell.date, cell.session, cell.position) &&
          item.message === message,
      )
    )
      issues.push({ ...cell, message });
  }
  // Duplicate checks are independent of staffing/gender rules and also apply to
  // free-form extra services. Resolve aliases to profile IDs where possible;
  // repeated unrecognized text still deserves a duplicate warning.
  for (const row of receptionTableRows(schedule)) {
    for (const session of ["Sáng", "Tối"] as const) {
      const positioned = session === "Sáng" || calendarWeekday(row.date) !== 0;
      const events = session === "Sáng" ? row.morning : row.evening;
      for (const position of positioned
        ? [...RECEPTION_POSITIONS]
        : ["Buổi tối"]) {
        const cell = { date: row.date, session, position };
        const text = receptionCellText(
          schedule,
          events,
          positioned ? position : undefined,
        );
        for (const line of text.split("\n").filter((line) => line.trim())) {
          const matches = resolve(line);
          const person = matches.length === 1 ? matches[0] : undefined;
          const identity = person
            ? `id:${person.memberId}`
            : `text:${cleanReceptionLine(line)}`;
          const key = `${row.date}|${session}|${identity}`;
          const previous = seen.get(key);
          if (previous) {
            const name = person
              ? formatReceptionName(
                  person.name,
                  person.eligibility
                    ? RECEPTION_ELIGIBILITY_LABELS[person.eligibility]
                    : "",
                )
              : `“${line.trim()}”`;
            const message = `${name} được xếp lặp trong cùng buổi.`;
            issue(cell, message);
            issue(previous, message);
          } else seen.set(key, cell);
        }
      }
    }
  }
  for (const row of receptionTableRows(schedule).filter(
    (row) => calendarWeekday(row.date) === 0,
  ))
    for (const session of ["Sáng", "Tối"] as const)
      for (const position of session === "Sáng"
        ? [...RECEPTION_POSITIONS]
        : ["Buổi tối"]) {
        const cell = { date: row.date, session, position },
          text = receptionCellText(
            schedule,
            session === "Sáng" ? row.morning : row.evening,
            session === "Sáng" ? position : undefined,
          );
        const lines = text.split("\n").filter((line) => line.trim()),
          people = lines.flatMap((line) => {
            const matched = resolve(line);
            return matched.length === 1 ? matched : [];
          });
        const requirements = RECEPTION_REQUIREMENTS.filter(
          (rule) => rule.session === session && rule.position === position,
        );
        const uniquePeople = [
          ...new Map(
            people.map((person) => [person.memberId, person]),
          ).values(),
        ];
        const women = requirements
            .filter((rule) => rule.eligibility === "female")
            .reduce((sum, rule) => sum + rule.count, 0),
          deacons = requirements
            .filter((rule) => rule.eligibility === "male_deacon")
            .reduce((sum, rule) => sum + rule.count, 0),
          men = requirements
            .filter((rule) => rule.eligibility === "male")
            .reduce((sum, rule) => sum + rule.count, 0);
        const femaleCount = uniquePeople.filter(
            (person) => person.eligibility === "female",
          ).length,
          deaconCount = uniquePeople.filter(
            (person) => person.eligibility === "male_deacon",
          ).length,
          regularMen = uniquePeople.filter(
            (person) => person.eligibility === "male",
          ).length;
        const missingWomen = Math.max(0, women - femaleCount),
          missingDeacons = Math.max(0, deacons - deaconCount),
          missingMen = Math.max(
            0,
            men - regularMen - Math.max(0, deaconCount - deacons),
          );
        if (missingWomen) issue(cell, `Còn thiếu ${missingWomen} nữ.`);
        if (missingDeacons)
          issue(cell, `Còn thiếu ${missingDeacons} nam chấp sự.`);
        if (missingMen) issue(cell, `Còn thiếu ${missingMen} nam.`);
        for (const line of lines) {
          const matches = resolve(line);
          if (matches.length !== 1) {
            issue(
              cell,
              matches.length
                ? `“${line}” trùng tên nhiều hồ sơ; vui lòng nhập họ tên đầy đủ.`
                : `“${line}” không có trong danh sách hai Ban ngành.`,
            );
            continue;
          }
          const person = matches[0],
            displayName = formatReceptionName(
              person.name,
              RECEPTION_ELIGIBILITY_LABELS[
                person.eligibility as ReceptionEligibilityValue
              ] ?? "",
            );
          if (!person.eligibility)
            issue(cell, `${displayName} chưa cập nhật giới tính hợp lệ.`);
          else if (
            person.eligibility === "female" &&
            session === "Sáng" &&
            position !== "Cửa chính"
          )
            issue(cell, `${displayName} không thể xếp ở vị trí này.`);
          else if (
            person.eligibility === "male" &&
            (session === "Tối" ||
              ["Cửa chính", "Phòng nhóm phụ"].includes(position))
          )
            issue(cell, `${displayName} không thể xếp ở vị trí này.`);
          const title = line
            .trim()
            .replace(/^[-•]\s*/, "")
            .match(/^(CS\.?|Ô\.|Ông|B\.|Bà)\s+/i)?.[1];
          if (title && person.eligibility) {
            const shouldCS = person.eligibility !== "male";
            if (/^CS/i.test(title) !== shouldCS)
              issue(
                cell,
                `${displayName} cần dùng danh xưng ${shouldCS ? "CS" : "Ô."}.`,
              );
          }
        }
      }
  return issues;
}

/** Workload reflects the visible table, including edits, rather than stale linked assignees. */
export function receptionWorkload(
  schedule: ScheduleRecord,
  team: readonly ReceptionRosterPerson[],
) {
  const resolve = receptionResolver(team),
    people = team.map((person) => ({
      ...person,
      morning: 0,
      evening: 0,
      total: 0,
    })),
    byId = new Map(people.map((person) => [person.memberId, person]));
  let unresolved = 0;
  for (const row of receptionTableRows(schedule))
    for (const session of ["Sáng", "Tối"] as const)
      for (const position of session === "Sáng"
        ? [...RECEPTION_POSITIONS]
        : [undefined]) {
        const text = receptionCellText(
          schedule,
          session === "Sáng" ? row.morning : row.evening,
          position,
        );
        for (const line of text.split("\n").filter((line) => line.trim())) {
          const matches = resolve(line);
          if (matches.length !== 1) {
            unresolved++;
            continue;
          }
          const person = byId.get(matches[0].memberId)!;
          person.total++;
          if (session === "Sáng") person.morning++;
          else person.evening++;
        }
      }
  people.sort(
    (a, b) =>
      b.total - a.total ||
      receptionRank(a.eligibility) - receptionRank(b.eligibility) ||
      compareReceptionNames(a.name, b.name),
  );
  const total = people.reduce((sum, person) => sum + person.total, 0),
    maximum = Math.max(0, ...people.map((person) => person.total)),
    minimum = people.length
      ? Math.min(...people.map((person) => person.total))
      : 0;
  return {
    people,
    total,
    maximum,
    minimum,
    spread: maximum - minimum,
    average: people.length ? total / people.length : 0,
    unresolved,
    sundays: receptionTableRows(schedule).filter(
      (row) => calendarWeekday(row.date) === 0,
    ).length,
    required:
      receptionTableRows(schedule).filter(
        (row) => calendarWeekday(row.date) === 0,
      ).length * 16,
  };
}
