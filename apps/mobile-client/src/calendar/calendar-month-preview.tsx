import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addCalendarDays,
  calendarDateInChurch,
  calendarMonth,
  calendarWeekday,
  CALENDAR_ZONE,
  todayInChurch,
} from "@org/core";
import { Button, Card, cn } from "@org/ui";

/** Render dates synchronously while the calendar module or session loads. */
export function CalendarMonthPreview() {
  const today = todayInChurch();
  const range = calendarMonth(today);
  const days: string[] = [];
  for (let day = range.from; day <= range.to; day = addCalendarDays(day, 1))
    days.push(day);
  const date = calendarDateInChurch(today);
  const title = `${new Intl.DateTimeFormat("vi-VN", { month: "long", timeZone: CALENDAR_ZONE }).format(date)} năm ${new Intl.DateTimeFormat("vi-VN", { year: "numeric", timeZone: CALENDAR_ZONE }).format(date)}`;
  return (
    <section className="space-y-6" aria-label="Lịch sinh hoạt" aria-busy="true">
      <header className="flex min-h-17 items-start bg-background py-3">
        <h2 className="hidden items-center gap-3 text-3xl font-semibold sm:flex">
          <CalendarDays className="text-primary" />
          Lịch sinh hoạt
        </h2>
      </header>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center border-b px-2 py-2 sm:px-4">
          <Button variant="ghost" size="icon" aria-label="Tháng trước" disabled>
            <ChevronLeft size={20} />
          </Button>
          <h2 className="min-w-0 text-center text-base font-semibold capitalize sm:text-lg">
            {title}
          </h2>
          <Button variant="ghost" size="icon" aria-label="Tháng sau" disabled>
            <ChevronRight size={20} />
          </Button>
        </div>
        <div className="grid grid-cols-7 border-b bg-muted/20 text-center text-xs font-semibold text-muted-foreground">
          {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((label) => (
            <div key={label} className="py-2 text-[10px] sm:py-3 sm:text-xs">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => (
            <div
              key={day}
              data-calendar-date={day}
              style={{ gridColumnStart: calendarWeekday(day) + 1 }}
              className={cn(
                "min-h-24 min-w-0 border-b border-r p-1 last:border-r-0 sm:min-h-32 sm:p-2",
                day.slice(0, 7) !== today.slice(0, 7) && "bg-muted/30",
              )}
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-xs sm:text-sm",
                  day === today &&
                    "bg-primary font-semibold text-primary-foreground",
                )}
              >
                {Number(day.slice(-2))}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
