"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  Mail,
} from "lucide-react";
import {
  useAuth,
  canCalendar,
  apiRequest,
  calendarKey,
  todayInChurch,
  calendarWeek,
  calendarWeekday,
  calendarDateInChurch,
  CALENDAR_ZONE,
  CALENDAR_WEEKDAYS,
  calendarMonth,
  addCalendarDays,
  displayCalendarDate,
  type CalendarEvent,
} from "@org/core";
import { Button, Card, ErrorMessage, cn } from "@org/ui";
import { EventEditor } from "./event-editor";
import { CalendarExport } from "./calendar-export";
type Mode = "month" | "week" | "day";
export function CalendarPage() {
  const auth = useAuth(),
    user = auth?.user;
  const [anchor, setAnchor] = useState(todayInChurch),
    [mode, setMode] = useState<Mode>("month");
  const [editor, setEditor] = useState<{
      date: string;
      event?: CalendarEvent;
    } | null>(null),
    [exporting, setExporting] = useState(false);
  const range =
    mode === "month"
      ? calendarMonth(anchor)
      : mode === "week"
        ? calendarWeek(anchor)
        : { from: anchor, to: anchor };
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
  if (auth?.loading) return <p role="status">Đang tải…</p>;
  if (!read)
    return (
      <div role="alert" className="p-6">
        <h1 className="text-xl font-semibold">
          Bạn không có quyền xem lịch sinh hoạt.
        </h1>
      </div>
    );
  const days: string[] = [];
  for (let day = range.from; day <= range.to; day = addCalendarDays(day, 1))
    days.push(day);
  const today = todayInChurch();
  function move(delta: number) {
    if (mode !== "month") {
      setAnchor(addCalendarDays(anchor, delta * (mode === "week" ? 7 : 1)));
      return;
    }
    const date = new Date(anchor.slice(0, 7) + "-01T12:00:00Z");
    date.setUTCMonth(date.getUTCMonth() + delta);
    setAnchor(date.toISOString().slice(0, 10));
  }
  const title =
    mode === "month"
      ? new Intl.DateTimeFormat("vi-VN", {
          month: "long",
          year: "numeric",
          timeZone: CALENDAR_ZONE,
        }).format(calendarDateInChurch(anchor))
      : mode === "week"
        ? `${displayCalendarDate(range.from)} – ${displayCalendarDate(range.to)}`
        : displayCalendarDate(anchor, true);
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-primary">
            Hội Thánh
          </p>
          <h1 className="flex items-center gap-3 text-3xl font-semibold">
            <CalendarDays className="text-primary" />
            Lịch sinh hoạt
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cùng sắp xếp những buổi nhóm và sinh hoạt của Hội Thánh. Giờ Việt
            Nam (GMT+7).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCalendar(user, "calendar.groups") && (
            <Button asChild variant="outline">
              <a href="/dashboard/calendar/email-groups">
                <Mail size={16} />
                Nhóm email
              </a>
            </Button>
          )}
          {canCalendar(user, "calendar.export") && (
            <Button variant="outline" onClick={() => setExporting(true)}>
              <Download size={16} />
              Xuất Word
            </Button>
          )}
          {write && (
            <Button onClick={() => setEditor({ date: anchor })}>
              <Plus size={16} />
              Tạo sinh hoạt
            </Button>
          )}
        </div>
      </header>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <Button variant="outline" onClick={() => setAnchor(today)}>
            Hôm nay
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Khoảng trước"
              onClick={() => move(-1)}
            >
              <ChevronLeft size={20} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Khoảng sau"
              onClick={() => move(1)}
            >
              <ChevronRight size={20} />
            </Button>
          </div>
          <h2
            aria-live="polite"
            className="mr-auto text-lg font-semibold capitalize"
          >
            {title}
          </h2>
          <div
            className="flex gap-1 rounded-lg border p-1"
            aria-label="Chế độ xem"
          >
            {(["month", "week", "day"] as Mode[]).map((v, i) => (
              <Button
                key={v}
                size="sm"
                variant={mode === v ? "default" : "ghost"}
                aria-pressed={mode === v}
                onClick={() => setMode(v)}
              >
                {["Tháng", "Tuần", "Ngày"][i]}
              </Button>
            ))}
          </div>
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
            {!query.data?.items.length && (
              <p className="border-b bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                Chưa có sinh hoạt trong khoảng ngày này.
                {write ? " Chọn một ngày để thêm." : ""}
              </p>
            )}
            <div className="overflow-x-auto">
              {mode !== "day" && (
                <div className="grid grid-cols-7 border-b bg-muted/20 text-center text-xs font-semibold text-muted-foreground">
                  {CALENDAR_WEEKDAYS.map((d) => (
                    <div key={d} className="py-3 text-[10px] sm:text-xs">
                      <span className="sm:hidden" aria-hidden="true">
                        {d === "Chúa nhật"
                          ? "CN"
                          : `T${CALENDAR_WEEKDAYS.indexOf(d) + 1}`}
                      </span>
                      <span className="sr-only sm:not-sr-only">{d}</span>
                    </div>
                  ))}
                </div>
              )}
              <div
                className={cn(
                  "grid",
                  mode === "day" ? "grid-cols-1" : "grid-cols-7",
                )}
              >
                {days.map((day) => {
                  const events =
                      query.data?.items.filter((e) => e.eventDate === day) ??
                      [],
                    shown = mode === "month" ? events.slice(0, 3) : events;
                  return (
                    <div
                      key={day}
                      data-calendar-date={day}
                      style={{
                        gridColumnStart:
                          mode === "day" ? 1 : calendarWeekday(day) + 1,
                      }}
                      onClick={(event) => {
                        if (write && event.target === event.currentTarget)
                          setEditor({ date: day });
                      }}
                      className={cn(
                        "min-w-0 border-b border-r p-0.5 sm:p-2 last:border-r-0",
                        mode === "month"
                          ? "min-h-24 sm:min-h-36"
                          : mode === "week"
                            ? "min-h-96"
                            : "min-h-80 p-5",
                        mode === "month" &&
                          day.slice(0, 7) !== anchor.slice(0, 7) &&
                          "bg-muted/30",
                      )}
                    >
                      <div className="mb-2 flex flex-col items-stretch justify-between gap-1 sm:flex-row sm:items-center">
                        <button
                          type="button"
                          aria-label={`${write ? "Tạo sinh hoạt" : "Xem ngày"} ${displayCalendarDate(day)}`}
                          onClick={() =>
                            write
                              ? setEditor({ date: day })
                              : (setAnchor(day), setMode("day"))
                          }
                          className={cn(
                            "flex min-h-10 min-w-0 w-full sm:w-auto sm:min-w-9 items-center justify-center rounded-full text-sm",
                            today === day
                              ? "bg-primary font-semibold text-primary-foreground"
                              : "hover:bg-muted",
                            mode === "day" && "px-3",
                          )}
                        >
                          {mode === "day"
                            ? displayCalendarDate(day, true)
                            : Number(day.slice(-2))}
                        </button>
                        {write && mode !== "month" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hidden sm:inline-flex"
                            aria-label={`Thêm ngày ${displayCalendarDate(day)}`}
                            onClick={() => setEditor({ date: day })}
                          >
                            <Plus size={15} />
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {shown.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            aria-label={`${e.timeText ? `${e.timeText} ` : ""}${e.title}`}
                            onClick={() => setEditor({ date: day, event: e })}
                            className="block min-h-11 w-full rounded-md border-l-2 border-primary bg-primary/8 px-0.5 sm:px-2 py-2 text-left transition-colors hover:bg-primary/15"
                          >
                            {e.timeText && (
                              <span
                                className={cn(
                                  "block font-medium text-primary",
                                  mode === "day"
                                    ? "text-sm"
                                    : "truncate text-[10px] sm:text-[11px]",
                                )}
                              >
                                {mode === "day" ? (
                                  e.timeText
                                ) : (
                                  <>
                                    <span className="sm:hidden">
                                      {e.startTime ?? e.timeText}
                                    </span>
                                    <span className="hidden sm:inline">
                                      {e.timeText}
                                    </span>
                                  </>
                                )}
                              </span>
                            )}
                            <span
                              className={cn(
                                "block font-medium",
                                mode === "day"
                                  ? "text-base"
                                  : "truncate text-xs",
                              )}
                            >
                              {e.title}
                            </span>
                            {mode === "day" && (
                              <span className="mt-2 block whitespace-pre-wrap text-sm text-muted-foreground">
                                {e.details}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                      {mode === "month" && events.length > 3 && (
                        <button
                          className="mt-2 min-h-8 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                          onClick={() => {
                            setAnchor(day);
                            setMode("day");
                          }}
                        >
                          +{events.length - 3} sinh hoạt khác
                        </button>
                      )}
                      {mode !== "month" && !events.length && (
                        <p className="p-3 text-sm text-muted-foreground">
                          Chưa có sinh hoạt.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </Card>
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
