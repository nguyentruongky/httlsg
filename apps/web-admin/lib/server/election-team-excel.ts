import ExcelJS from "exceljs";
import {
  teamExportDate,
  teamStats,
  teamTicketStatus,
  type ElectionTeamExport,
} from "./election-team-export-data";
function heading(
  book: ExcelJS.Workbook,
  name: string,
  data: ElectionTeamExport,
  columns: number,
) {
  const sheet = book.addWorksheet(name, {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });
  const lines = [
    "HỘI THÁNH · BAN KIỂM PHIẾU",
    data.title,
    `${data.teamName} · Bầu cử #${data.electionId}`,
    `Người xuất: ${data.exporter} · Ngày lập: ${teamExportDate(data.generatedAt)}`,
  ];
  lines.forEach((line, index) => {
    sheet.mergeCells(index + 1, 1, index + 1, columns);
    const cell = sheet.getCell(index + 1, 1);
    cell.value = line;
    cell.font = {
      name: "Calibri",
      size: index === 1 ? 18 : 11,
      bold: index < 3,
      color: { argb: index < 3 ? "FF215E3D" : "FF666358" },
    };
    cell.alignment = { vertical: "middle", wrapText: true };
    sheet.getRow(index + 1).height = index === 1 ? 36 : 24;
  });
  sheet.views = [{ state: "frozen", ySplit: 6 }];
  return sheet;
}
function table(
  sheet: ExcelJS.Worksheet,
  headers: string[],
  rows: unknown[][],
  widths: number[],
) {
  const header = sheet.getRow(6);
  header.values = headers;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF215E3D" },
  };
  header.alignment = { wrapText: true, vertical: "middle" };
  header.height = 30;
  widths.forEach((width, index) => (sheet.getColumn(index + 1).width = width));
  rows.forEach((values, index) => {
    const row = sheet.getRow(index + 7);
    row.values = values as ExcelJS.CellValue[];
    row.alignment = { wrapText: true, vertical: "top" };
    if (index % 2 === 1)
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF8F7F3" },
      };
  });
  sheet.autoFilter = {
    from: { row: 6, column: 1 },
    to: { row: 6 + rows.length, column: headers.length },
  };
  sheet.pageSetup.printTitlesRow = "1:6";
}
export async function electionTeamExcel(data: ElectionTeamExport) {
  const book = new ExcelJS.Workbook();
  book.creator = "Hội Thánh";
  book.title = `Kết quả kiểm phiếu – ${data.title}`;
  const summary = heading(book, "Tổng hợp", data, 2);
  table(summary, ["Nội dung", "Số lượng"], teamStats(data), [62, 24]);
  summary.addRow([]);
  summary.addRow(["Bắt đầu", teamExportDate(data.openedAt)]);
  summary.addRow(["Kết thúc", teamExportDate(data.closedAt)]);
  const candidates = heading(book, "Kết quả ứng viên", data, 4);
  table(
    candidates,
    ["Số ứng viên", "Họ tên", "Số phiếu", "% phiếu hợp lệ của tổ"],
    data.results.map((candidate) => [
      candidate.candidate_no,
      candidate.full_name,
      candidate.votes,
      candidate.percent / 100,
    ]),
    [16, 42, 16, 26],
  );
  candidates.getColumn(4).numFmt = "0.0%";
  const names = new Map(
    data.results.map((candidate) => [
      candidate.id,
      `#${candidate.candidate_no} ${candidate.full_name}`,
    ]),
  );
  const tickets = heading(book, "Chi tiết phiếu", data, 9);
  table(
    tickets,
    [
      "Số phiếu",
      "Mã phiếu đầy đủ",
      "Ngày nhập",
      "Người nhập",
      "Trạng thái",
      "Số lựa chọn",
      "Ứng viên đã chọn",
      "Lý do hủy",
      "Yêu cầu hủy",
    ],
    data.tickets.map((ticket) => [
      ticket.team_ticket_no,
      ticket.ticket_code,
      teamExportDate(ticket.created_at),
      ticket.scrutineer_name,
      teamTicketStatus(ticket),
      ticket.candidate_ids.length,
      ticket.candidate_ids
        .map((id: number) => names.get(id) ?? `#${id}`)
        .join("\n"),
      ticket.void_reason ?? "",
      ticket.void_requested_reason ?? "",
    ]),
    [12, 58, 25, 32, 30, 15, 65, 35, 35],
  );
  const members = heading(book, "Thành viên", data, 2);
  table(
    members,
    ["STT", "Họ tên"],
    data.members.map((member, index) => [index + 1, member.full_name]),
    [12, 48],
  );
  return Buffer.from(await book.xlsx.writeBuffer());
}
