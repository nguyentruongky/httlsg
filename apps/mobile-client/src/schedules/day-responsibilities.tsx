import {
  SCHEDULE_CATEGORIES,
  scheduleDutyText,
  type ScheduleRecord,
  type ScheduleEventValue,
} from "@org/core";
import { assignmentResponsibilityLabel } from "./assignment-label";

function churchDay(text: string) {
  return text.replace(/chủ nhật/gi, "Chúa nhật");
}

function receptionSession(session: string) {
  const value = session.trim().toLocaleLowerCase("vi");
  if (["sáng", "buổi sáng"].includes(value)) return "Buổi sáng";
  if (["chiều", "buổi chiều"].includes(value)) return "Buổi chiều";
  if (["tối", "buổi tối"].includes(value)) return "Buổi tối";
  return churchDay(session);
}

function programTitle(event: ScheduleEventValue) {
  const text = `${event.session} ${event.title}`;
  const service =
    /lễ\s*(\d+)/i.exec(text)?.[1] ??
    (/ch[ủú]a? nhật/i.test(text)
      ? /sáng/i.test(text)
        ? "1"
        : /chiều/i.test(text)
          ? "2"
          : null
      : null);
  return service
    ? `Chương trình thờ phượng Chúa - Lễ ${service}`
    : "Chương trình thờ phượng Chúa";
}

function responsibilityText(
  schedule: ScheduleRecord,
  duty: ScheduleEventValue["responsibilities"][number],
) {
  const label = assignmentResponsibilityLabel(duty.name);
  const host = label === "Hướng dẫn chương trình";
  const reception = schedule.categoryId === "reception";
  const titled = reception || label === "Hướng dẫn ngợi khen thờ phượng";
  const deacons = Object.values(schedule.deaconMembers ?? {});
  const normalizeName = (value: string) =>
    value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
  function person(value: string, forceDeacon = false) {
    const explicitDeacon =
      /\((?:nam\s+|nữ\s+)?chấp sự\)/i.test(value) ||
      /^(?:chấp sự|CS\.?)\s+/i.test(value);
    const clean = value
      .replace(/\s*\((?:nam\s+|nữ\s+)?chấp sự\)/gi, "")
      .replace(/^(?:chấp sự|CS\.?|Ông|Ô\.)\s+/i, "")
      .replace(titled ? /\s*\((?:Nam|Nữ)\)/gi : /$^/, "")
      .trim();
    if (!clean || /^(?:chưa phân công|—|-)$/i.test(clean)) return clean;
    const normalized = normalizeName(clean);
    const matches = deacons.filter(
      (name) =>
        normalizeName(name) === normalized ||
        normalizeName(name).split(" ").slice(-2).join(" ") === normalized,
    );
    const deacon = forceDeacon || explicitDeacon || matches.length === 1;
    return deacon ? `Chấp sự ${clean}` : titled ? `Ông ${clean}` : clean;
  }
  if (
    schedule.settings.template === "quarterly_work" &&
    duty.displayText != null
  ) {
    return duty.displayText
      .split(/([;,\n]+)/)
      .map((part) =>
        /^[;,\n]+$/.test(part) ? (reception ? "\n" : part) : person(part, host),
      )
      .join("");
  }
  if (!titled && !host) return scheduleDutyText(schedule, duty);
  const people = duty.assignments.map((assignment) => {
    const isDeacon =
      host ||
      Boolean(schedule.deaconMembers?.[assignment.memberId]) ||
      /^(?:nam\s+|nữ\s+)?chấp sự$/i.test(assignment.notes.trim());
    const name = person(
      schedule.memberNames[assignment.memberId] ?? "Thành viên",
      isDeacon,
    );
    const notes = /^(?:(?:nam\s+|nữ\s+)?chấp sự|nam|nữ)$/i.test(
      assignment.notes.trim(),
    )
      ? ""
      : assignment.notes;
    return name + (notes ? ` (${notes})` : "");
  });
  return (
    [
      ...people,
      ...duty.departmentIds.map((id) => schedule.departmentNames[id] ?? id),
    ].join(reception ? "\n" : "; ") || "Chưa phân công"
  );
}

function sessionOrder(session: string) {
  const normalized = session.toLocaleLowerCase("vi");
  if (normalized.includes("sáng") || /lễ\s*1/.test(normalized)) return 0;
  if (normalized.includes("chiều") || /lễ\s*2/.test(normalized)) return 1;
  if (normalized.includes("tối")) return 2;
  return 3;
}

export function DayResponsibilities({
  date,
  schedules,
}: {
  date: string;
  schedules: ScheduleRecord[];
}) {
  const entries = schedules
    .flatMap((schedule) =>
      schedule.events
        .filter((event) => event.date === date)
        .map((event) => ({ schedule, event })),
    )
    .sort(
      (a, b) =>
        (a.event.startTime ?? "").localeCompare(b.event.startTime ?? "") ||
        sessionOrder(a.event.session) - sessionOrder(b.event.session) ||
        a.event.session.localeCompare(b.event.session, "vi"),
    );
  if (!entries.length) return null;
  return (
    <div className="space-y-3 print:hidden">
      {entries.map(({ schedule, event }) => {
        const program = schedule.categoryId === "program_guidance";
        const reception = schedule.categoryId === "reception";
        const session = reception
          ? receptionSession(event.session)
          : churchDay(event.session);
        const heading = program
          ? programTitle(event)
          : churchDay(
              SCHEDULE_CATEGORIES.find(
                (category) => category.id === schedule.categoryId,
              )?.name ?? schedule.title,
            );
        const subtitle = [
          ...(program && /Lễ \d+/.test(heading)
            ? []
            : reception
              ? [session]
              : [...new Set([session, churchDay(event.title)])]),
          event.startTime,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <section
            key={`${schedule.id}-${event.id}`}
            className="rounded-lg border bg-muted/20 p-3"
          >
            <h3 className="text-sm font-semibold">{heading}</h3>
            {subtitle && (
              <p className="mt-1 text-sm font-medium text-primary">
                {subtitle}
              </p>
            )}
            <dl className="mt-3 space-y-2 text-sm">
              {event.responsibilities.map((duty) => (
                <div key={duty.id}>
                  <dt
                    className={
                      reception && receptionSession(duty.name) === session
                        ? "sr-only"
                        : "font-medium"
                    }
                  >
                    {churchDay(assignmentResponsibilityLabel(duty.name))}
                  </dt>
                  <dd className="whitespace-pre-wrap break-words text-muted-foreground">
                    {responsibilityText(schedule, duty) || "Chưa phân công"}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
