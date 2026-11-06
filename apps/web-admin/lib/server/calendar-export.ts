import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import {
  CalendarRange,
  ExportInput,
  calendarExportText,
  displayCalendarDate,
  type AuthUser,
} from "@org/core";
import type { DB } from "./db";
import { listCalendarEvents, requireCalendar } from "./calendar";
import { HttpError } from "./http";
import { audit } from "./members";
export async function exportCalendarPreview(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  requireCalendar(actor, "calendar.export");
  const range = CalendarRange.parse(input);
  const data = await listCalendarEvents(db, actor, range);
  const text = calendarExportText(data.items, range);
  if (text.length > 500000)
    throw new HttpError(
      400,
      "Nội dung quá dài. Chọn khoảng ngày ngắn hơn để xuất đầy đủ.",
    );
  return { ...range, text, count: data.items.length };
}
export async function exportCalendarDocument(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  requireCalendar(actor, "calendar.export");
  const f = ExportInput.parse(input);
  const doc = new Document({
    creator: "Hội Thánh",
    title: "Lịch sinh hoạt",
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 24 },
          paragraph: { spacing: { after: 120 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        children: [
          new Paragraph({
            text: "LỊCH SINH HOẠT",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: `${displayCalendarDate(f.from)} – ${displayCalendarDate(f.to)}`,
          }),
          ...f.text.split(/\r\n|\n|\r/).map(
            (line) =>
              new Paragraph({
                children: [
                  new TextRun({ text: line, font: "Times New Roman" }),
                ],
                spacing: { after: 100 },
              }),
          ),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  await audit(db, actor, actor.id, `Xuất lịch ${f.from} – ${f.to}`);
  return { buffer, filename: `lich-sinh-hoat-${f.from}-den-${f.to}.docx` };
}
