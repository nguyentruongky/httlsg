import {
  receptionCellText,
  receptionCellKey,
  receptionDisplayRows,
  RECEPTION_POSITIONS,
  displayCalendarDate,
  CALENDAR_WEEKDAYS,
  calendarWeekday,
  type ReceptionRuleIssue,
  type ScheduleRecord,
  type ScheduleEventValue,
} from "@org/core";
import { cn } from "@org/ui";
import { ReceptionCellTextarea } from "./reception-cell-textarea";
export function ReceptionTable({
  schedule,
  onCellChange,
  onCellBlur,
  receptionIssues = [],
}: {
  schedule: ScheduleRecord;
  onCellChange?: (
    date: string,
    session: "Sáng" | "Tối",
    position: string,
    text: string,
  ) => void;
  onCellBlur?: (
    date: string,
    session: "Sáng" | "Tối",
    position: string,
    text: string,
  ) => void;
  receptionIssues?: ReceptionRuleIssue[];
}) {
  function content(
    date: string,
    session: "Sáng" | "Tối",
    events: ScheduleEventValue[],
    position?: string,
  ) {
    if (calendarWeekday(date) !== 0 && !events.length)
      return <p className="text-center text-muted-foreground">—</p>;
    const text = receptionCellText(schedule, events, position),
      label = position ?? "Buổi tối",
      messages = receptionIssues
        .filter(
          (issue) =>
            receptionCellKey(issue.date, issue.session, issue.position) ===
            receptionCellKey(date, session, label),
        )
        .map((issue) => issue.message),
      id =
        "reception-issue-" +
        encodeURIComponent(receptionCellKey(date, session, label));
    return (
      <div className="w-full">
        {onCellChange ? (
          <ReceptionCellTextarea
            text={text}
            label={`${session} · ${label} · ${displayCalendarDate(date)}`}
            invalid={messages.length > 0}
            description={messages.length ? id : undefined}
            onChange={(value) => onCellChange(date, session, label, value)}
            onBlur={(value) => onCellBlur?.(date, session, label, value)}
          />
        ) : (
          <p className="whitespace-pre-wrap">{text || "Chưa phân công"}</p>
        )}
        {messages.length > 0 && (
          <ul
            id={id}
            className="mt-2 space-y-1 text-xs text-rose-800 dark:text-rose-200"
          >
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  function errorCell(date: string, session: "Sáng" | "Tối", position: string) {
    return receptionIssues.some(
      (issue) =>
        receptionCellKey(issue.date, issue.session, issue.position) ===
        receptionCellKey(date, session, position),
    )
      ? "bg-rose-100 text-foreground dark:bg-rose-950"
      : undefined;
  }
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground sm:hidden">
        Vuốt ngang để xem các vị trí.
      </p>
      <div className="overflow-x-auto overscroll-x-contain rounded-lg">
        <table
          aria-label="Lịch tiếp tân"
          className="w-full min-w-[54rem] border-collapse text-left text-sm"
        >
          <thead className="bg-muted">
            <tr>
              <th
                rowSpan={2}
                className="sticky left-0 z-20 border bg-muted p-3 text-center align-middle"
              >
                Ngày
              </th>
              <th colSpan={4} className="border p-3 text-center align-middle">
                Sáng
              </th>
              <th rowSpan={2} className="border p-3 text-center align-middle">
                Tối
              </th>
            </tr>
            <tr>
              {RECEPTION_POSITIONS.map((position) => (
                <th
                  className="border p-3 text-center align-middle"
                  key={position}
                >
                  {position}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {receptionDisplayRows(schedule).map((row) => (
              <tr
                className="reception-table-row align-middle"
                key={`${row.date}:${row.extraSession ?? "regular"}`}
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 min-w-28 whitespace-nowrap border bg-inherit p-3 text-center align-middle"
                >
                  {row.extraSession && (
                    <span className="mx-auto mb-2 flex w-fit items-center rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
                      {row.extraSession}
                    </span>
                  )}
                  <span className="whitespace-nowrap">
                    {displayCalendarDate(row.date)}
                  </span>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {CALENDAR_WEEKDAYS[calendarWeekday(row.date)]}
                  </span>
                </th>
                {RECEPTION_POSITIONS.map((position) => (
                  <td
                    key={position}
                    className={cn(
                      "min-w-36 border p-3 align-middle",
                      errorCell(row.date, row.extraSession ?? "Sáng", position),
                    )}
                  >
                    {content(
                      row.date,
                      row.extraSession ?? "Sáng",
                      row.positions,
                      position,
                    )}
                  </td>
                ))}
                <td
                  className={cn(
                    "min-w-40 border p-3 align-middle",
                    !row.extraSession &&
                      errorCell(row.date, "Tối", "Buổi tối"),
                  )}
                >
                  {row.extraSession ? (
                    <p className="text-center text-muted-foreground">—</p>
                  ) : (
                    content(row.date, "Tối", row.evening)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}