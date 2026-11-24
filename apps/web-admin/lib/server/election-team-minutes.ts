import {
  teamExportDate,
  type ElectionTeamExport,
} from "./election-team-export-data";
/** Shared wording for editable Word minutes and the browser print version. */
export function teamMinutes(data: ElectionTeamExport) {
  return {
    header: "HỘI THÁNH · BAN KIỂM PHIẾU",
    title: "BIÊN BẢN KIỂM PHIẾU",
    identity: `${data.teamName} · Bầu cử #${data.electionId}`,
    times: `Thời gian bắt đầu: ${teamExportDate(data.openedAt)}. Thời gian kết thúc: ${teamExportDate(data.closedAt)}.`,
    introduction: `Biên bản được lập lúc ${teamExportDate(data.generatedAt)}. Các thành viên ${data.teamName} tiến hành kiểm phiếu cho cuộc bầu cử nêu trên và ghi nhận kết quả như sau:`,
    participants: `Số thành viên trong tổ: ${data.members.length}. Số ứng viên: ${data.results.length}.`,
    counting:
      "Phiếu đã hủy được giữ trong lịch sử và không được tính vào kết quả. Phiếu trắng và phiếu bất hợp lệ được thống kê riêng; chỉ phiếu hợp lệ đóng góp vào kết quả ứng viên.",
    comments:
      "Các thành viên xác nhận đã kiểm tra số lượng phiếu và kết quả nêu trên. Ý kiến bổ sung (nếu có):",
    confirmation:
      "Biên bản được các thành viên trong tổ thống nhất và ký xác nhận để bàn giao cho Ban kiểm phiếu.",
    date: "...................., ngày ...... tháng ...... năm ........",
    members: data.members.length
      ? data.members.map((member) => member.full_name)
      : ["........................................"],
    handover: "ĐẠI DIỆN BAN KIỂM PHIẾU NHẬN BÀN GIAO",
  };
}
