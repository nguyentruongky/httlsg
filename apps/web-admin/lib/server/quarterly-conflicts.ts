import {
  isQuarterlyWork,
  quarterlyWorkIssues,
  workAssignmentsOverlap,
  normalizeRosterName,
  QUARTERLY_ROSTERS,
  QUARTERLY_CHOIRS,
  normalizeQuarterlySchedule,
  quarterlyPersonnelColumn,
  quarterlyTextNames,
  quarterlyAllowedNames,
  quarterlyRosterName,
  shortQuarterlyName,
  quarterlyCellIssues,
  type QuarterlyCellIssue,
  type QuarterlyPerson,
  type QuarterlyConflict,
  type ScheduleDraftValue,
} from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";

export async function quarterlyRosterMembers(
  db: DB,
): Promise<QuarterlyPerson[]> {
  return (
    await db.query(
      `SELECT id AS "memberId",full_name name FROM church.member_profiles
      WHERE enabled AND deleted_at IS NULL AND NOT is_test_account
        AND regexp_replace(lower(public.unaccent(btrim(full_name))),'[[:space:]]+',' ','g')=ANY($1::text[]) ORDER BY id`,
      [
        [
          ...new Set(
            Object.values(QUARTERLY_ROSTERS).flat().map(normalizeRosterName),
          ),
        ],
      ],
    )
  ).rows;
}
export async function quarterlyDirectoryMembers(
  db: DB,
): Promise<QuarterlyPerson[]> {
  return (
    await db.query(
      `SELECT id AS "memberId",full_name name FROM church.member_profiles WHERE enabled AND deleted_at IS NULL AND NOT is_test_account ORDER BY id`,
    )
  ).rows;
}
export function resolveQuarterlyText(
  draft: ScheduleDraftValue,
  people: QuarterlyPerson[],
) {
  const normalized = normalizeQuarterlySchedule(draft);
  return {
    draft: {
      ...normalized,
      events: normalized.events.map((event) => ({
        ...event,
        responsibilities: event.responsibilities.map((duty) => {
          if (duty.displayText == null) return duty;
          if (
            ["Ban hát", "Giữ xe"].includes(duty.name) &&
            QUARTERLY_CHOIRS.some(
              (group) =>
                normalizeRosterName(group) ===
                normalizeRosterName(duty.displayText!).replace(/^ban\s+/, ""),
            )
          )
            return { ...duty, assignments: [], departmentIds: [] };
          const pool = quarterlyAllowedNames(event.session, duty.name);
          const tokens = quarterlyTextNames(duty.displayText);
          const canonical = tokens.map((text) =>
            pool
              ? (quarterlyRosterName(text, pool) ??
                quarterlyRosterName(text) ??
                text)
              : text,
          );
          const assignments = canonical.flatMap((name) => {
            const matches = people.filter(
              (person) =>
                normalizeRosterName(person.name) === normalizeRosterName(name),
            );
            const linked = matches.filter((person) =>
              duty.assignments.some(
                (assignment) => assignment.memberId === person.memberId,
              ),
            );
            const match =
              linked.length === 1
                ? linked[0]
                : matches.length === 1
                  ? matches[0]
                  : undefined;
            return match
              ? [
                  {
                    memberId: match.memberId,
                    notes:
                      duty.assignments.find(
                        (item) => item.memberId === match.memberId,
                      )?.notes ?? "",
                  },
                ]
              : [];
          });
          return {
            ...duty,
            ...(pool ? { displayText: canonical.join("; ") } : {}),
            assignments: [
              ...new Map(
                assignments.map((item) => [item.memberId, item]),
              ).values(),
            ],
            departmentIds: [],
          };
        }),
      })),
    },
    warnings: [] as string[],
    cellIssues: [] as QuarterlyCellIssue[],
  };
}

export async function checkQuarterlyWork(
  db: DB,
  draft: ScheduleDraftValue,
  complete = false,
) {
  const people = await quarterlyDirectoryMembers(db);
  const resolved = resolveQuarterlyText(draft, people);
  const ids = [
    ...new Set(
      resolved.draft.events.flatMap((event) =>
        event.responsibilities.flatMap((duty) => duty.departmentIds),
      ),
    ),
  ];
  const groups = (
    await db.query(
      "SELECT department_id,user_id FROM church.department_members WHERE department_id=ANY($1::text[])",
      [ids],
    )
  ).rows;
  const departments = new Map<string, string[]>();
  for (const row of groups)
    departments.set(row.department_id, [
      ...(departments.get(row.department_id) ?? []),
      row.user_id,
    ]);
  const conflicts = await scheduledPeople(
    db,
    "reception",
    draft.periodStart,
    draft.periodEnd,
    people,
  );
  return {
    ...resolved,
    cellIssues: [
      ...resolved.cellIssues,
      ...quarterlyCellIssues(
        resolved.draft,
        conflicts,
        Object.fromEntries(
          people.map((person) => [person.memberId, person.name]),
        ),
        departments,
      ),
    ],
    issues: quarterlyWorkIssues(
      resolved.draft,
      conflicts,
      complete,
      departments,
      Object.fromEntries(
        people.map((person) => [person.memberId, person.name]),
      ),
    ),
  };
}
function receptionTextMembers(text: string, people: QuarterlyPerson[]) {
  const lines = new Set(
    text
      .split("\n")
      .map((line) =>
        normalizeRosterName(
          line
            .trim()
            .replace(/^[-•]\s*/, "")
            .replace(/^(CS\.?|Ô\.|Ông|B\.|Bà)\s+/i, ""),
        ),
      )
      .filter(Boolean),
  );
  // Printed reception cells use the final two name words. Ambiguous short names
  // block every matching candidate rather than silently overlooking a conflict.
  return people
    .filter((person) => {
      const name = normalizeRosterName(person.name);
      return (
        lines.has(name) ||
        lines.has(name.split(" ").slice(-2).join(" ")) ||
        lines.has(normalizeRosterName(shortQuarterlyName(person.name)))
      );
    })
    .map((person) => person.memberId);
}

