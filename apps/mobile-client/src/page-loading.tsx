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
      className="flex min-h-[60dvh] items-center justify-center p-8"
    >
      <img
        src="/brand-logo.png"
        alt=""
        width={80}
        height={80}
        className="page-loading-logo size-20 object-contain"
      />
      <span className="sr-only">Đang tải trang…</span>
    </div>
  );
}
