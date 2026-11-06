export const WORSHIP_FIELD_LABELS = {
  topic: "Chủ đề",
  speaker: "Diễn giả",
  scripture: "Kinh Thánh nền tảng",
  memoryVerse: "Câu gốc",
  host: "HDCT",
  openingScripture: "Kinh Thánh đầu giờ",
  songs: "Hát dẫn",
  responsiveReading: "KTĐĐ",
  choir: "Ban Hát Lễ",
  offering: "Dâng hiến",
} as const;
export type WorshipFieldKey = keyof typeof WORSHIP_FIELD_LABELS;
export type WorshipProgramFields = Record<WorshipFieldKey, string>;
export interface MissingWorshipField {
  key: WorshipFieldKey;
  label: string;
  group: "A" | "B";
}
export interface WorshipInformation {
  fields: WorshipProgramFields;
  missingFields: MissingWorshipField[];
  message: string;
}
export interface WorshipInformationPreview extends WorshipInformation {
  eventId: string;
  version: number;
  previewHash: string;
  recipient: string;
}
