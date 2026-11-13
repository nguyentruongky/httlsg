"use client";
import { useState } from "react";
import { navigateClient } from "../client-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  Mail,
  MoreVertical,
  List,
  Pencil,
  BookOpen,
  Church,
  Megaphone,
  UsersRound,
} from "lucide-react";
import {
  useAuth,
  canCalendar,
  hasScheduleManagement,
  apiRequest,
  calendarKey,
  todayInChurch,
  calendarWeekday,
  calendarDateInChurch,
  CALENDAR_ZONE,
  calendarMonth,
  addCalendarDays,
  displayCalendarDate,
  type CalendarEvent,
  type ScheduleRecord,
} from "@org/core";
import {
  Button,
  Card,
  DropdownMenu,
  Dialog,
  MenuItem,
  ErrorMessage,
  cn,
} from "@org/ui";
import { EventEditor } from "./event-editor";
import { CalendarExport } from "./calendar-export";
import { DayResponsibilities } from "../../../mobile-client/src/schedules/day-responsibilities";
const weekdayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const eventColors: Record<string, string> = {
  "worship-program":
    "border-blue-200 bg-blue-100 text-blue-950 hover:bg-blue-200 dark:border-blue-800 dark:bg-blue-950/70 dark:text-blue-100 dark:hover:bg-blue-900",
  "tvcs-fellowship":
    "border-cyan-200 bg-cyan-100 text-cyan-950 hover:bg-cyan-200 dark:border-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-100 dark:hover:bg-cyan-900",
  "evangelism-fellowship":
    "border-emerald-200 bg-emerald-100 text-emerald-950 hover:bg-emerald-200 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-100 dark:hover:bg-emerald-900",
  "weekly-bible-study":
    "border-amber-200 bg-amber-100 text-amber-950 hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-100 dark:hover:bg-amber-900",
  default:
    "border-rose-200 bg-rose-100 text-rose-950 hover:bg-rose-200 dark:border-rose-800 dark:bg-rose-950/70 dark:text-rose-100 dark:hover:bg-rose-900",
};
function eventColor(event: CalendarEvent) {
  return eventColors[event.presetId ?? ""] ?? eventColors.default;
}
// function EventIcon({ event }: { event: CalendarEvent }) {
//   const Icon =
//     event.presetId === "worship-program"
//       ? Church
//       : event.presetId === "weekly-bible-study"
//         ? BookOpen
//         : event.presetId === "evangelism-fellowship"
//           ? Megaphone
//           : event.presetId === "tvcs-fellowship"
//             ? UsersRound
//             : CalendarDays;
//   return <Icon size={12} className="shrink-0" aria-hidden="true" />;
// }
export function CalendarPage() {
  const [responsibilityDate, setResponsibilityDate] = useState<string | null>(
    null,
  );
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [overflowDate, setOverflowDate] = useState<string | null>(null);
  const auth = useAuth(),
    user = auth?.user;
  const [anchor, setAnchor] = useState(todayInChurch);
  const [editor, setEditor] = useState<{
      date: string;
      event?: CalendarEvent;
    } | null>(null),
    [exporting, setExporting] = useState(false);
  const range = calendarMonth(anchor);
  const read = canCalendar(user),
    write = canCalendar(user, "calendar.write");
  const query = useQuery({
    queryKey: [...calendarKey, "events", range],
    queryFn: () =>
      apiRequest<{ items: CalendarEvent[] }>(
        `/api/events?from=${range.from}&to=${range.to}`,
      ),
    enabled: read,
  });
  const responsibilities = useQuery({
    queryKey: ["calendar-responsibilities", user?.id, range],
    queryFn: () =>
      apiRequest<{ items: ScheduleRecord[] }>(
        `/api/calendar-responsibilities?from=${range.from}&to=${range.to}`,
      ),
    enabled: read && (user?.role === "admin" || user?.role === "secretary"),
  });
  if (auth?.loading) return <p role="status">Đang tải…</p>;
  if (!read)
    return (
      <div role="alert" className="p-6">
        <h1 className="text-xl font-semibold">
          Bạn không có quyền xem lịch chương trình.
        </h1>
      </div>
    );
  const days: string[] = [];
  for (let day = range.from; day <= range.to; day = addCalendarDays(day, 1))
    days.push(day);
  const today = todayInChurch();
  function move(delta: number) {
    const date = new Date(anchor.slice(0, 7) + "-01T12:00:00Z");
    date.setUTCMonth(date.getUTCMonth() + delta);
    setAnchor(date.toISOString().slice(0, 10));
  }
  const calendarDate = calendarDateInChurch(anchor);
  const title = `${new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    timeZone: CALENDAR_ZONE,
  }).format(calendarDate)} năm ${new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    timeZone: CALENDAR_ZONE,
  }).format(calendarDate)}`;
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-3 text-3xl font-semibold">
            <CalendarDays className="hidden sm:block text-primary" />
            <span className="hidden sm:block">Lịch sinh hoạt</span>
          </h2>
        </div>
        <DropdownMenu
          animateOnMobile
          label=""
          trigger={
            <Button variant="ghost" size="icon" aria-label="Menu lịch">
              <MoreVertical size={21} />
            </Button>
          }
        >
          {canCalendar(user, "calendar.export") && (
            <MenuItem onSelect={() => setExporting(true)}>
              <Download size={16} />
              Tải thông báo
            </MenuItem>
          )}
          {canCalendar(user, "calendar.groups") && (
            <MenuItem
              onSelect={() =>
                navigateClient("/dashboard/calendar/email-groups")
              }
            >
              <Mail size={16} />
              Nhóm email nhận thông báo
            </MenuItem>
          )}
          {hasScheduleManagement(user) && (
            <>
              <MenuItem onSelect={() => navigateClient("/dashboard/schedules")}>
                <List size={16} />
                Xem lịch phân công
              </MenuItem>
              <MenuItem
                onSelect={() => navigateClient("/dashboard/schedules?create=1")}
              >
                <Plus size={16} />
                Tạo lịch phân công
              </MenuItem>
            </>
          )}
        </DropdownMenu>
      </header>
      {responsibilities.error && (
        <ErrorMessage error={responsibilities.error} />
      )}
      {(user?.role === "admin" || user?.role === "secretary") &&
        responsibilities.isPending && (
          <p role="status" className="text-sm text-muted-foreground">
            Đang tải phân công phục vụ…
          </p>
        )}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center border-b px-2 py-2 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Tháng trước"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={20} />
          </Button>
          <h2
            aria-live="polite"
            className="min-w-0 text-center text-base font-semibold capitalize sm:text-lg"
          >
            {title}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Tháng sau"
            onClick={() => move(1)}
          >
            <ChevronRight size={20} />
          </Button>
        </div>
        {query.isPending ? (
          <p role="status" className="p-12 text-center">
            Đang tải lịch…
          </p>
        ) : query.error ? (
          <div className="space-y-3 p-6">
            <ErrorMessage error={query.error} />
            <Button variant="outline" onClick={() => void query.refetch()}>
              Thử lại
            </Button>
          </div>
        ) : (
          <>
            {!query.data?.items.length &&
              !responsibilities.data?.items.length && (
                <p className="border-b bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  Chưa có chương trình trong khoảng ngày này.
                  {write ? " Chọn một ngày để thêm." : ""}
                </p>
              )}
            <div className="overflow-x-auto">
              <div className="grid grid-cols-7 border-b bg-muted/20 text-center text-xs font-semibold text-muted-foreground">
                {weekdayLabels.map((label) => (
                  <div
                    key={label}
                    className="py-2 text-[10px] sm:py-3 sm:text-xs"
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const events =
                      query.data?.items.filter((e) => e.eventDate === day) ??
                      [],
                    shown = events.slice(0, 3),
                    daySchedules =
                      responsibilities.data?.items.filter((schedule) =>
                        schedule.events.some((event) => event.date === day),
                      ) ?? [];
                  return (
                    <div
                      key={day}
                      data-calendar-date={day}
                      style={{ gridColumnStart: calendarWeekday(day) + 1 }}
                      onClick={(event) => {
                        if (
                          write &&
                          !(event.target as Element).closest(
                            "button, a, input, select, textarea, [role=button]",
                          )
                        )
                          setEditor({ date: day });
                      }}
                      className={cn(
                        "min-w-0 border-b border-r p-1 sm:p-2 last:border-r-0",
                        write && "cursor-pointer",
                        "min-h-24 sm:min-h-32",
                        day.slice(0, 7) !== anchor.slice(0, 7) && "bg-muted/30",
                      )}
                    >
                      <div className="mb-2 flex flex-col items-stretch justify-between gap-1 sm:flex-row sm:items-center">
                        <button
                          type="button"
                          aria-label={`${write ? "Tạo chương trình" : "Ngày"} ${displayCalendarDate(day)}`}
                          onClick={() => write && setEditor({ date: day })}
                          className={cn(
                            "flex size-8 items-center justify-center rounded-full text-xs sm:text-sm",
                            today === day
                              ? "bg-primary font-semibold text-primary-foreground"
                              : "hover:bg-muted",
                          )}
                        >
                          {Number(day.slice(-2))}
                        </button>
                      </div>
                      <div className="space-y-1">
                        {shown.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            aria-label={`${e.timeText ? `${e.timeText} ` : ""}${e.title}`}
                            title={`${e.timeText ? `${e.timeText} · ` : ""}${e.title}`}
                            onClick={() => setSelectedEvent(e)}
                            className={cn(
                              "block h-7 w-full min-w-0 overflow-hidden rounded-sm border px-1 text-left text-[10px] font-medium leading-7 transition-colors sm:h-8 sm:px-2 sm:text-xs",
                              eventColor(e),
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-1">
                              <span className="truncate">{e.title}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                      {events.length > 3 && (
                        <button
                          type="button"
                          className="mt-1 min-h-7 text-[10px] font-semibold text-primary underline-offset-4 hover:underline sm:text-xs"
                          onClick={() => setOverflowDate(day)}
                        >
                          +{events.length - 3} chương trình khác
                        </button>
                      )}
                      {daySchedules.length > 0 && (
                        <button
                          type="button"
                          className={cn(
                            "mt-1 block h-7 w-full min-w-0 overflow-hidden rounded-md  bg-orange-50 px-1 text-left text-[10px] font-medium leading-7 text-teal-950 transition-colors hover:bg-teal-100 sm:h-8 sm:px-2 sm:text-xs dark:border-teal-400 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:bg-teal-900/50 print:hidden",
                          )}
                          onClick={() => setResponsibilityDate(day)}
                        >
                          <span className="block truncate">
                            Phân công phục vụ
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </Card>
      {responsibilityDate && (
        <Dialog
          open
          title={`Phân công phục vụ · ${displayCalendarDate(responsibilityDate)}`}
          description="Nhân sự phục vụ theo từng chương trình và buổi nhóm."
          onOpenChange={(open) => {
            if (!open) setResponsibilityDate(null);
          }}
        >
          <DayResponsibilities
            date={responsibilityDate}
            schedules={responsibilities.data?.items ?? []}
          />
        </Dialog>
      )}
      {overflowDate && (
        <Dialog
          open
          title={displayCalendarDate(overflowDate, true)}
          description="Các chương trình trong ngày."
          onOpenChange={(open) => {
            if (!open) setOverflowDate(null);
          }}
        >
          <div className="space-y-2">
            {(query.data?.items ?? [])
              .filter((event) => event.eventDate === overflowDate)
              .map((event) => (
                <button
                  key={event.id}
                  type="button"
                  aria-label={`${event.timeText ? `${event.timeText} ` : ""}${event.title}`}
                  className={cn(
                    "block min-h-11 w-full rounded-md border-l-2 px-3 py-2 text-left text-sm",
                    eventColor(event),
                  )}
                  onClick={() => {
                    setOverflowDate(null);
                    setSelectedEvent(event);
                  }}
                >
                  {event.timeText && (
                    <span className="mr-2 font-medium opacity-80">
                      {event.timeText}
                    </span>
                  )}
                  {event.title}
                </button>
              ))}
          </div>
        </Dialog>
      )}
      {selectedEvent && (
        <Dialog
          open
          title={selectedEvent.title}
          description={`${displayCalendarDate(selectedEvent.eventDate, true)}${selectedEvent.timeText ? ` · ${selectedEvent.timeText}` : ""}`}
          closeLabel="Đóng chương trình"
          onOpenChange={(open) => {
            if (!open) setSelectedEvent(null);
          }}
        >
          <div className="space-y-4">
            {selectedEvent.details && (
              <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed">
                {selectedEvent.details}
              </p>
            )}
            {write && (
              <div className="flex justify-end border-t pt-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditor({
                      date: selectedEvent.eventDate,
                      event: selectedEvent,
                    });
                    setSelectedEvent(null);
                  }}
                >
                  <Pencil size={16} />
                  Chỉnh sửa
                </Button>
              </div>
            )}
          </div>
        </Dialog>
      )}
      {editor && (
        <EventEditor
          key={editor.event?.id ?? editor.date}
          date={editor.date}
          event={editor.event}
          onClose={() => setEditor(null)}
        />
      )}
      {exporting && (
        <CalendarExport date={anchor} onClose={() => setExporting(false)} />
      )}
    </section>
  );
}
