import {
  WORSHIP_FIELD_LABELS,
  type WorshipProgramFields,
  type MissingWorshipField,
  type WorshipFieldKey,
} from "./types";
/** Assignments and placeholders do not supply the missing program content. */
export function hasWorshipValue(value: string) {
  return /[\p{L}\p{N}]/u.test(
    value
      // A mention names the person responsible; content must be entered separately.
      .replace(/@[^@\r\n,;:|–—]+/gu, "")
      .replace(/\{\{[^{}]*\}\}/g, "")
      .replace(/^[ \t]*\d+[.)]\s*/gm, "")
      .replace(/[\s.\u2026_-]/g, ""),
  );
}
export function getMissingWorshipProgramFields(
  fields: WorshipProgramFields,
): MissingWorshipField[] {
  return (Object.keys(WORSHIP_FIELD_LABELS) as WorshipFieldKey[])
    .filter(
      (key) =>
        // HDCT asks for a person, so an assignment supplies the required value.
        !hasWorshipValue(
          key === "host" ? fields[key].replace(/@/g, "") : fields[key],
        ),
    )
    .map((key) => ({
      key,
      label: WORSHIP_FIELD_LABELS[key],
      group: key === "songs" || key === "choir" ? "B" : "A",
    }));
}
