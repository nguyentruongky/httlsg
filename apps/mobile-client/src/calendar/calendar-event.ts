import { type CalendarEvent } from "@org/core";

export const weekdayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export const eventColors: Record<string, string> = {
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

export function eventColor(event: CalendarEvent) {
  return eventColors[event.presetId ?? ""] ?? eventColors.default;
}