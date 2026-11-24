import { LoadingView } from "@org/ui";
import { CalendarMonthPreview } from "./calendar/calendar-month-preview";

export function PageLoading({
  animated = true,
  calendar = false,
}: {
  animated?: boolean;
  calendar?: boolean;
}) {
  return calendar ? (
    <CalendarMonthPreview />
  ) : (
    <LoadingView animated={animated} />
  );
}
