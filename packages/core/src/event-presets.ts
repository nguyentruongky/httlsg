import { CalendarDate, displayCalendarDate } from "./calendar";

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
    template: `LỊCH TRỰC NGÀY {{date}} – LỄ {{service_number}}
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
      "18g00: Chương trình học Kinh Thánh hàng tuần của HT tiếp tục với loạt bài chủ đề: ",
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
