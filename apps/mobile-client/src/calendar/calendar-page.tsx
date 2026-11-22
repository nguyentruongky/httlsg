"use client";
import { CalendarMonthPreview } from "./calendar-month-preview";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { navigateClient } from "../client-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import {
  useAuth,
  useWorkspace,
  readCachedQuery,
  useLocalQueryReady,
  useCalendarResponsibilities,
  canCalendar,
  hasScheduleCreation,
  canViewSchedules,
  apiRequest,
  calendarKey,
  todayInChurch,
  calendarDateInChurch,
  CALENDAR_ZONE,
  calendarMonth,
  addCalendarDays,
  displayCalendarDate,
  type CalendarEvent,
} from "@org/core";
import {
  Button,
  Card,
  Dialog,
  ErrorMessage,
  WorshipInformationPanel,
  cn,
} from "@org/ui";
const EventEditor = lazy(() =>
  import("./event-editor").then((module) => ({ default: module.EventEditor })),
);
const CalendarExport = lazy(() =>
  import("./calendar-export").then((module) => ({
    default: module.CalendarExport,
  })),
);
import { DayResponsibilities } from "../schedules/day-responsibilities";
import { eventColor } from "./calendar-event";
import { CalendarToolbar } from "./calendar-toolbar";
import { CalendarMonthView } from "./calendar-month-view";
import { CalendarListView } from "./calendar-list-view";
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
  const organization = useWorkspace((state) => state.organizationId);
  const monthStorageKey = `church:calendar-month:${organization}:${user?.id}`;
  const [anchor, setAnchor] = useState(() => {
    if (auth?.offline) {
      try {
        const saved = localStorage.getItem(monthStorageKey);
        if (saved && /^\d{4}-(0[1-9]|1[0-2])-01$/.test(saved)) return saved;
      } catch {
        /* Storage may be unavailable. */
      }
    }
    return todayInChurch();
  });
  const [viewMode, setViewMode] = useState<"month" | "list">("month");
  const [editor, setEditor] = useState<{
      date: string;
      event?: CalendarEvent;
      blank?: boolean;
    } | null>(null),
    [exporting, setExporting] = useState(false);
  const range = calendarMonth(anchor);
  const read = canCalendar(user),
    write = !auth?.offline && canCalendar(user, "calendar.write");
  const client = useQueryClient();
  const queryKey = [...calendarKey, "events", range];
  const localReady = useLocalQueryReady(client, queryKey);
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      readCachedQuery(
        client,
        queryKey,
        () =>
          apiRequest<{ items: CalendarEvent[] }>(
            `/api/events?from=${range.from}&to=${range.to}`,
            { signal },
          ),
        { revalidate: true },
      ),
    enabled: read && localReady,
    networkMode: "offlineFirst",
  });
  useEffect(() => {
    // Remember only a month whose events have actually finished loading.
    if (!query.data) return;
    try {
      localStorage.setItem(monthStorageKey, anchor.slice(0, 7) + "-01");
    } catch {
      /* Storage may be unavailable. */
    }
  }, [query.data, monthStorageKey, anchor]);
  const responsibilities = useCalendarResponsibilities(
    user?.id,
    range,
    read && ["admin", "secretary", "deacon"].includes(user?.role ?? ""),
  );
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  if (auth?.loading) return <CalendarMonthPreview />;
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
  const swipeThreshold = 50;
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  }
  function handleTouchMove(e: React.TouchEvent) {
    touchEndX.current = e.touches[0].clientX;
  }
  function handleTouchEnd() {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > swipeThreshold) {
      move(diff > 0 ? 1 : -1);
    }
  }
  const calendarDate = calendarDateInChurch(anchor);
  const loading = query.isFetching || responsibilities.isFetching;
  const eventsUnavailable = query.data === undefined;
  const title = `${new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    timeZone: CALENDAR_ZONE,
  }).format(calendarDate)} năm ${new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    timeZone: CALENDAR_ZONE,
  }).format(calendarDate)}`;
  const listDays = days
    .filter((day) => day.slice(0, 7) === anchor.slice(0, 7))
    .map((day) => ({
      day,
      events: (query.data?.items ?? [])
        .filter((event) => event.eventDate === day)
        .sort((a, b) =>
          (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"),
        ),
      schedules: (responsibilities.data?.items ?? []).filter((schedule) =>
        schedule.events.some((event) => event.date === day),
      ),
    }))
    .filter((day) => day.events.length || day.schedules.length);
  const eventsByDay: Record<string, CalendarEvent[]> = {};
  const schedulesByDayCount: Record<string, number> = {};
  const allSchedules = responsibilities.data?.items ?? [];
  for (const day of days) {
    eventsByDay[day] = (query.data?.items ?? []).filter(
      (event) => event.eventDate === day,
    );
    schedulesByDayCount[day] = allSchedules.filter((schedule) =>
      schedule.events.some((event) => event.date === day),
    ).length;
  }
  return (
    <section className="space-y-6">
      <CalendarToolbar
        viewMode={viewMode}
        user={user}
        exporting={exporting}
        onToggleView={() =>
          setViewMode((current) => (current === "month" ? "list" : "month"))
        }
        onExport={() => setExporting(true)}
        onOpenEmailGroups={() =>
          navigateClient("/client/calendar/email-groups")
        }
      />
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
            className="flex min-w-0 items-center justify-center gap-2 text-center text-base font-semibold capitalize sm:text-lg"
          >
            {title}
            <LoaderCircle
              size={16}
              className="shrink-0 animate-spin text-muted-foreground"
              role="status"
              aria-label="Đang tải lịch"
              opacity={loading ? 1 : 0}
            />
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
        {!auth?.offline && (query.error || responsibilities.error) && (
          <div
            className="flex min-h-11 items-center gap-3 border-b px-4 py-2 text-sm text-muted-foreground"
            aria-live="polite"
            aria-busy={query.isFetching || responsibilities.isFetching}
          >
            <ErrorMessage error={query.error ?? responsibilities.error} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void query.refetch();
                void responsibilities.refetch();
              }}
            >
              Thử lại
            </Button>
          </div>
        )}
        {viewMode === "list" ? (
          <CalendarListView
            listDays={listDays}
            today={today}
            loading={loading || (!localReady && !auth?.offline)}
            unavailable={eventsUnavailable}
            hasError={Boolean(query.error || responsibilities.error)}
            write={write}
            onEventClick={(event) => setSelectedEvent(event)}
            onDayEditorOpen={(day) => setEditor({ date: day, blank: true })}
            onResponsibilityClick={(day) => setResponsibilityDate(day)}
            onAddProgram={() =>
              setEditor({ date: todayInChurch(), blank: true })
            }
          />
        ) : (
          <CalendarMonthView
            days={days}
            anchor={anchor}
            today={today}
            write={write}
            eventsByDay={eventsByDay}
            schedulesByDayCount={schedulesByDayCount}
            onDayClick={(day) => setEditor({ date: day })}
            onDayTouchStart={handleTouchStart}
            onDayTouchMove={handleTouchMove}
            onDayTouchEnd={handleTouchEnd}
            onEventClick={(event) => setSelectedEvent(event)}
            onOverflowClick={(day) => setOverflowDate(day)}
            onResponsibilityClick={(day) => setResponsibilityDate(day)}
          />
        )}
      </Card>
      {responsibilityDate && (
        <Dialog
          className="calendar-detail-dialog"
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
          className="calendar-detail-dialog"
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
          className="calendar-detail-dialog"
          open
          title={selectedEvent.title}
          description={`${displayCalendarDate(selectedEvent.eventDate, true)}${selectedEvent.timeText ? ` · ${selectedEvent.timeText}` : ""}`}
          footer={
            auth?.offline ? undefined : (
              <div className="flex justify-end gap-2">
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
                  {write ? "Chỉnh sửa" : "Thêm thông tin"}
                </Button>
              </div>
            )
          }
          closeLabel="Đóng chương trình"
          onOpenChange={(open) => {
            if (!open) setSelectedEvent(null);
          }}
        >
          <div className="space-y-4">
            {selectedEvent.details && (
              <>
                <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed">
                  {selectedEvent.details}
                </p>
                <WorshipInformationPanel draft={selectedEvent.originalText} />
              </>
            )}
          </div>
        </Dialog>
      )}
      {editor && (
        <Suspense fallback={<p role="status">Đang tải trình chỉnh sửa…</p>}>
          <EventEditor
            key={editor.event?.id ?? editor.date}
            date={editor.date}
            event={editor.event}
            blank={editor.blank}
            onClose={() => setEditor(null)}
          />
        </Suspense>
      )}
      {exporting && (
        <Suspense fallback={<p role="status">Đang tải xuất lịch…</p>}>
          <CalendarExport date={anchor} onClose={() => setExporting(false)} />
        </Suspense>
      )}
    </section>
  );
}
