import {
  receptionDisplayRows,
  receptionCellText,
  receptionDocumentHeading,
  RECEPTION_DOCUMENT_NOTES,
  RECEPTION_DOCUMENT_SIGNATURE,
  RECEPTION_POSITIONS,
  displayCalendarDate,
  CALENDAR_WEEKDAYS,
  calendarWeekday,
  type ScheduleRecord,
} from "@org/core";

// A4 portrait dimensions; docx swaps them when landscape orientation is set.
export const A4_PAGE = { width: 11906, height: 16838 } as const;
export const RECEPTION_WORD_MARGIN = 567; // 10 mm, in twips.
export const RECEPTION_WORD_COLUMNS = [1720, 3000, 2400, 2400, 2100, 4084];

/** Conservative layout estimate, not a replacement for Word's pagination engine.
 * Keep normal monthly boards on one A4 page without clipping or illegible type. */
export function receptionWordLayout(schedule: ScheduleRecord) {
  const rows = receptionDisplayRows(schedule).map((row) => [
    [
      row.extraSession,
      displayCalendarDate(row.date),
      CALENDAR_WEEKDAYS[calendarWeekday(row.date)],
    ]
      .filter(Boolean)
      .join("\n"),
    ...RECEPTION_POSITIONS.map((position) =>
      receptionCellText(schedule, row.positions, position),
    ),
    row.extraSession ? "—" : receptionCellText(schedule, row.evening),
  ]);
  const usableHeight = A4_PAGE.width - 2 * RECEPTION_WORD_MARGIN - 240; // Reserve Word's trailing paragraph and rounding.
  const textWidth = A4_PAGE.height - 2 * RECEPTION_WORD_MARGIN;
  // Signature block line count, including any blank lines in the name.
  const signatureLines =
    RECEPTION_DOCUMENT_SIGNATURE.role.split("\n").length +
    RECEPTION_DOCUMENT_SIGNATURE.name.split("\n").length;
  function lines(text: string, width: number, font: number) {
    // Reserve generous glyph widths (including Vietnamese uppercase names) and padding.
    const capacity = Math.max(
      1,
      Math.floor((width - 160) / (font * 20 * 0.65)),
    );
    return text
      .split("\n")
      .reduce(
        (sum, line) =>
          sum +
          Math.max(1, Math.ceil([...line.normalize("NFC")].length / capacity)),
        0,
      );
  }
  let fontSize = 8.5;
  let estimatedHeight = 0;
  for (const candidate of [11, 10.5, 10, 9.5, 9, 8.5]) {
    const lineHeight = Math.ceil(candidate * 24);
    const titleLines = lines(receptionDocumentHeading(schedule), textWidth, 16);
    const noteLines = RECEPTION_DOCUMENT_NOTES.reduce(
      (sum, note) => sum + lines(note, textWidth, candidate),
      0,
    );
    estimatedHeight =
      titleLines * 400 +
      200 +
      200 +
      2 * (lineHeight + 120) +
      rows.reduce(
        (sum, row) =>
          sum +
          Math.max(
            ...row.map((text, index) =>
              lines(text, RECEPTION_WORD_COLUMNS[index], candidate),
            ),
          ) *
            lineHeight +
          120,
        0,
      ) +
      noteLines * lineHeight +
      // Signature block: one line per role/name segment plus the gap above it.
      signatureLines * (lineHeight + 160);
    fontSize = candidate;
    if (estimatedHeight <= usableHeight) break;
  }
  return {
    rows,
    fontSize,
    lineHeight: Math.ceil(fontSize * 24),
    estimatedHeight,
    usableHeight,
  };
}
