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
): MissingWorshipField[] {
  return (Object.keys(WORSHIP_FIELD_LABELS) as WorshipFieldKey[])
    .filter((key) => !hasWorshipValue(fields[key]))
    .map((key) => ({
      key,
      label: WORSHIP_FIELD_LABELS[key],
      group: key === "songs" || key === "choir" ? "B" : "A",
    }));
}
