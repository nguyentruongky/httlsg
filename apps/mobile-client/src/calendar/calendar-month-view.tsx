import { CalendarEvent, calendarWeekday } from "@org/core";
import { displayCalendarDate } from "@org/core";
import { eventColor } from "./calendar-event";
import { cn } from "@org/ui";

type CalendarMonthViewProps = {
  days: string[];
  anchor: string;
  today: string;
  write: boolean;
  eventsByDay: Record<string, CalendarEvent[]>;
  schedulesByDayCount: Record<string, number>;
  onDayClick: (day: string) => void;
  onDayTouchStart: (e: React.TouchEvent) => void;
  onDayTouchMove: (e: React.TouchEvent) => void;
  onDayTouchEnd: () => void;
  onEventClick: (event: CalendarEvent) => void;
  onOverflowClick: (day: string) => void;
  onResponsibilityClick: (day: string) => void;
};

export function CalendarMonthView({
  days,
  anchor,
  today,
  write,
  eventsByDay,
  schedulesByDayCount,
  onDayClick,
  onDayTouchStart,
  onDayTouchMove,
  onDayTouchEnd,
  onEventClick,
  onOverflowClick,
  onResponsibilityClick,
}: CalendarMonthViewProps) {
  return (
    <div
      className="overflow-x-auto"
      onTouchStart={onDayTouchStart}
      onTouchMove={onDayTouchMove}
      onTouchEnd={onDayTouchEnd}
    >
      <div className="grid grid-cols-7 border-b bg-muted/20 text-center text-xs font-semibold text-muted-foreground">
        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((label) => (
          <div key={label} className="py-2 text-[10px] sm:py-3 sm:text-xs">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const events = eventsByDay[day] ?? [];
          const shown = events.slice(0, 3);
          const daySchedulesCount = schedulesByDayCount[day] ?? 0;
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
                  onDayClick(day);
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
                  onClick={() => write && onDayClick(day)}
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
                    onClick={() => onEventClick(e)}
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
                  onClick={() => onOverflowClick(day)}
                >
                  +{events.length - 3} chương trình khác
                </button>
              )}
              {daySchedulesCount > 0 && (
                <button
                  type="button"
                  className={cn(
                    "mt-1 block h-7 w-full min-w-0 overflow-hidden rounded-md  bg-orange-50 px-1 text-left text-[10px] font-medium leading-7 text-teal-950 transition-colors hover:bg-teal-100 sm:h-8 sm:px-2 sm:text-xs dark:border-teal-400 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:bg-teal-900/50 print:hidden",
                  )}
                  onClick={() => onResponsibilityClick(day)}
                >
                  <span className="block truncate">Phân công phục vụ</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
