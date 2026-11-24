import {
  teamStats,
  type ElectionTeamExport,
} from "./election-team-export-data";
import { teamMinutes } from "./election-team-minutes";
const escape = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
export function electionTeamPrint(data: ElectionTeamExport) {
  const minutes = teamMinutes(data);
  const paragraph = (text: string) => `<p>${escape(text)}</p>`;
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(minutes.title)} - ${escape(data.title)}</title><style>
 @page{size:A4 portrait;margin:20mm}*{box-sizing:border-box}body{margin:0;color:#111;background:white;font:13pt/1.45 "Times New Roman",serif}header,h1,h2,.center{text-align:center}header{font-weight:bold;margin-bottom:8mm}h1{font-size:18pt;margin:0 0 3mm}h2{font-size:15pt;margin:0 0 3mm}h3{font-size:13pt;margin:6mm 0 3mm}p{margin:0 0 4mm}table{width:100%;border-collapse:collapse;margin-bottom:5mm}th,td{border:1px solid #555;padding:2mm;text-align:left;vertical-align:top}thead{display:table-header-group}tr{break-inside:avoid}h1,h2,h3{break-after:avoid}.signatures{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10mm 5mm;margin-top:6mm}.signature{break-inside:avoid;text-align:center;min-height:48mm}.signature h4{font-size:11pt;margin:0 0 2mm}.signature .hint{font-size:11pt}.signature .name{margin-top:22mm;font-weight:bold}.handover{break-inside:avoid;text-align:center;margin-top:10mm;min-height:42mm}.notes{border-bottom:1px dotted #777;height:8mm;margin-bottom:2mm}footer{margin-top:10mm;text-align:center;font-size:9pt;color:#555}
 </style></head><body><header>${escape(minutes.header)}</header><h1>${escape(minutes.title)}</h1><h2>${escape(data.title)}</h2><p class="center">${escape(minutes.identity)}</p>
 ${paragraph(minutes.times)}${paragraph(minutes.introduction)}${paragraph(minutes.participants)}
 <table><thead><tr><th>Nội dung</th><th>Số lượng</th></tr></thead><tbody>${teamStats(
   data,
 )
   .map(
     ([label, value]) => `<tr><td>${escape(label)}</td><td>${value}</td></tr>`,
   )
   .join("")}</tbody></table>
 <h3>KẾT QUẢ ỨNG VIÊN</h3><table><thead><tr><th>STT</th><th>Họ tên</th><th>Phiếu</th><th>% hợp lệ của tổ</th></tr></thead><tbody>${data.results.map((candidate, index) => `<tr><td>${index + 1}</td><td>${escape(candidate.full_name)}</td><td>${candidate.votes}</td><td>${candidate.percent.toFixed(1)}%</td></tr>`).join("")}</tbody></table>
 ${paragraph(minutes.counting)}${paragraph(minutes.comments)}<div class="notes"></div><div class="notes"></div>${paragraph(minutes.confirmation)}<p class="center">${escape(minutes.date)}</p>
 <section class="signatures">${minutes.members.map((name) => `<div class="signature"><h4>THÀNH VIÊN TỔ KIỂM PHIẾU</h4><p class="hint">(Ký và ghi rõ họ tên)</p><p class="name">${escape(name)}</p></div>`).join("")}</section>
 <section class="handover"><strong>${escape(minutes.handover)}</strong><p>(Ký, ghi rõ họ tên)</p></section><footer>${escape(minutes.identity)}</footer></body></html>`;
}
