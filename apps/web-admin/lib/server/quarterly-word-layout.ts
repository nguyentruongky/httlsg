import {
  quarterlyDate,
  quarterlyDocumentHeading,
  QUARTERLY_DOCUMENT_FOOTER,
  quarterlyWeeklyRows,
  QUARTERLY_ROLES,
  quarterlyPersonnelColumn,
  shortQuarterlyText,
  scheduleDutyText,
  type ScheduleEventValue,
  type ScheduleRecord,
} from "@org/core";
import { A4_PAGE, RECEPTION_WORD_MARGIN } from "./reception-word-layout";

const usableWidth = A4_PAGE.height - 2 * RECEPTION_WORD_MARGIN;
// Match the compact browser print grid; dates and group numbers need less space.
export const QUARTERLY_WORD_COLUMNS = [
  4.5, 7.2, 7.2, 4, 7.2, 7.2, 7.2, 7.2, 7.2, 4, 7.2, 7.2, 7.2, 4.5, 11,
].map((percent) => Math.floor((usableWidth * percent) / 100));
QUARTERLY_WORD_COLUMNS[14] +=
  usableWidth - QUARTERLY_WORD_COLUMNS.reduce((sum, width) => sum + width, 0);

/** Size explicit lines to the cell's usable width, leaving padding and a font
 * substitution reserve. Very long custom entries can still wrap at 6 pt. */
export function quarterlyWordFontSize(
  value: string,
  width: number,
  preferred: number,
  bold = false,
) {
  const characters = Math.max(
    1,
    ...value.split("\n").map((line) => [...line.normalize("NFC")].length),
  );
  const available = Math.max(1, width - 200);
  const fitting = available / (characters * 20 * 0.65 * (bold ? 1.08 : 1));
  return Math.min(preferred, Math.max(6, Math.floor(fitting * 2) / 2));
}

export function quarterlyWordLayout(schedule: ScheduleRecord) {
  const people = Object.values(schedule.memberNames);
  function text(event: ScheduleEventValue | undefined, role: string) {
    const duty = event?.responsibilities.find((item) => item.name === role);
    const value = duty ? scheduleDutyText(schedule, duty) : "";
    return quarterlyPersonnelColumn(role)
      ? shortQuarterlyText(value, people)
      : value;
  }
  const rows = quarterlyWeeklyRows(schedule).map((row) => [
    row.morning || row.afternoon ? quarterlyDate(row.date) : "",
    ...QUARTERLY_ROLES.map((role) => text(row.morning, role)),
    ...QUARTERLY_ROLES.map((role) => text(row.afternoon, role)),
    row.wednesday ? quarterlyDate(row.wednesday.date) : "",
    text(row.wednesday, "HDTP"),
  ]);
  const usableHeight = A4_PAGE.width - 2 * RECEPTION_WORD_MARGIN - 240;
  let fontSize = 8;
  let estimatedHeight = 0;
  let rowHeights: number[] = [];
  for (const candidate of [11, 10.5, 10, 9.5, 9, 8.5, 8]) {
    const lineHeight = Math.ceil(candidate * 24);
    function lines(value: string, width: number, fit = false) {
      const font = fit
        ? quarterlyWordFontSize(value, width, candidate)
        : candidate;
      const capacity = Math.max(
        1,
        Math.floor((width - 200) / (font * 20 * 0.65)),
      );
      return value
        .split("\n")
        .reduce(
          (sum, line) =>
            sum +
            Math.max(
              1,
              Math.ceil([...line.normalize("NFC")].length / capacity),
            ),
          0,
        );
    }
    const headings = [
      "NGÀY",
      ...QUARTERLY_ROLES,
      ...QUARTERLY_ROLES,
      "NGÀY",
      "HDTP",
    ];
    rowHeights = rows.map(
      (row) =>
        Math.max(
          ...row.map((value, index) =>
            lines(value, QUARTERLY_WORD_COLUMNS[index], true),
          ),
        ) *
          lineHeight +
        120,
    );
    estimatedHeight =
      quarterlyDocumentHeading(schedule).length * 320 +
      160 +
      lines(QUARTERLY_DOCUMENT_FOOTER, usableWidth) * lineHeight +
      160 +
      lineHeight +
      120 +
      Math.max(
        ...headings.map((value, index) =>
          lines(value, QUARTERLY_WORD_COLUMNS[index], true),
        ),
      ) *
        lineHeight +
      120 +
      rowHeights.reduce((sum, height) => sum + height, 0);
    fontSize = candidate;
    if (estimatedHeight <= usableHeight) break;
  }
  const extraPerRow =
    Math.max(0, usableHeight - estimatedHeight) / Math.max(1, rows.length);
  return {
    rowHeights: rowHeights.map((height) => Math.floor(height + extraPerRow)),
    fontSize,
    lineHeight: Math.ceil(fontSize * 24),
    estimatedHeight,
    usableHeight,
  };
}
