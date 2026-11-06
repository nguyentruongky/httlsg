import {
  WORSHIP_FIELD_LABELS,
  type WorshipProgramFields,
  type MissingWorshipField,
  type WorshipFieldKey,
} from "./types";
/** Empty values, dot/ellipsis placeholders, template variables and empty song numbering. */
export function hasWorshipValue(value: string) {
  return /[\p{L}\p{N}]/u.test(
    value
      .replace(/\{\{[^{}]*\}\}/g, "")
      .replace(/^[ \t]*\d+[.)]\s*/gm, "")
      .replace(/[\s.\u2026_-]/g, ""),
  );
}
export function getMissingWorshipProgramFields(
  fields: WorshipProgramFields,
  sourceText?: string,
): MissingWorshipField[] {
  const normalized = sourceText
    ?.normalize("NFC")
    .toLocaleLowerCase("vi")
    .replace(/\s+/g, " ");
  const aliases: Partial<Record<WorshipFieldKey, string[]>> = {
    songs: ["NKTP", "Hát dẫn"],
    host: ["Chấp sự HDCT", "HDCT"],
    responsiveReading: ["KTĐĐ", "Kinh Thánh Đối Đáp"],
  };
  return (Object.keys(WORSHIP_FIELD_LABELS) as WorshipFieldKey[])
    .filter(
      (key) =>
        !hasWorshipValue(fields[key]) &&
        !aliases[key]?.some((label) =>
          normalized?.includes(label.toLocaleLowerCase("vi")),
        ),
    )
    .map((key) => ({
      key,
      label: WORSHIP_FIELD_LABELS[key],
      group: key === "songs" || key === "choir" ? "B" : "A",
    }));
}
