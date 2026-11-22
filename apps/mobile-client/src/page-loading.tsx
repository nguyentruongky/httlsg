import { LoaderCircle } from "lucide-react";
import { CalendarMonthPreview } from "./calendar/calendar-month-preview";

export function PageLoading({
  animated = true,
  calendar = false,
}: {
  animated?: boolean;
  calendar?: boolean;
}) {
  if (calendar) return <CalendarMonthPreview />;
  if (!animated)
    return (
      <p role="status" className="p-5">
        Đang tải trang…
      </p>
    );
  return (
    <div
      role="status"
      className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-8"
    >
      <LoaderCircle
        size={28}
        strokeWidth={1.5}
        aria-hidden="true"
        className="text-muted-foreground motion-safe:animate-spin"
      />
      <span className="text-sm font-medium text-muted-foreground">
        Đang tải trang…
      </span>
    </div>
  );
}
