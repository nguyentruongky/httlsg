"use client";
import {
  QuarterlyWorkTable,
  type QuarterlyCellChange,
} from "./quarterly-table";
import { saveReceptionImage } from "./reception-image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Printer, ImageDown } from "lucide-react";
import {
  quarterlyDocumentHeading,
  QUARTERLY_DOCUMENT_FOOTER,
  type QuarterlyCellIssue,
  isQuarterlyWork,
  type ReceptionRuleIssue,
  receptionCellKey,
  isReceptionTable,
  receptionDisplayRows,
  receptionCellText,
  receptionDocumentHeading,
  RECEPTION_DOCUMENT_NOTES,
  RECEPTION_DOCUMENT_SIGNATURE,
  RECEPTION_POSITIONS,
  SCHEDULE_CATEGORIES,
  calendarMonth,
  calendarWeek,
  calendarWeekday,
  addCalendarDays,
  displayCalendarDate,
  calendarDateInChurch,
  CALENDAR_ZONE,
  CALENDAR_WEEKDAYS,
  todayInChurch,
  scheduleTableSections,
  scheduleDutyText,
  type ScheduleRecord,
  type ScheduleEventValue,
} from "@org/core";
import { Button, Dialog, cn } from "@org/ui";
export type ReceptionCellChange = (
  date: string,
  session: "Sáng" | "Tối",
  position: string,
  text: string,
) => void;
// A4 landscape at 96 dpi minus the 10 mm padding the printed board adds itself.
const PRINT_CONTENT_WIDTH = 1046;
const PRINT_CONTENT_HEIGHT = 710; // Reserve room for print-engine rounding.
export function ScheduleTable({
  schedule,
  onEvent,
  onCellChange,
  onCellBlur,
  receptionIssues,
  onQuarterlyCellChange,
  quarterlyIssues,
}: {
  schedule: ScheduleRecord;
  onEvent?: (event: ScheduleEventValue) => void;
  onCellChange?: ReceptionCellChange;
  onCellBlur?: ReceptionCellChange;
  receptionIssues?: ReceptionRuleIssue[];
  onQuarterlyCellChange?: QuarterlyCellChange;
  quarterlyIssues?: QuarterlyCellIssue[];
}) {
  if (isQuarterlyWork(schedule))
    return (
      <QuarterlyWorkTable
        schedule={schedule}
        onCellChange={onQuarterlyCellChange}
        issues={quarterlyIssues}
      />
    );
  if (isReceptionTable(schedule))
    return (
      <ReceptionTable
        schedule={schedule}
        onCellChange={onCellChange}
        onCellBlur={onCellBlur}
        receptionIssues={receptionIssues}
      />
    );
  return (
    <div className="space-y-5">
      {scheduleTableSections(schedule).map((section) => (
        <section key={section.name} className="space-y-2">
          <h3 className="font-semibold">{section.name}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="border p-3">Ngày / Chương trình</th>
                  {section.columns.map((name) => (
                    <th className="border p-3" key={name}>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.events.map((event) => (
                  <tr key={event.id} className="align-top">
                    <td className="min-w-40 border p-3">
                      <p className="font-medium">
                        {displayCalendarDate(event.date)}
                      </p>
                      {event.startTime && (
                        <p>
                          {event.startTime}
                          {event.endTime ? " – " + event.endTime : ""}
                        </p>
                      )}
                      <p className="break-words">{event.title}</p>
                      {event.location && (
                        <p className="text-muted-foreground">
                          {event.location}
                        </p>
                      )}
                      {onEvent && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="print:hidden"
                          onClick={() => onEvent(event)}
                        >
                          Sửa chương trình
                        </Button>
                      )}
                    </td>
                    {section.columns.map((name) => (
                      <td
                        key={name}
                        className="min-w-32 whitespace-pre-wrap break-words border p-3"
                      >
                        {event.responsibilities
                          .filter((duty) => duty.name === name)
                          .map((duty) => (
                            <div
                              key={duty.id}
                              className={cn(
                                "mb-2",
                                !duty.assignments.length &&
                                  !duty.departmentIds.length &&
                                  "text-destructive",
                              )}
                            >
                              <p>{scheduleDutyText(schedule, duty)}</p>
                              {duty.description && (
                                <p className="text-muted-foreground">
                                  {duty.description}
                                </p>
                              )}
                            </div>
                          ))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
export function ScheduleViews({
  schedule,
  onEvent,
  printable = false,
  saveToPhotos = false,
  printSchedule,
  onCellChange,
  onCellBlur,
  receptionIssues,
  onQuarterlyCellChange,
  quarterlyIssues,
  showPrintButton = true,
  printActionRef,
}: {
  schedule: ScheduleRecord;
  onEvent?: (event: ScheduleEventValue) => void;
  printable?: boolean;
  saveToPhotos?: boolean;
  printSchedule?: ScheduleRecord;
  onCellChange?: ReceptionCellChange;
  onCellBlur?: ReceptionCellChange;
  receptionIssues?: ReceptionRuleIssue[];
  onQuarterlyCellChange?: QuarterlyCellChange;
  quarterlyIssues?: QuarterlyCellIssue[];
  /** Hide the inline print button when the parent exposes printing elsewhere. */
  showPrintButton?: boolean;
  /** Lets the parent trigger the print action from a menu item. */
  printActionRef?: { current: (() => void) | null };
}) {
  const tableOnly =
    schedule.categoryId === "reception" || isQuarterlyWork(schedule);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ScheduleEventValue | null>(null);
  const [view, setView] = useState<"table" | "month" | "week">("table"),
    [anchor, setAnchor] = useState(schedule.periodStart),
    [printing, setPrinting] = useState(false);
  const [printMounted, setPrintMounted] = useState(false);
  const previousTitle = useRef<string | null>(null);
  useEffect(() => {
    setPrintMounted(true);
    const restoreTitle = () => {
      if (previousTitle.current !== null)
        document.title = previousTitle.current;
      previousTitle.current = null;
    };
    const done = () => {
      setPrinting(false);
      restoreTitle();
    };
    window.addEventListener("afterprint", done);
    return () => {
      window.removeEventListener("afterprint", done);
      restoreTitle();
    };
  }, []);
  const range = view === "week" ? calendarWeek(anchor) : calendarMonth(anchor),
    dates = [];
  for (let day = range.from; day <= range.to; day = addCalendarDays(day, 1))
    dates.push(day);
  function move(direction: number) {
    if (view === "week") setAnchor(addCalendarDays(anchor, 7 * direction));
    else {
      const d = calendarDateInChurch(anchor);
      d.setUTCMonth(d.getUTCMonth() + direction, 1);
      setAnchor(d.toISOString().slice(0, 10));
    }
  }
  const printRef = useRef<HTMLDivElement>(null),
    receptionPrint = isReceptionTable(printSchedule ?? schedule),
    quarterlyPrint = isQuarterlyWork(printSchedule ?? schedule),
    boardPrint = receptionPrint || quarterlyPrint;
  function printBoard() {
    const node = printRef.current;
    if (node && boardPrint) {
      // Shrink the board so a busy month still fits one printed page.
      node.style.zoom = "1";
      node.style.width = `${PRINT_CONTENT_WIDTH}px`;
      if (quarterlyPrint) {
        const rows = Array.from(
          node.querySelectorAll<HTMLTableRowElement>("tbody tr"),
        );
        rows.forEach((row) => {
          row.style.height = "";
        });
        const bodyHeight = rows.reduce(
          (sum, row) => sum + row.getBoundingClientRect().height,
          0,
        );
        const extraHeight = Math.max(
          0,
          PRINT_CONTENT_HEIGHT - node.scrollHeight,
        );
        if (rows.length) {
          const height = (bodyHeight + extraHeight) / rows.length;
          rows.forEach((row) => {
            row.style.height = `${height}px`;
          });
        }
      }
      let scale = 1;
      for (let pass = 0; pass < 5; pass++) {
        const next = Math.min(
          scale,
          PRINT_CONTENT_HEIGHT / Math.max(1, node.scrollHeight),
        );
        node.style.zoom = String(next);
        node.style.width = `${PRINT_CONTENT_WIDTH / next}px`;
        if (Math.abs(next - scale) < 0.001) break;
        scale = next;
      }
      previousTitle.current ??= document.title;
      const period = (printSchedule ?? schedule).periodStart;
      document.title = receptionPrint
        ? `Lich tiep tan thang ${period.slice(5, 7)}/${period.slice(0, 4)}`
        : (printSchedule ?? schedule).title;
    }
    setPrinting(true);
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }
  useEffect(() => {
    if (printActionRef) printActionRef.current = printBoard;
  });
  return (
    <div className="space-y-4">
      {selected && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          title={selected.title}
          description="Chi tiết phân công phục vụ"
          closeLabel="Đóng chi tiết lịch"
        >
          <p>
            {displayCalendarDate(selected.date)} {selected.startTime ?? ""}
          </p>
          <p>{selected.location}</p>
          <p className="whitespace-pre-wrap">{selected.description}</p>
          {selected.responsibilities.map((duty) => (
            <div key={duty.id} className="my-3">
              <h3 className="font-semibold">{duty.name}</h3>
              <p className="whitespace-pre-wrap">
                {scheduleDutyText(schedule, duty)}
              </p>
            </div>
          ))}
        </Dialog>
      )}
      {(!tableOnly || (printable && schedule.status === "published")) && (
        <div className="flex flex-wrap gap-2 print:hidden">
          {!tableOnly &&
            (
              [
                ["table", "Bảng phân công"],
                ["month", "Tháng"],
                ["week", "Tuần"],
              ] as const
            ).map(([id, label]) => (
              <Button
                type="button"
                key={id}
                variant={view === id ? "default" : "outline"}
                aria-pressed={view === id}
                onClick={() => setView(id)}
              >
                {label}
              </Button>
            ))}
          {showPrintButton &&
            printable &&
            schedule.status === "published" &&
            (saveToPhotos && receptionPrint ? (
              <Button
                type="button"
                variant="outline"
                disabled={savingPhoto}
                onClick={async () => {
                  setSavingPhoto(true);
                  setPhotoError(null);
                  try {
                    await saveReceptionImage(schedule);
                  } catch {
                    setPhotoError("Không thể lưu ảnh lịch. Vui lòng thử lại.");
                  } finally {
                    setSavingPhoto(false);
                  }
                }}
              >
                <ImageDown size={16} aria-hidden="true" />
                {savingPhoto ? "Đang tạo ảnh…" : "Lưu vào Ảnh"}
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={printBoard}>
                <Printer size={16} />
                {printSchedule ? "In lịch chính thức" : "In / Lưu PDF"}
              </Button>
            ))}
        </div>
      )}
      {photoError && (
        <p role="alert" className="text-sm text-destructive">
          {photoError}
        </p>
      )}
      {/* Kept rendered off-screen so the board can be measured before printing. */}
      {printMounted &&
        createPortal(
          <div
            data-ministry-print-root="true"
            data-ministry-print={printing ? "true" : undefined}
            data-board-print={boardPrint ? "true" : undefined}
            data-quarterly-print={quarterlyPrint ? "true" : undefined}
            className={cn(
              "invisible absolute -left-[9999px] top-0 p-[10mm]",
              boardPrint
                ? "[page:ministry-reception]"
                : "[page:ministry-print]",
            )}
          >
            <div ref={printRef} className={cn(boardPrint && "w-[1046px]")}>
              {receptionPrint ? (
                <>
                  <h1 className="text-center text-xl font-semibold">
                    {receptionDocumentHeading(printSchedule ?? schedule)}
                  </h1>
                  <ScheduleTable schedule={printSchedule ?? schedule} />
                  <ul className="mt-3 space-y-1 text-sm">
                    {RECEPTION_DOCUMENT_NOTES.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                  <div className="mt-6 ml-auto w-fit text-right">
                    <p className="font-semibold">
                      {RECEPTION_DOCUMENT_SIGNATURE.role}
                    </p>
                    <p className="whitespace-pre-line">
                      {RECEPTION_DOCUMENT_SIGNATURE.name}
                    </p>
                  </div>
                </>
              ) : quarterlyPrint ? (
                <>
                  <header className="mb-3 text-center text-sm leading-snug font-bold">
                    {quarterlyDocumentHeading(printSchedule ?? schedule).map(
                      (line) => (
                        <p key={line}>{line}</p>
                      ),
                    )}
                  </header>
                  <ScheduleTable schedule={printSchedule ?? schedule} />
                  <p className="mt-3 text-center text-sm italic">
                    {QUARTERLY_DOCUMENT_FOOTER}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-center text-xl font-semibold">
                    {(printSchedule ?? schedule).title}
                  </h1>
                  <p>
                    {
                      SCHEDULE_CATEGORIES.find(
                        (category) =>
                          category.id ===
                          (printSchedule ?? schedule).categoryId,
                      )?.name
                    }
                  </p>
                  <p>
                    {displayCalendarDate(
                      (printSchedule ?? schedule).periodStart,
                    )}{" "}
                    –{" "}
                    {displayCalendarDate((printSchedule ?? schedule).periodEnd)}
                  </p>
                  <p>Ngày xuất: {displayCalendarDate(todayInChurch())}</p>
                  <ScheduleTable schedule={printSchedule ?? schedule} />
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
      <div className="print:hidden">
        {tableOnly || view === "table" ? (
          <ScheduleTable
            onQuarterlyCellChange={onQuarterlyCellChange}
            quarterlyIssues={quarterlyIssues}
            schedule={schedule}
            onEvent={onEvent}
            onCellChange={onCellChange}
            onCellBlur={onCellBlur}
            receptionIssues={receptionIssues}
          />
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Khoảng lịch trước"
                onClick={() => move(-1)}
              >
                <ChevronLeft size={20} />
              </Button>
              <p className="text-center font-semibold">
                {view === "week"
                  ? displayCalendarDate(range.from) +
                    " – " +
                    displayCalendarDate(range.to)
                  : new Intl.DateTimeFormat("vi-VN", {
                      timeZone: CALENDAR_ZONE,
                      month: "long",
                      year: "numeric",
                    }).format(calendarDateInChurch(anchor))}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Khoảng lịch sau"
                onClick={() => move(1)}
              >
                <ChevronRight size={20} />
              </Button>
            </div>
            <div className="grid grid-cols-7 border-l border-t">
              {CALENDAR_WEEKDAYS.map((name, i) => (
                <div
                  key={name}
                  className="border-b border-r bg-muted py-2 text-center text-xs"
                >
                  {i === 0 ? "CN" : "T" + (i + 1)}
                </div>
              ))}
              {dates.map((date) => (
                <div
                  key={date}
                  className="min-h-24 min-w-0 border-b border-r p-1 sm:p-2"
                  style={{ gridColumnStart: calendarWeekday(date) + 1 }}
                >
                  <p className="text-sm text-muted-foreground">
                    {Number(date.slice(-2))}
                  </p>
                  {schedule.events
                    .filter((event) => event.date === date)
                    .map((event) => (
                      <button
                        type="button"
                        key={event.id}
                        onClick={() =>
                          onEvent ? onEvent(event) : setSelected(event)
                        }
                        className="my-1 block min-h-11 w-full break-words rounded-md bg-primary/10 px-1 py-2 text-left text-xs text-primary"
                      >
                        {event.startTime && (
                          <span className="block font-medium">
                            {event.startTime}
                          </span>
                        )}
                        {event.title}
                        {event.session && (
                          <span className="block text-muted-foreground">
                            {event.session}
                          </span>
                        )}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ReceptionTable({
  schedule,
  onCellChange,
  onCellBlur,
  receptionIssues = [],
}: {
  schedule: ScheduleRecord;
  onCellChange?: ReceptionCellChange;
  onCellBlur?: ReceptionCellChange;
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
                    !row.extraSession && errorCell(row.date, "Tối", "Buổi tối"),
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

function ReceptionCellTextarea({
  text,
  label,
  invalid,
  description,
  onChange,
  onBlur,
}: {
  text: string;
  label: string;
  invalid: boolean;
  description?: string;
  onChange: (text: string) => void;
  onBlur: (text: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const fit = () => {
      if (ref.current) {
        ref.current.style.height = "auto";
        ref.current.style.height =
          Math.max(44, ref.current.scrollHeight) + "px";
      }
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [text]);
  return (
    <textarea
      ref={ref}
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={description}
      className="block min-h-11 w-full min-w-32 resize-none appearance-none overflow-hidden rounded-none border-0 bg-transparent p-0 text-base leading-relaxed outline-none shadow-none focus:bg-transparent focus:outline-none focus:shadow-none focus-visible:bg-transparent focus-visible:ring-0 sm:text-sm"
      style={{ paddingBlock: text.split("\n").length === 1 ? ".625rem" : 0 }}
      rows={Math.max(1, text.split("\n").length)}
      maxLength={4000}
      placeholder="Chưa phân công"
      value={text}
      onPaste={(event) => {
        event.preventDefault();
        const trim = (value: string) =>
          value
            .replace(/\r\n?/g, "\n")
            .split("\n")
            .map((line) => line.trim())
            .join("\n")
            .trim();
        const pasted = trim(event.clipboardData.getData("text/plain"));
        if (!pasted) return;
        const field = event.currentTarget,
          start = field.selectionStart,
          end = field.selectionEnd;
        const insert = pasted.slice(
          0,
          Math.max(0, 4000 - field.value.length + end - start),
        );
        if (!insert) return;
        const before = field.value.slice(0, start) + insert;
        const next = trim(before + field.value.slice(end));
        const caret = Math.min(trim(before).length, next.length);
        onChange(next);
        requestAnimationFrame(() => {
          if (document.activeElement === field && field.value === next)
            field.setSelectionRange(caret, caret);
        });
      }}
      onChange={(event) => onChange(event.target.value)}
      onBlur={(event) => onBlur(event.target.value)}
    />
  );
}
