import {
  quarterlyDate,
  quarterlyWeeklyRows,
  QUARTERLY_ROLES,
  quarterlyPersonnelColumn,
  shortQuarterlyText,
  scheduleDutyText,
  type QuarterlyCellIssue,
  type ScheduleEventValue,
  type ScheduleRecord,
} from "@org/core";
import { cn, Popover } from "@org/ui";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type QuarterlyCellChange = (
  eventId: string,
  column: string,
  value: string,
) => void;
function PlainCellInput({
  display,
  label,
  errorId,
  invalid,
  onChange,
}: {
  display: string;
  label: string;
  errorId?: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const text = display;
  return (
    <>
      <span className="grid grid-cols-[minmax(max-content,1fr)] items-center print:hidden">
        <span
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 whitespace-pre"
        >
          {text || "\u00a0"}
        </span>
        <input
          type="text"
          size={1}
          value={text}
          maxLength={1000}
          autoComplete="off"
          spellCheck={false}
          aria-label={label}
          aria-invalid={invalid || undefined}
          aria-describedby={errorId}
          onChange={(e) => onChange(e.target.value)}
          className="col-start-1 row-start-1 min-h-9 min-w-0 appearance-none rounded-none p-0 text-inherit"
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            background: "transparent",
            boxShadow: "none",
            transition: "none",
            textAlign: "inherit",
          }}
        />
      </span>
      <span className="hidden whitespace-pre print:inline">{display}</span>
    </>
  );
}

function ErrorCell({
  children,
  className,
  message,
  errorId,
}: {
  children: ReactNode;
  className: string;
  message: string;
  errorId?: string;
}) {
  const [open, setOpen] = useState(false);
  const pinned = useRef(false);
  useEffect(() => {
    if (!message) {
      pinned.current = false;
      setOpen(false);
    }
  }, [message]);
  return (
    <Popover.Root
      open={Boolean(message) && open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) pinned.current = false;
      }}
    >
      <Popover.Anchor asChild>
        <td
          className={className}
          tabIndex={message ? 0 : undefined}
          onMouseEnter={() => {
            if (message) setOpen(true);
          }}
          onMouseLeave={() => {
            if (!pinned.current) setOpen(false);
          }}
          onFocus={() => {
            if (message) setOpen(true);
          }}
          onBlur={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget as Node) &&
              !pinned.current
            )
              setOpen(false);
          }}
          onClick={() => {
            if (message) {
              pinned.current = true;
              setOpen(true);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              pinned.current = false;
              setOpen(false);
            } else if (
              message &&
              (event.key === "Enter" || event.key === " ") &&
              event.target === event.currentTarget
            ) {
              event.preventDefault();
              pinned.current = true;
              setOpen(true);
            }
          }}
        >
          {children}
          {message && (
            <span id={errorId} className="sr-only">
              {message}
            </span>
          )}
        </td>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          role="tooltip"
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-80 max-w-xs rounded-lg border border-red-200 bg-background px-3 py-2 text-left text-sm leading-relaxed whitespace-pre-wrap text-foreground shadow-lg dark:border-red-900"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={() => {
            pinned.current = false;
          }}
        >
          {message}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function QuarterlyWorkTable({
  schedule,
  onCellChange,
  issues = [],
}: {
  schedule: ScheduleRecord;
  onCellChange?: QuarterlyCellChange;
  issues?: QuarterlyCellIssue[];
}) {
  const people = Object.values(schedule.memberNames);
  function cell(
    event: ScheduleEventValue | undefined,
    column: string,
    scope = "empty",
  ) {
    const duty = event?.responsibilities.find((item) => item.name === column);
    const value = duty ? scheduleDutyText(schedule, duty) : "";
    const display = quarterlyPersonnelColumn(column)
      ? shortQuarterlyText(value, people)
      : value;
    const messages = issues.filter(
      (issue) => issue.eventId === event?.id && issue.column === column,
    );
    const errorText = [...new Set(messages.map((issue) => issue.message))].join(
      "\n",
    );
    const errorId =
      messages.length && duty ? `quarterly-error-${duty.id}` : undefined;

    return (
      <ErrorCell
        key={`${event?.id ?? scope}-${column}`}
        errorId={errorId}
        message={errorText}
        className={cn(
          "whitespace-nowrap border px-3 py-2 align-middle",
          column === "Nhóm hát" && "text-center",
          messages.length && "bg-red-100 dark:bg-red-950/50",
        )}
      >
        {onCellChange && event ? (
          <PlainCellInput
            display={display}
            invalid={messages.length > 0}
            errorId={errorId}
            label={`${column} · ${event.session} · ${quarterlyDate(event.date)}`}
            onChange={(text) => onCellChange(event.id, column, text)}
          />
        ) : (
          display
        )}
      </ErrorCell>
    );
  }

  const rows = quarterlyWeeklyRows(schedule);
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto overscroll-x-contain">
        <table
          aria-label="Lịch công tác quý"
          className="w-max table-auto border-collapse text-left text-sm"
        >
          <colgroup>
            {Array.from({ length: 15 }, (_, index) => (
              <col key={index} />
            ))}
          </colgroup>
          <thead className="bg-muted">
            <tr>
              <th
                rowSpan={2}
                className="sticky left-0 z-20 whitespace-nowrap border bg-muted px-3 py-2 text-center"
              >
                NGÀY
              </th>
              <th
                colSpan={QUARTERLY_ROLES.length}
                className="border px-3 py-2 text-center"
              >
                SÁNG CHÚA NHẬT
              </th>
              <th
                colSpan={QUARTERLY_ROLES.length}
                className="border px-3 py-2 text-center"
              >
                CHIỀU CHÚA NHẬT
              </th>
              <th colSpan={2} className="border px-3 py-2 text-center">
                THỨ TƯ
              </th>
            </tr>
            <tr>
              {["morning", "afternoon"].flatMap((session) =>
                QUARTERLY_ROLES.map((role) => (
                  <th
                    key={`${session}-${role}`}
                    className={cn(
                      "whitespace-nowrap border px-3 py-2",
                      role === "Nhóm hát" && "text-center",
                    )}
                  >
                    {role}
                  </th>
                )),
              )}
              <th className="whitespace-nowrap border px-3 py-2">NGÀY</th>
              <th className="whitespace-nowrap border px-3 py-2">HDTP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.date} className="reception-table-row align-middle">
                <th
                  scope="row"
                  className="sticky left-0 z-10 whitespace-nowrap border bg-inherit px-3 py-2 text-center font-medium"
                >
                  {row.morning || row.afternoon ? quarterlyDate(row.date) : ""}
                </th>
                {QUARTERLY_ROLES.map((role) =>
                  cell(row.morning, role, `${row.date}-morning`),
                )}
                {QUARTERLY_ROLES.map((role) =>
                  cell(row.afternoon, role, `${row.date}-afternoon`),
                )}
                <th className="whitespace-nowrap border px-3 py-2 text-center font-medium">
                  {row.wednesday ? quarterlyDate(row.wednesday.date) : ""}
                </th>
                {cell(row.wednesday, "HDTP", `${row.date}-wednesday`)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
