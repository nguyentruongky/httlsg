"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Printer, ImageDown } from "lucide-react";
import {
  quarterlyDocumentHeading,
  QUARTERLY_DOCUMENT_FOOTER,
  type QuarterlyCellIssue,
  isQuarterlyWork,
  isReceptionTable,
  type ReceptionRuleIssue,
  receptionDocumentHeading,
  RECEPTION_DOCUMENT_NOTES,
  RECEPTION_DOCUMENT_SIGNATURE,
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
  scheduleDutyText,
  type ScheduleRecord,
  type ScheduleEventValue,
} from "@org/core";
import { Button, Dialog, cn } from "@org/ui";
import { type QuarterlyCellChange } from "./quarterly-table";
import { saveReceptionImage } from "./reception-image";
import { saveQuarterlyImage } from "./quarterly-image";
import { ScheduleTable } from "./schedule-table";
export type ReceptionCellChange = (
  date: string,
  session: "Sáng" | "Tối",
  position: string,
  text: string,
) => void;
// A4 landscape at 96 dpi minus the 10 mm padding the printed board adds itself.
const PRINT_CONTENT_WIDTH = 1046;
const PRINT_CONTENT_HEIGHT = 710; // Reserve room for print-engine rounding.
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
  canEditQuarterlyColumn,
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
  canEditQuarterlyColumn?: (column: string) => boolean;
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
          className="assignment-detail-dialog"
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
            (saveToPhotos && boardPrint ? (
              <Button
                type="button"
                variant="outline"
                disabled={savingPhoto}
                onClick={async () => {
                  setSavingPhoto(true);
                  setPhotoError(null);
                  try {
                    if (quarterlyPrint)
                      await saveQuarterlyImage(printSchedule ?? schedule);
                    else await saveReceptionImage(printSchedule ?? schedule);
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
            canEditQuarterlyColumn={canEditQuarterlyColumn}
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
