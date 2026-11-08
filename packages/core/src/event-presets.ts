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
Ban Hát Lễ: 
Dâng hiến: `,
  },
  {
    id: "evangelism-fellowship",
    name: "Bồi linh - sinh hoạt Ban Truyền Giảng",
    category: "Sinh hoạt Ban ngành",
    description: "Sinh hoạt định kỳ của Ban Truyền Giảng.",
    template:
      "18g00: Bồi linh - sinh hoạt định kỳ của Ban Truyền Giảng Hội Thánh tại phòng Ban Trung niên.",
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
      : weekday === 3
        ? "weekly-bible-study"
        : weekday === 2
          ? "tvcs-fellowship"
          : weekday === 1
            ? "evangelism-fellowship"
            : undefined;
  const preset = EVENT_PRESETS.find((item) => item.id === id);
  if (!preset) return undefined;
  const count = events.filter(
    (item) =>
      item.eventDate === date &&
      (item.presetId === "worship-program" ||
        /^LỊCH\s+TRỰC\s+NGÀY\s+.+[–—-]\s*LỄ(?:\s|$)/iu.test(
          item.originalText.trimStart().split(/\r?\n/)[0],
        )),
  ).length;
  return {
    preset,
    serviceNumber: weekday === 0 ? String(count + 1) : undefined,
  };
}

/** Match the day-specific suggestion; other weekdays retain the complete catalog. */
export function eventPresetsForDate(date: string): readonly EventPreset[] {
  if (!CalendarDate.safeParse(date).success) return [];
  const suggestion = defaultEventPreset(date);
  return suggestion ? [suggestion.preset] : EVENT_PRESETS;
}
