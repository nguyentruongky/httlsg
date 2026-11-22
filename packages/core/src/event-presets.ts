import { parseEventText } from "./event-parser";
import { isWorshipProgramText } from "./worship/parser";
import {
  CalendarDate,
  displayCalendarDate,
  calendarWeekday,
  type CalendarEvent,
} from "./calendar";

export interface EventPreset {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly description?: string;
  readonly template: string;
  /** Existing recipient group to select when this preset is applied. */
  readonly emailGroupName?: string;
  readonly supportedVariables?: readonly string[];
}
export interface EventPresetContext {
  /** Selected church calendar date, in YYYY-MM-DD format. */
  date?: string;
  service_number?: string;
}

export const EVENT_PRESETS: readonly EventPreset[] = [
  {
    id: "worship-program",
    emailGroupName: "Chương trình thờ phượng",
    name: "Chương trình thờ phượng",
    category: "Chương trình Hội Thánh",
    description:
      "Mẫu nội dung để chuẩn bị lịch trực và chương trình thờ phượng.",
    supportedVariables: ["date", "service_number"],
    template: `Chương trình thờ phượng Chúa ngày {{date}} – Lễ {{service_number}}
Chủ đề: 
Diễn giả: 
Kinh Thánh nền tảng: 
Câu gốc: 
HDCT: 
Kinh Thánh đầu giờ: 
Hát dẫn: 
1. 
2. 
KTĐĐ: 
Ban hát lễ: 
Dâng hiến: `,
  },
  {
    id: "evangelism-fellowship",
    name: "Bồi linh - sinh hoạt Ban Truyền giảng",
    category: "Sinh hoạt Ban ngành",
    description: "Sinh hoạt định kỳ của Ban Truyền giảng.",
    template:
      "18g00: Bồi linh - sinh hoạt định kỳ của Ban Truyền giảng Hội Thánh tại phòng Ban Trung niên.",
  },
  {
    id: "tvcs-fellowship",
    name: "Bồi linh - sinh hoạt Ban Thăm viếng chăm sóc",
    category: "Sinh hoạt Ban ngành",
    description: "Sinh hoạt định kỳ của Ban Thăm viếng chăm sóc Hội Thánh.",
    template:
      "18g00: Bồi linh - sinh hoạt định kỳ của Ban Thăm viếng chăm sóc Hội Thánh tại phòng Ban Trung niên.",
  },
  {
    id: "weekly-bible-study",
    name: "Chương trình học Kinh Thánh hàng tuần",
    category: "Chương trình Hội Thánh",
    description: "Chương trình học Kinh Thánh theo chủ đề hàng tuần.",
    template:
      "18g00: Chương trình học Kinh Thánh hàng tuần của Hội Thánh tiếp tục với loạt bài chủ đề: ",
  },
];

/** Plain-text, single-pass substitution: unknown/missing date tokens survive. */
export function renderEventPreset(
  preset: EventPreset,
  context: EventPresetContext = {},
): string {
  const date =
    context.date === undefined
      ? undefined
      : displayCalendarDate(CalendarDate.parse(context.date));
  return preset.template.replace(
    /\{\{(date|service_number)\}\}/g,
    (token, variable: string) => {
      if (variable === "date") return date ?? token;
      return context.service_number?.trim() || "...";
    },
  );
}

/** A new-event suggestion only: never modifies a saved event. */
export function defaultEventPreset(
  date: string,
  events: readonly CalendarEvent[] = [],
) {
  if (!CalendarDate.safeParse(date).success) return undefined;
  const weekday = calendarWeekday(date);
  const id =
    weekday === 0
      ? "worship-program"
      : weekday === 3 || weekday === 4 || weekday === 5 || weekday === 6
        ? "weekly-bible-study"
        : weekday === 2
          ? "tvcs-fellowship"
          : weekday === 1
            ? "evangelism-fellowship"
            : undefined;
  const preset = EVENT_PRESETS.find((item) => item.id === id);
  if (!preset) return undefined;
  const worshipEvents = events.filter((item) => {
    if (item.eventDate !== date) return false;
    const title = parseEventText(item.originalText).title || item.title;
    return (
      item.presetId === "worship-program" ||
      isWorshipProgramText(item.originalText) ||
      /^LỊCH\s+TRỰC\s+NGÀY\s+.+[–—-]\s*LỄ(?:\s|$)/iu.test(title) ||
      /\bLễ\s+[1-9]\d*\b/iu.test(title) ||
      /\bLễ\s+[1-9]\d*\b/iu.test(item.title)
    );
  });
  const highestService = worshipEvents.reduce((highest, item) => {
    const title = parseEventText(item.originalText).title;
    const match =
      /\bLễ\s+([1-9]\d*)\b/iu.exec(title) ??
      /\bLễ\s+([1-9]\d*)\b/iu.exec(item.title);
    return Math.max(highest, match ? Number(match[1]) : 0);
  }, worshipEvents.length);

  return {
    preset,
    serviceNumber: weekday === 0 ? String(highestService + 1) : undefined,
  };
}

/** Match the day-specific suggestion; other weekdays retain the complete catalog. */
export function eventPresetsForDate(date: string): readonly EventPreset[] {
  if (!CalendarDate.safeParse(date).success) return [];
  const suggestion = defaultEventPreset(date);
  return suggestion ? [suggestion.preset] : EVENT_PRESETS;
}
