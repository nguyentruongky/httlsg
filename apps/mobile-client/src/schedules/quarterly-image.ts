import {
  quarterlyWeeklyRows,
  quarterlyDate,
  quarterlyDocumentHeading,
  quarterlyPersonnelColumn,
  shortQuarterlyText,
  scheduleDutyText,
  QUARTERLY_ROLES,
  QUARTERLY_DOCUMENT_FOOTER,
  type ScheduleRecord,
  type ScheduleEventValue,
} from "@org/core";
import { saveScheduleImage } from "./save-schedule-image";

export async function saveQuarterlyImage(schedule: ScheduleRecord) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không thể tạo ảnh lịch.");
  const margin = 32,
    padding = 12,
    lineHeight = 26;
  const widths = [
    110,
    ...QUARTERLY_ROLES.map(() => 170),
    ...QUARTERLY_ROLES.map(() => 170),
    110,
    170,
  ];
  const width = widths.reduce((sum, size) => sum + size, 0);
  const font = "20px Arial, sans-serif";
  ctx.font = font;
  function wrap(text: string, available: number): string[] {
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
  const people = Object.values(schedule.memberNames);
  function dutyText(event: ScheduleEventValue | undefined, role: string) {
    const duty = event?.responsibilities.find((item) => item.name === role);
    const text = duty ? scheduleDutyText(schedule, duty) : "";
    return quarterlyPersonnelColumn(role)
      ? shortQuarterlyText(text, people)
      : text;
  }
  const rows = quarterlyWeeklyRows(schedule).map((row) => {
    const cells = [
      row.morning || row.afternoon ? quarterlyDate(row.date) : "",
      ...QUARTERLY_ROLES.map((role) => dutyText(row.morning, role)),
      ...QUARTERLY_ROLES.map((role) => dutyText(row.afternoon, role)),
      row.wednesday ? quarterlyDate(row.wednesday.date) : "",
      dutyText(row.wednesday, "HDTP"),
    ].map((text, index) => wrap(text, widths[index] - padding * 2));
    return {
      cells,
      height:
        Math.max(2, ...cells.map((lines) => lines.length)) * lineHeight +
        padding * 2,
    };
  });
  const footer = wrap(QUARTERLY_DOCUMENT_FOOTER, width);
  ctx.font = "bold 28px Arial, sans-serif";
  const headings = quarterlyDocumentHeading(schedule).flatMap((line) =>
    wrap(line, width),
  );
  const tableTop = margin + headings.length * 38 + 24;
  const height =
    tableTop +
    104 +
    rows.reduce((sum, row) => sum + row.height, 0) +
    32 +
    footer.length * lineHeight +
    margin;
  canvas.width = (width + margin * 2) * 2;
  canvas.height = height * 2;
  ctx.scale(2, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width + margin * 2, height);
  ctx.fillStyle = "#17212b";
  ctx.font = "bold 28px Arial, sans-serif";
  ctx.textAlign = "center";
  headings.forEach((line, index) =>
    ctx.fillText(line, margin + width / 2, margin + 28 + index * 38),
  );
  function cell(
    x: number,
    y: number,
    w: number,
    h: number,
    lines: string[],
    header = false,
    shaded = false,
  ) {
    ctx!.fillStyle = header ? "#edf2ee" : shaded ? "#fdf3d0" : "#ffffff";
    ctx!.fillRect(x, y, w, h);
    ctx!.strokeStyle = "#9ca3af";
    ctx!.strokeRect(x, y, w, h);
    ctx!.fillStyle = "#17212b";
    ctx!.font = `${header ? "bold " : ""}${font}`;
    ctx!.textAlign = header ? "center" : "left";
    lines.forEach((line, index) =>
      ctx!.fillText(
        line,
        header ? x + w / 2 : x + padding,
        y + (h - lines.length * lineHeight) / 2 + 20 + index * lineHeight,
      ),
    );
  }
  cell(margin, tableTop, widths[0], 104, ["NGÀY"], true);
  let x = margin + widths[0];
  ["SÁNG CHÚA NHẬT", "CHIỀU CHÚA NHẬT"].forEach((label) => {
    cell(x, tableTop, 170 * QUARTERLY_ROLES.length, 52, [label], true);
    QUARTERLY_ROLES.forEach((role) => {
      cell(x, tableTop + 52, 170, 52, [role], true);
      x += 170;
    });
  });
  cell(x, tableTop, 280, 52, ["THỨ TƯ"], true);
  cell(x, tableTop + 52, 110, 52, ["NGÀY"], true);
  cell(x + 110, tableTop + 52, 170, 52, ["HDTP"], true);
  let y = tableTop + 104;
  rows.forEach((row, index) => {
    x = margin;
    row.cells.forEach((lines, column) => {
      cell(x, y, widths[column], row.height, lines, false, index % 2 === 1);
      x += widths[column];
    });
    y += row.height;
  });
  ctx.font = font;
  ctx.textAlign = "left";
  footer.forEach((line, index) =>
    ctx.fillText(line, margin, y + 32 + index * lineHeight),
  );
  await saveScheduleImage(canvas, `lich-cong-tac-${schedule.periodStart}.png`);
}
