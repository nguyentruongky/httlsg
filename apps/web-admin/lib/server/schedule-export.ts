import { z } from "zod";
import {
  AlignmentType,
  HeightRule,
  VerticalAlign,
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  PageOrientation,
  TableLayoutType,
  BorderStyle,
  LineRuleType,
} from "docx";
import {
  quarterlyDate,
  quarterlyDocumentFilename,
  quarterlyDocumentHeading,
  QUARTERLY_DOCUMENT_FOOTER,
  quarterlyWeeklyRows,
  QUARTERLY_ROLES,
  quarterlyPersonnelColumn,
  shortQuarterlyText,
  type ScheduleEventValue,
  isQuarterlyWork,
  isReceptionTable,
  receptionDisplayRows,
  CALENDAR_WEEKDAYS,
  calendarWeekday,
  ScheduleDraft,
  type ScheduleRecord,
  type ScheduleCategory,
  receptionCellText,
  receptionDocumentHeading,
  RECEPTION_DOCUMENT_NOTES,
  RECEPTION_DOCUMENT_SIGNATURE,
  RECEPTION_POSITIONS,
  ScheduleTransition,
  scheduleTableSections,
  scheduleDutyText,
  displayCalendarDate,
  todayInChurch,
  type AuthUser,
} from "@org/core";
import {
  quarterlyWordLayout,
  quarterlyWordFontSize,
  QUARTERLY_WORD_COLUMNS,
} from "./quarterly-word-layout";
import type { DB } from "./db";
import { getSchedule, requireScheduleCategory } from "./schedules";
import { HttpError } from "./http";
import { audit } from "./members";
import {
  A4_PAGE,
  RECEPTION_WORD_MARGIN,
  RECEPTION_WORD_COLUMNS,
  receptionWordLayout,
} from "./reception-word-layout";
export async function exportSchedule(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
) {
  const fields = ScheduleTransition.parse(input),
    schedule = await getSchedule(db, actor, id);
  const category = await requireScheduleCategory(
    db,
    actor,
    schedule.categoryId,
  );
  if (schedule.status !== "published")
    throw new HttpError(403, "Chỉ xuất lịch đã công bố.");
  if (schedule.version !== fields.version)
    throw new HttpError(
      409,
      "Lịch đã thay đổi. Vui lòng tải lại trước khi xuất.",
    );
  await audit(db, actor, actor.id, `Xuất Word lịch phân công ${id}`);
  return renderScheduleDocument(schedule, category);
}
export async function exportReceptionPreview(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  const fields = z
    .object({
      draft: ScheduleDraft,
      memberNames: z
        .record(z.uuid(), z.string().max(200))
        .refine((names) => Object.keys(names).length <= 2000),
    })
    .strict()
    .parse(input);
  if (
    !(
      fields.draft.categoryId === "reception" &&
      fields.draft.settings.layout === "reception"
    ) &&
    !isQuarterlyWork(fields.draft)
  )
    throw new HttpError(
      400,
      "Chỉ xuất bảng tiếp tân hoặc lịch công tác quý từ màn hình này.",
    );
  const category = await requireScheduleCategory(
    db,
    actor,
    fields.draft.categoryId,
  );
  const schedule: ScheduleRecord = {
    ...fields.draft,
    id: actor.id,
    version: 0,
    status: "draft",
    createdBy: actor.id,
    updatedBy: actor.id,
    publishedAt: null,
    cancelledAt: null,
    memberNames: fields.memberNames,
    departmentNames: {},
  };
  await audit(
    db,
    actor,
    actor.id,
    `Xuất Word lịch ${fields.draft.categoryId} đang chỉnh sửa`,
  );
  return renderScheduleDocument(schedule, category);
}
async function renderScheduleDocument(
  schedule: ScheduleRecord,
  category: Pick<ScheduleCategory, "name">,
) {
  const reception = isReceptionTable(schedule);
  const quarterly = isQuarterlyWork(schedule);
  const board = reception || quarterly;
  const quarterlyLayout = quarterly ? quarterlyWordLayout(schedule) : undefined;
  const layout = reception
    ? receptionWordLayout(schedule)
    : quarterly
      ? quarterlyLayout
      : undefined;
  const bodySize = layout ? layout.fontSize * 2 : 22;
  const cell = (
    value: string,
    options: {
      columnSpan?: number;
      rowSpan?: number;
      header?: boolean;
      center?: boolean;
      fill?: string;
      width?: number;
    } = {},
  ) => {
    const { header, center, fill, width, ...spans } = options;
    const fontSize =
      quarterly && width
        ? quarterlyWordFontSize(value, width, bodySize / 2, header)
        : bodySize / 2;
    const cellLineHeight = quarterly
      ? Math.ceil(fontSize * 24)
      : layout?.lineHeight;
    return new TableCell({
      ...spans,
      width: width ? { size: width, type: WidthType.DXA } : undefined,
      verticalAlign: board ? VerticalAlign.CENTER : undefined,
      margins: board ? { top: 60, bottom: 60, left: 80, right: 80 } : undefined,
      shading: fill ? { fill } : undefined,
      children: value.split("\n").map(
        (text) =>
          new Paragraph({
            alignment:
              header || center || quarterly ? AlignmentType.CENTER : undefined,
            spacing: layout
              ? {
                  before: 0,
                  after: 0,
                  line: cellLineHeight,
                  lineRule: LineRuleType.AT_LEAST,
                }
              : undefined,
            keepNext: false,
            children: [
              new TextRun({
                text,
                font: "Times New Roman",
                size: fontSize * 2,
                color: "17212B",
                bold: header,
              }),
            ],
          }),
      ),
    });
  };
  const children: any[] = quarterly
    ? quarterlyDocumentHeading(schedule).map(
        (text, index) =>
          new Paragraph({
            alignment: AlignmentType.CENTER,
            keepNext: true,
            spacing: {
              before: 0,
              after: index === 2 ? 160 : 0,
              line: 320,
              lineRule: LineRuleType.AT_LEAST,
            },
            children: [
              new TextRun({
                text,
                font: "Times New Roman",
                size: 24,
                bold: true,
                color: "17212B",
              }),
            ],
          }),
      )
    : board
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            keepNext: true,
            spacing: {
              before: 0,
              after: 160,
              line: 400,
              lineRule: LineRuleType.AT_LEAST,
            },
            children: [
              new TextRun({
                text: reception
                  ? receptionDocumentHeading(schedule)
                  : schedule.title,
                font: "Times New Roman",
                size: 32,
                bold: true,
                color: "17212B",
              }),
            ],
          }),
        ]
      : [
          new Paragraph({
            text: schedule.title,
            heading: HeadingLevel.HEADING_1,
            alignment: reception ? AlignmentType.CENTER : undefined,
          }),
          new Paragraph({ text: category.name }),
          new Paragraph({
            text: `${displayCalendarDate(schedule.periodStart)} – ${displayCalendarDate(schedule.periodEnd)}`,
          }),
          new Paragraph({
            text: `Ngày xuất: ${displayCalendarDate(todayInChurch())}`,
          }),
        ];
  if (isReceptionTable(schedule)) {
    children.push(
      new Table({
        width: {
          size: RECEPTION_WORD_COLUMNS.reduce((sum, width) => sum + width, 0),
          type: WidthType.DXA,
        },
        columnWidths: RECEPTION_WORD_COLUMNS,
        layout: TableLayoutType.FIXED,
        alignment: AlignmentType.CENTER,
        borders: Object.fromEntries(
          [
            "top",
            "bottom",
            "left",
            "right",
            "insideHorizontal",
            "insideVertical",
          ].map((side) => [
            side,
            { style: BorderStyle.SINGLE, size: 4, color: "9CA3AF" },
          ]),
        ),
        rows: [
          new TableRow({
            tableHeader: true,
            cantSplit: true,
            children: [
              cell("Ngày", {
                rowSpan: 2,
                header: true,
                fill: "E8EFEA",
                width: RECEPTION_WORD_COLUMNS[0],
              }),
              cell("Sáng", {
                columnSpan: 4,
                header: true,
                fill: "E8EFEA",
                width: RECEPTION_WORD_COLUMNS.slice(1, 5).reduce(
                  (sum, width) => sum + width,
                  0,
                ),
              }),
              cell("Tối", {
                rowSpan: 2,
                header: true,
                fill: "E8EFEA",
                width: RECEPTION_WORD_COLUMNS[5],
              }),
            ],
          }),
          new TableRow({
            tableHeader: true,
            cantSplit: true,
            children: RECEPTION_POSITIONS.map((name, index) =>
              cell(name, {
                header: true,
                fill: "E8EFEA",
                width: RECEPTION_WORD_COLUMNS[index + 1],
              }),
            ),
          }),
          ...receptionDisplayRows(schedule).map((row, index) => {
            const fill = index % 2 ? "FDF3D0" : "FFFFFF";
            return new TableRow({
              cantSplit: true,
              children: [
                cell(
                  [
                    row.extraSession,
                    displayCalendarDate(row.date),
                    CALENDAR_WEEKDAYS[calendarWeekday(row.date)],
                  ]
                    .filter(Boolean)
                    .join("\n"),
                  { header: true, fill, width: RECEPTION_WORD_COLUMNS[0] },
                ),
                ...RECEPTION_POSITIONS.map((position, index) =>
                  cell(receptionCellText(schedule, row.positions, position), {
                    fill,
                    width: RECEPTION_WORD_COLUMNS[index + 1],
                  }),
                ),
                cell(
                  row.extraSession
                    ? "—"
                    : receptionCellText(schedule, row.evening),
                  { fill, width: RECEPTION_WORD_COLUMNS[5] },
                ),
              ],
            });
          }),
        ],
      }),
    );
    const line = layout ? layout.lineHeight : undefined;
    children.push(
      ...RECEPTION_DOCUMENT_NOTES.map(
        (note) =>
          new Paragraph({
            spacing: {
              before: 60,
              after: 0,
              line,
              lineRule: LineRuleType.AT_LEAST,
            },
            children: [
              new TextRun({
                text: note,
                font: "Times New Roman",
                size: bodySize,
                color: "17212B",
              }),
            ],
          }),
      ),
      ...[
        RECEPTION_DOCUMENT_SIGNATURE.role,
        RECEPTION_DOCUMENT_SIGNATURE.name,
      ].map(
        (text, index) =>
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: {
              before: index === 0 ? 360 : 60,
              after: 0,
              line,
              lineRule: LineRuleType.AT_LEAST,
            },
            children: text.split("\n").flatMap((part, partIndex) => [
              ...(partIndex ? [new TextRun({ break: 1 })] : []),
              new TextRun({
                text: part,
                font: "Times New Roman",
                size: bodySize,
                bold: index === 0,
                color: "17212B",
              }),
            ]),
          }),
      ),
    );
  } else if (quarterly) {
    const quarterlyCell = (
      value: string,
      index: number,
      options: Parameters<typeof cell>[1] = {},
    ) =>
      cell(value, {
        ...options,
        width: QUARTERLY_WORD_COLUMNS.slice(
          index,
          index + (options.columnSpan ?? 1),
        ).reduce((sum, width) => sum + width, 0),
      });
    const assignmentCell = (
      event: ScheduleEventValue | undefined,
      role: string,
      fill: string,
      index: number,
    ) => {
      const duty = event?.responsibilities.find((item) => item.name === role);
      const text = duty ? scheduleDutyText(schedule, duty) : "";
      return quarterlyCell(
        quarterlyPersonnelColumn(role)
          ? shortQuarterlyText(text, Object.values(schedule.memberNames))
          : text,
        index,
        { fill, center: role === "Nhóm hát" },
      );
    };
    const header = { header: true, fill: "E8EFEA" };
    children.push(
      new Table({
        width: {
          size: QUARTERLY_WORD_COLUMNS.reduce((sum, width) => sum + width, 0),
          type: WidthType.DXA,
        },
        columnWidths: QUARTERLY_WORD_COLUMNS,
        layout: TableLayoutType.FIXED,
        alignment: AlignmentType.CENTER,
        rows: [
          new TableRow({
            tableHeader: true,
            cantSplit: true,
            children: [
              quarterlyCell("NGÀY", 0, { ...header, rowSpan: 2 }),
              quarterlyCell("SÁNG CHÚA NHẬT", 1, {
                ...header,
                columnSpan: QUARTERLY_ROLES.length,
              }),
              quarterlyCell("CHIỀU CHÚA NHẬT", 7, {
                ...header,
                columnSpan: QUARTERLY_ROLES.length,
              }),
              quarterlyCell("THỨ TƯ", 13, { ...header, columnSpan: 2 }),
            ],
          }),
          new TableRow({
            tableHeader: true,
            cantSplit: true,
            children: [
              ...QUARTERLY_ROLES,
              ...QUARTERLY_ROLES,
              "NGÀY",
              "HDTP",
            ].map((role, index) => quarterlyCell(role, index + 1, header)),
          }),
          ...quarterlyWeeklyRows(schedule).map((row, index) => {
            const fill = index % 2 ? "FDF3D0" : "FFFFFF";
            return new TableRow({
              cantSplit: true,
              height: {
                value: quarterlyLayout!.rowHeights[index],
                rule: HeightRule.ATLEAST,
              },
              children: [
                quarterlyCell(
                  row.morning || row.afternoon ? quarterlyDate(row.date) : "",
                  0,
                  { fill },
                ),
                ...QUARTERLY_ROLES.map((role, index) =>
                  assignmentCell(row.morning, role, fill, index + 1),
                ),
                ...QUARTERLY_ROLES.map((role, index) =>
                  assignmentCell(row.afternoon, role, fill, index + 7),
                ),
                quarterlyCell(
                  row.wednesday ? quarterlyDate(row.wednesday.date) : "",
                  13,
                  {
                    fill,
                  },
                ),
                assignmentCell(row.wednesday, "HDTP", fill, 14),
              ],
            });
          }),
        ],
      }),
    );
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 160,
          after: 0,
          line: layout!.lineHeight,
          lineRule: LineRuleType.AT_LEAST,
        },
        children: [
          new TextRun({
            text: QUARTERLY_DOCUMENT_FOOTER,
            font: "Times New Roman",
            size: bodySize,
            italics: true,
            color: "17212B",
          }),
        ],
      }),
    );
  } else
    for (const section of scheduleTableSections(schedule)) {
      children.push(
        new Paragraph({ text: section.name, heading: HeadingLevel.HEADING_2 }),
      );
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              cantSplit: true,
              children: [
                cell(
                  quarterly ? "NGÀY" : "Ngày / Chương trình",
                  quarterly ? { header: true, fill: "E8EFEA" } : {},
                ),
                ...section.columns.map((name) =>
                  cell(name, quarterly ? { header: true, fill: "E8EFEA" } : {}),
                ),
              ],
            }),
            ...section.events.map(
              (event, index) =>
                new TableRow({
                  cantSplit: true,
                  children: [
                    cell(
                      quarterly
                        ? displayCalendarDate(event.date)
                        : [
                            displayCalendarDate(event.date),
                            [event.startTime, event.endTime]
                              .filter(Boolean)
                              .join(" – "),
                            event.title,
                            event.location,
                            event.description,
                          ]
                            .filter(Boolean)
                            .join("\n"),
                      quarterly
                        ? { fill: index % 2 ? "FDF3D0" : "FFFFFF" }
                        : {},
                    ),
                    ...section.columns.map((name) =>
                      cell(
                        event.responsibilities
                          .filter((duty) => duty.name === name)
                          .map(
                            (duty) =>
                              scheduleDutyText(schedule, duty) +
                              (duty.description ? "\n" + duty.description : ""),
                          )
                          .join("\n") || (quarterly ? "" : "—"),
                        quarterly
                          ? { fill: index % 2 ? "FDF3D0" : "FFFFFF" }
                          : {},
                      ),
                    ),
                  ],
                }),
            ),
          ],
        }),
      );
    }
  const doc = new Document({
    creator: "Hội Thánh",
    title: schedule.title,
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: bodySize },
          paragraph: board ? { spacing: { before: 0, after: 0 } } : undefined,
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { ...A4_PAGE, orientation: PageOrientation.LANDSCAPE },
            margin: board
              ? {
                  top: RECEPTION_WORD_MARGIN,
                  bottom: RECEPTION_WORD_MARGIN,
                  left: RECEPTION_WORD_MARGIN,
                  right: RECEPTION_WORD_MARGIN,
                  header: 0,
                  footer: 0,
                }
              : { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children,
      },
    ],
  });
  return {
    data: await Packer.toBuffer(doc),
    filename: reception
      ? `Lich tiep tan thang ${schedule.periodStart.slice(5, 7)}-${schedule.periodStart.slice(0, 4)}.docx`
      : quarterly
        ? quarterlyDocumentFilename(schedule)
        : `lich-${schedule.categoryId}-${schedule.periodStart}.docx`,
  };
}