export async function scheduledPeople(
  db: DB,
  categoryId: "reception" | "program_guidance",
  from: string,
  to: string,
  roster?: QuarterlyPerson[],
) {
  const rows = (
    await db.query(
      `SELECT DISTINCT p.id AS "memberId",p.full_name name,e.event_date date,e.session,to_char(e.start_time,'HH24:MI') AS "startTime",to_char(e.end_time,'HH24:MI') AS "endTime",s.title AS "scheduleTitle"
    FROM church.schedules s JOIN church.schedule_events e ON e.schedule_id=s.id
    JOIN church.schedule_responsibilities r ON r.event_id=e.id
    JOIN LATERAL (
      SELECT a.member_id FROM church.schedule_assignments a WHERE a.responsibility_id=r.id
      UNION SELECT dm.user_id FROM church.schedule_department_assignments da
        JOIN church.department_members dm ON dm.department_id=da.department_id WHERE da.responsibility_id=r.id
    ) assigned ON true JOIN church.member_profiles p ON p.id=assigned.member_id
    WHERE s.category_id=$1 AND s.deleted_at IS NULL AND s.status IN ('draft','published')
      AND e.event_date BETWEEN $2 AND $3
      AND ($1='reception' OR s.settings->>'template'='quarterly_work')`,
      [categoryId, from, to],
    )
  ).rows as QuarterlyConflict[];
  {
    const people = roster ?? (await quarterlyDirectoryMembers(db));
    const cells = (
      await db.query(
        `SELECT e.event_date date,e.session,to_char(e.start_time,'HH24:MI') AS "startTime",to_char(e.end_time,'HH24:MI') AS "endTime",s.title AS "scheduleTitle",r.display_text text
       FROM church.schedules s JOIN church.schedule_events e ON e.schedule_id=s.id
       JOIN church.schedule_responsibilities r ON r.event_id=e.id
       WHERE s.category_id=$3 AND s.deleted_at IS NULL AND s.status IN ('draft','published')
         AND e.event_date BETWEEN $1 AND $2 AND r.display_text IS NOT NULL
         AND ($3='reception' OR (s.settings->>'template'='quarterly_work' AND r.name IN ('HDTP','HD hát','HD. TP.','HD. Hát','Ban nhạc','Giữ xe')))`,
        [from, to, categoryId],
      )
    ).rows;
    const names = new Map(
      people.map((person) => [person.memberId, person.name]),
    );
    for (const cell of cells)
      for (const name of quarterlyTextNames(cell.text))
        rows.push({
          memberId: `text:${name}`,
          name,
          date: cell.date,
          session: cell.session,
          scheduleTitle: cell.scheduleTitle,
          startTime: cell.startTime,
          endTime: cell.endTime,
        });
    for (const cell of cells)
      for (const memberId of receptionTextMembers(cell.text, people))
        rows.push({
          memberId,
          name: names.get(memberId),
          date: cell.date,
          session: cell.session,
          scheduleTitle: cell.scheduleTitle,
          startTime: cell.startTime,
          endTime: cell.endTime,
        });
  }
  return rows;
}

export async function validateQuarterlyConflicts(
  db: DB,
  draft: ScheduleDraftValue,
  complete = false,
) {
  if (!isQuarterlyWork(draft) && draft.categoryId !== "reception") return draft;
  const ids = [
    ...new Set(
      draft.events.flatMap((event) =>
        event.responsibilities.flatMap((duty) => duty.departmentIds),
      ),
    ),
  ];
  const groups = (
    await db.query(
      "SELECT department_id,user_id FROM church.department_members WHERE department_id=ANY($1::text[])",
      [ids],
    )
  ).rows;
  const departments = new Map<string, string[]>();
  for (const row of groups)
    departments.set(row.department_id, [
      ...(departments.get(row.department_id) ?? []),
      row.user_id,
    ]);
  if (isQuarterlyWork(draft)) {
    const result = await checkQuarterlyWork(db, draft, complete);
    if (result.issues.length)
      throw new HttpError(
        409,
        result.issues.slice(0, 8).join("\n") +
          (result.issues.length > 8
            ? `\nVà ${result.issues.length - 8} lỗi khác.`
            : ""),
      );
    return result.draft;
  } else {
    // Reception edits must not introduce a conflict after the quarterly plan has been created.
    const quarterly = await scheduledPeople(
      db,
      "program_guidance",
      draft.periodStart,
      draft.periodEnd,
    );
    for (const event of draft.events)
      for (const duty of event.responsibilities) {
        const members = new Set([
          ...receptionTextMembers(
            duty.displayText ?? "",
            quarterly.filter(
              (person): person is QuarterlyConflict & { name: string } =>
                Boolean(person.name),
            ),
          ),
          ...duty.assignments.map((item) => item.memberId),
          ...duty.departmentIds.flatMap((id) => departments.get(id) ?? []),
        ]);
        const conflict = quarterly.find(
          (person) =>
            members.has(person.memberId) &&
            person.date === event.date &&
            workAssignmentsOverlap(person, event),
        );
        if (conflict)
          throw new HttpError(
            409,
            `${event.date} · ${event.session}: ${conflict.name} đã được phân công trong ${conflict.scheduleTitle}. Vui lòng đổi người hoặc điều chỉnh lịch công tác quý trước.`,
          );
      }
  }
  return draft;
}
