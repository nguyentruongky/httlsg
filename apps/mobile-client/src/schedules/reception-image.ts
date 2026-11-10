import { saveScheduleImage } from "./save-schedule-image";
import {
  CALENDAR_WEEKDAYS,
  RECEPTION_DOCUMENT_NOTES,
  RECEPTION_DOCUMENT_SIGNATURE,
  RECEPTION_POSITIONS,
  calendarWeekday,
  displayCalendarDate,
  receptionCellText,
  receptionDisplayRows,
  receptionDocumentHeading,
  type ScheduleRecord,
} from "@org/core";

// Render the entire board, including columns outside the phone's viewport.
export async function saveReceptionImage(schedule: ScheduleRecord) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không thể tạo ảnh lịch.");
  const widths = [180, 230, 230, 230, 230, 270];
  const margin = 40,
    padding = 16,
    lineHeight = 30;
  const width = widths.reduce((sum, value) => sum + value, 0);
  const font = "22px Arial, sans-serif";
  ctx.font = font;
  function wrap(text: string, available: number) {
    return text.split("\n").flatMap((paragraph) => {
      const lines: string[] = [];
      let line = "";
      for (const character of paragraph) {
        if (line && ctx!.measureText(line + character).width > available) {
          lines.push(line);
          line = "";
        }
        line += character;
      }
      lines.push(line);
      return lines;
    });
  }
  const rows = receptionDisplayRows(schedule).map((row) => {
    const cells = [
      [
        row.extraSession,
        displayCalendarDate(row.date),
        CALENDAR_WEEKDAYS[calendarWeekday(row.date)],
      ].filter(Boolean) as string[],
      ...RECEPTION_POSITIONS.map((position, index) =>
        wrap(
          receptionCellText(schedule, row.positions, position) ||
            (calendarWeekday(row.date) !== 0 && !row.positions.length
              ? "—"
              : "Chưa phân công"),
          widths[index + 1] - padding * 2,
        ),
      ),
      wrap(
        row.extraSession
          ? "—"
          : receptionCellText(schedule, row.evening) || "Chưa phân công",
        widths[5] - padding * 2,
      ),
    ];
    return {
      cells,
      height:
        Math.max(...cells.map((lines) => lines.length)) * lineHeight +
        padding * 2,
    };
  });
  const notes = RECEPTION_DOCUMENT_NOTES.flatMap((note) => wrap(note, width));
  const title = receptionDocumentHeading(schedule);
  ctx.font = "bold 30px Arial, sans-serif";
  const titleLines = wrap(title, width);
  const tableTop = margin + titleLines.length * 40 + 24;
  const tableBottom =
    tableTop + 100 + rows.reduce((sum, row) => sum + row.height, 0);
  const height = tableBottom + 32 + notes.length * lineHeight + 120 + margin;
  canvas.width = (width + margin * 2) * 2;
  canvas.height = height * 2;
  ctx.scale(2, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width / 2, height);
  ctx.fillStyle = "#17212b";
  ctx.font = "bold 30px Arial, sans-serif";
  ctx.textAlign = "center";
  titleLines.forEach((line, index) =>
    ctx.fillText(line, margin + width / 2, margin + 30 + index * 40),
  );
  function cell(
    x: number,
    y: number,
    w: number,
    h: number,
    lines: string[],
    background: string,
    centered = false,
    bold = false,
  ) {
    ctx!.fillStyle = background;
    ctx!.fillRect(x, y, w, h);
    ctx!.strokeStyle = "#9ca3af";
    ctx!.lineWidth = 1;
    ctx!.strokeRect(x, y, w, h);
    ctx!.fillStyle = "#17212b";
    ctx!.font = `${bold ? "bold " : ""}${font}`;
    ctx!.textAlign = centered ? "center" : "left";
    const start = y + (h - lines.length * lineHeight) / 2 + 23;
    lines.forEach((line, index) =>
      ctx!.fillText(
        line,
        centered ? x + w / 2 : x + padding,
        start + index * lineHeight,
      ),
    );
  }
  cell(margin, tableTop, widths[0], 100, ["Ngày"], "#edf2ee", true, true);
  cell(
    margin + widths[0],
    tableTop,
    widths.slice(1, 5).reduce((a, b) => a + b, 0),
    50,
    ["Sáng"],
    "#edf2ee",
    true,
    true,
  );
  cell(
    margin + width - widths[5],
    tableTop,
    widths[5],
    100,
    ["Tối"],
    "#edf2ee",
    true,
    true,
  );
  let x = margin + widths[0];
  RECEPTION_POSITIONS.forEach((position, index) => {
    cell(
      x,
      tableTop + 50,
      widths[index + 1],
      50,
      [position],
      "#edf2ee",
      true,
      true,
    );
    x += widths[index + 1];
  });
  let y = tableTop + 100;
  rows.forEach((row, index) => {
    x = margin;
    row.cells.forEach((lines, column) => {
      cell(
        x,
        y,
        widths[column],
        row.height,
        lines,
        index % 2 ? "#fdf3d0" : "#ffffff",
        column === 0,
        column === 0,
      );
      x += widths[column];
    });
    y += row.height;
  });
  ctx.font = font;
  ctx.textAlign = "left";
  notes.forEach((line, index) =>
    ctx.fillText(line, margin, y + 50 + index * lineHeight),
  );
  ctx.textAlign = "right";
  ctx.font = `bold ${font}`;
  ctx.fillText(
    RECEPTION_DOCUMENT_SIGNATURE.role,
    margin + width,
    height - margin - 45,
  );
  ctx.font = font;
  ctx.fillText(
    RECEPTION_DOCUMENT_SIGNATURE.name,
    margin + width,
    height - margin - 10,
  );
  await saveScheduleImage(canvas, `lich-tiep-tan-${schedule.periodStart}.png`);
}
