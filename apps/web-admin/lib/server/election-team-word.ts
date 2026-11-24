import { teamMinutes } from "./election-team-minutes";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  Footer,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  PageNumber,
} from "docx";
import {
  teamStats,
  type ElectionTeamExport,
} from "./election-team-export-data";
const p = (text: string, bold = false, center = false) =>
  new Paragraph({
    alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { after: 160 },
    children: [new TextRun({ text, bold })],
  });
function statistics(data: ElectionTeamExport) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [p("Nội dung", true)] }),
          new TableCell({ children: [p("Số lượng", true)] }),
        ],
      }),
      ...teamStats(data).map(
        ([label, value]) =>
          new TableRow({
            children: [
              new TableCell({ children: [p(label)] }),
              new TableCell({ children: [p(String(value))] }),
            ],
          }),
      ),
    ],
  });
}
function signatures(data: ElectionTeamExport) {
  const members = teamMinutes(data).members;
  const rows: TableRow[] = [];
  for (let index = 0; index < members.length; index += 3) {
    rows.push(
      new TableRow({
        cantSplit: true,
        children: members.slice(index, index + 3).map(
          (name) =>
            new TableCell({
              width: { size: 33.33, type: WidthType.PERCENTAGE },
              children: [
                p("THÀNH VIÊN TỔ KIỂM PHIẾU", true, true),
                p("(Ký và ghi rõ họ tên)", false, true),
                new Paragraph({ text: "", spacing: { after: 900 } }),
                p(name, true, true),
              ],
            }),
        ),
      }),
    );
  }
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: none,
      bottom: none,
      left: none,
      right: none,
      insideHorizontal: none,
      insideVertical: none,
    },
    rows,
  });
}
export async function electionTeamWord(data: ElectionTeamExport) {
  const minutes = teamMinutes(data);
  const document = new Document({
    creator: "Hội Thánh",
    title: `Biên bản kiểm phiếu – ${data.title}`,
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 26 },
          paragraph: { spacing: { after: 160 } },
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
        headers: {
          default: new Header({
            children: [p(minutes.header, true, true)],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `Bầu cử #${data.electionId} · ${data.teamName} · Trang `,
                    size: 18,
                  }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
                ],
              }),
            ],
          }),
        },
        children: [
          p(minutes.title, true, true),
          p(data.title, true, true),
          p(minutes.identity, false, true),
          p(minutes.times),
          p(minutes.introduction),
          p(minutes.participants),
          statistics(data),
          p(""),
          p("KẾT QUẢ ỨNG VIÊN", true),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ["STT", "Họ tên", "Phiếu", "% hợp lệ của tổ"].map(
                  (text) => new TableCell({ children: [p(text, true)] }),
                ),
              }),
              ...data.results.map(
                (candidate, index) =>
                  new TableRow({
                    children: [
                      String(index + 1),
                      candidate.full_name,
                      String(candidate.votes),
                      `${candidate.percent.toFixed(1)}%`,
                    ].map((text) => new TableCell({ children: [p(text)] })),
                  }),
              ),
            ],
          }),
          p(""),
          p(minutes.counting),
          p(minutes.comments),
          p(
            "................................................................................................................",
          ),
          p(
            "................................................................................................................",
          ),
          p(minutes.confirmation),
          p(minutes.date, false, true),
          p(""),
          signatures(data),
          p(""),
          p(minutes.handover, true, true),
          p("(Ký, ghi rõ họ tên)", false, true),
          new Paragraph({ text: "", spacing: { after: 900 } }),
        ],
      },
    ],
  });
  return Packer.toBuffer(document);
}
