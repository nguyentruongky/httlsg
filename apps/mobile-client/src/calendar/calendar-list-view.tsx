import { CalendarEvent } from "@org/core";
import { displayCalendarDate } from "@org/core";
import { eventColor } from "./calendar-event";
import { cn, Button } from "@org/ui";
import { UsersRound, Plus } from "lucide-react";

type CalendarListViewProps = {
  listDays: Array<{
    day: string;
    events: CalendarEvent[];
    schedules: Array<{ events: Array<{ date: string }> }>;
  }>;
  today: string;
  loading: boolean;
  hasError: boolean;
  write: boolean;
  onEventClick: (event: CalendarEvent) => void;
  onDayEditorOpen: (day: string, blank?: boolean) => void;
  onResponsibilityClick: (day: string) => void;
  onAddProgram: () => void;
};

export function CalendarListView({
  listDays,
  today,
  loading,
  hasError,
  write,
  onEventClick,
  onDayEditorOpen,
  onResponsibilityClick,
  onAddProgram,
}: CalendarListViewProps) {
  return (
    <div
      aria-label="Danh sách chương trình trong tháng"
      className="divide-y"
    >
      {listDays.length === 0 && (
        <p
          role="status"
          className="p-6 text-center text-sm text-muted-foreground"
        >
          {loading
            ? "Đang tải chương trình…"
            : hasError
              ? "Chưa thể hiển thị danh sách. Vui lòng thử lại."
              : "Chưa có chương trình trong tháng này."}
        </p>
      )}
      {listDays.map(({ day, events, schedules }) => (
        <section key={day} className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3
              className={cn(
                "text-sm font-semibold",
                day === today && "text-primary",
              )}
            >
              <time dateTime={day}>{displayCalendarDate(day, true)}</time>
              {day === today && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-1 text-xs">
                  Hôm nay
                </span>
              )}
            </h3>
            {write && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Tạo chương trình ${displayCalendarDate(day)}`}
                onClick={() => onDayEditorOpen(day, true)}
              >
                <Plus size={16} />
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {events.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onEventClick(event)}
                className={cn(
                  "block w-full rounded-lg border p-3 text-left transition-colors",
                  eventColor(event),
                )}
              >
                {event.timeText && (
                  <p className="mb-1 text-xs font-semibold opacity-80">
                    {event.timeText}
                  </p>
                )}
                <p className="whitespace-normal break-words text-sm font-medium">
                  {event.title}
                </p>
              </button>
            ))}
          </div>
          {schedules.length > 0 && (
            <Button
              variant="outline"
              onClick={() => onResponsibilityClick(day)}
            >
              <UsersRound size={16} />
              Phân công phục vụ
            </Button>
          )}
        </section>
      ))}
      {write && (
        <div className="p-4">
          <Button
            variant="outline"
            onClick={onAddProgram}
          >
            <Plus size={16} />
            Thêm chương trình
          </Button>
        </div>
      )}
    </div>
  );
}