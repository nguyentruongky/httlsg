import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { join } from "node:path";
import { z } from "zod";
import { electionSearch, electionAdmin, type AuthUser } from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { candidateSnapshot, saveCandidateList } from "./election-candidates";
import {
  requireElection,
  electionLog,
  roundCandidates,
  roundTickets,
  roundResults,
  fileHash,
} from "./elections";

const workbookBuffer = async (book: ExcelJS.Workbook) =>
  Buffer.from(await book.xlsx.writeBuffer());
function sheet(
  book: ExcelJS.Workbook,
  name: string,
  rows: Record<string, any>[],
  columns?: string[],
) {
  const ws = book.addWorksheet(name);
  const keys = columns ?? (rows[0] ? Object.keys(rows[0]) : ["message"]);
  ws.columns = keys.map((key) => ({
    header: key,
    key,
    width: key.includes("name") ? 35 : 24,
  }));
  rows.forEach((r) =>
    ws.addRow(
      Object.fromEntries(
        keys.map((k) => [
          k,
          typeof r[k] === "object" && r[k] !== null
            ? JSON.stringify(r[k])
            : r[k],
        ]),
      ),
    ),
  );
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  return ws;
}
export async function previewCandidateImport(
  db: DB,
  actor: AuthUser,
  election: any,
  input: unknown,
  request: Request,
) {
  requireElection(actor, true);
  if (
    (
      await db.query(
        "SELECT 1 FROM church.election_rounds WHERE election_id=$1 AND opened_at IS NOT NULL",
        [election.id],
      )
    ).rowCount
  )
    throw new HttpError(409, "Danh sách ứng viên đã được khóa.");
  const data = z
    .object({
      file: z.string().max(14000000),
      dryRun: z.boolean().default(true),
      expectedHash: z.string().optional(),
    })
    .parse(input);
  const bytes = Buffer.from(data.file, "base64");
  if (bytes.length > 10000000) throw new HttpError(413, "Tệp tối đa 10 MB.");
  const hash = fileHash(bytes);
  const book = new ExcelJS.Workbook();
  try {
    await book.xlsx.load(bytes as any);
  } catch {
    throw new HttpError(400, "Tệp Excel không hợp lệ.");
  }
  const ws = book.getWorksheet("Candidates") ?? book.worksheets[0];
  if (!ws) throw new HttpError(400, "Tệp Excel không có trang dữ liệu.");
  if (ws.rowCount > 10001) throw new HttpError(400, "Tối đa 10.000 ứng viên.");
  const headers = new Map<string, number>();
  const aliases: Record<string, string> = {
    "ho va ten": "full_name",
    "ho ten": "full_name",
    "ten ung vien": "full_name",
    "so ung vien": "candidate_no",
    "ma thanh vien": "member_id",
    "tham gia": "include",
  };
  ws.getRow(1).eachCell((cell, col) => {
    const raw = cell.text.trim();
    headers.set(aliases[electionSearch(raw)] ?? raw, col);
  });
  if (!headers.has("full_name"))
    throw new HttpError(
      400,
      "Tệp cần có cột Họ và tên hoặc full_name ở dòng đầu.",
    );
  const { existing, revision } = await candidateSnapshot(db, election.id);
  const errors: string[] = [],
    warnings: string[] = [],
    rows: any[] = [],
    seen = new Set<number>(),
    names = new Set<string>();
  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    if (!row.hasValues) continue;
    const text = (key: string) =>
      headers.has(key) ? row.getCell(headers.get(key)!).text.trim() : "";
    const full_name = text("full_name");
    const raw = text("candidate_no");
    const no = raw ? Number(raw) : null;
    const name_search = electionSearch(full_name);
    if (!full_name || full_name.length > 200)
      errors.push(`Dòng ${i}: họ tên bắt buộc, tối đa 200 ký tự.`);
    if (no !== null && (!Number.isSafeInteger(no) || no <= 0 || seen.has(no)))
      errors.push(`Dòng ${i}: số ứng viên không hợp lệ hoặc trùng.`);
    if (no !== null) {
      seen.add(no);
      if (!existing.some((c) => c.candidate_no === no))
        errors.push(`Dòng ${i}: ứng viên mới phải để trống candidate_no.`);
    }
    if (names.has(name_search))
      warnings.push(`Dòng ${i}: trùng tên ${full_name}.`);
    names.add(name_search);
    let member_id = text("member_id") || null;
    if (
      member_id &&
      (!z.uuid().safeParse(member_id).success ||
        !(
          await db.query(
            "SELECT 1 FROM church.member_profiles WHERE id=$1 AND deleted_at IS NULL",
            [member_id],
          )
        ).rowCount)
    ) {
      warnings.push(
        `Dòng ${i}: member_id không tồn tại, sẽ lưu không liên kết.`,
      );
      member_id = null;
    }
    const includeValue = electionSearch(text("include"));
    const include =
      !includeValue || ["y", "yes", "true", "1", "co"].includes(includeValue)
        ? "Y"
        : ["n", "no", "false", "0", "khong"].includes(includeValue)
          ? "N"
          : text("include").toUpperCase();
    if (!["Y", "N"].includes(include))
      errors.push(`Dòng ${i}: include phải là Y hoặc N.`);
    const extra: Record<string, string> = {};
    for (const [key, col] of headers)
      if (
        ![
          "candidate_no",
          "member_id",
          "full_name",
          "include",
          "area",
          "location",
        ].includes(key)
      )
        extra[key] = row.getCell(col).text;
    rows.push({
      candidate_no: no,
      full_name,
      name_search,
      member_id,
      included: include === "Y",
      extra,
    });
  }
  const removed = existing.filter(
    (c) => !c.retired && !rows.some((r) => r.candidate_no === c.candidate_no),
  );
  const added = rows.filter((r) => r.candidate_no === null);
  const changed = rows.filter((r) => {
    const old = existing.find((c) => c.candidate_no === r.candidate_no);
    return (
      old &&
      (old.full_name !== r.full_name ||
        old.member_id !== r.member_id ||
        old.included !== r.included ||
        JSON.stringify(old.extra) !== JSON.stringify(r.extra) ||
        old.retired)
    );
  });
  const preview = {
    hash,
    revision,
    errors,
    warnings,
    added,
    removed,
    changed,
    rows,
  };
  if (data.dryRun) return preview;
  if (errors.length) throw new HttpError(400, errors[0]);
  if (data.expectedHash !== hash)
    throw new HttpError(409, "Cần xem trước đúng tệp trước khi xác nhận.");
  return saveCandidateList(
    db,
    actor,
    election,
    { rows, revision, sourceFileHash: hash },
    request,
  );
}
export async function electionReport(
  db: DB,
  actor: AuthUser,
  round: any,
  format: string,
  mine: boolean,
  request: Request,
) {
  requireElection(actor, !mine);
  const tickets = await roundTickets(db, actor, round.id);
  const own = mine
    ? tickets.filter((t) => t.scrutineer_id === actor.id)
    : tickets;
  const aggregate = mine ? null : await roundResults(db, round.id);
  const candidates = await roundCandidates(db, round.id);
  const ownResults = candidates
    .map((c) => ({
      ...c,
      votes: own.filter(
        (t) =>
          t.status === "valid" && t.candidates.some((v: any) => v.id === c.id),
      ).length,
    }))
    .sort((a, b) => b.votes - a.votes);
  const logs = (
    await db.query(
      "SELECT * FROM church.election_action_log WHERE round_id=$1 AND ($2::boolean OR user_id=$3) ORDER BY id",
      [round.id, !mine && electionAdmin(actor), actor.id],
    )
  ).rows;
  const report = {
    round,
    user: mine ? actor.name : null,
    tickets: own,
    results: aggregate?.results ?? ownResults,
    summary: aggregate?.summary ?? {
      received: own.length,
      valid: own.filter((t) => t.status === "valid").length,
      invalid: own.filter((t) => t.status === "invalid").length,
      over_limit: own.filter(
        (t) => t.status === "invalid" && t.invalid_reason === "over_limit",
      ).length,
      blank: own.filter(
        (t) => t.status === "invalid" && t.invalid_reason === "blank",
      ).length,
      void: own.filter((t) => t.status === "void").length,
    },
    progress: aggregate?.progress ?? [],
    logs,
  };
  const hash = fileHash(JSON.stringify(report)).slice(0, 8);
  const time = new Date().toISOString();
  await electionLog(
    db,
    actor,
    round.election_id,
    round.id,
    "results_exported",
    { format, mine, hash },
    request,
  );
  if (format === "xlsx") {
    const book = new ExcelJS.Workbook();
    sheet(book, "Summary", [
      {
        ...report.summary,
        checked_invalid_non_blank: Math.max(
          0,
          Number(report.summary.invalid ?? 0) -
            Number(report.summary.blank ?? 0),
        ),
        round_status: round.status,
        generated_at: time,
        hash,
      },
    ]);
    sheet(book, "Results", report.results);
    sheet(book, "Tickets", own);
    sheet(
      book,
      "Carry-over",
      candidates.map((c) => ({
        candidate_no: c.candidate_no,
        full_name: c.full_name,
        source: c.source,
        carried_from_round: c.carried_from_round,
        carry_rule: c.carry_rule,
      })),
    );
    sheet(book, "Audit", logs);
    return workbookBuffer(book);
  }
  if (format !== "pdf") throw new HttpError(400, "Định dạng không hợp lệ.");
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 55, left: 40, right: 40 },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.font(
      process.env.ELECTION_PDF_FONT ??
        join(process.cwd(), "assets/NotoSans-Regular.ttf"),
    );
    const line = (text: string, size = 10) => {
      const h = doc.fontSize(size).heightOfString(text, { width: 515 });
      if (doc.y + h > 775) doc.addPage();
      doc.fontSize(size).fillColor("#111827").text(text, { width: 515 });
      doc.moveDown(0.35);
    };
    const title = (text: string) => {
      if (doc.y > 700) doc.addPage();
      line(text, 14);
    };
    const table = (
      headers: string[],
      rows: { values: string[]; strike?: boolean }[],
      widths: number[],
    ) => {
      let rowOnPage = 0;
      const header = () => {
        const y = doc.y;
        doc.rect(40, y, 515, 24).fill("#e5e7eb");
        let x = 44;
        headers.forEach((h, i) => {
          doc
            .fontSize(9)
            .fillColor("#111827")
            .text(h, x, y + 5, { width: widths[i] - 8, lineBreak: false });
          x += widths[i];
        });
        doc.y = y + 26;
      };
      header();
      rows.forEach((row, index) => {
        doc.fontSize(8);
        const height = Math.max(
          24,
          ...row.values.map(
            (v, i) => doc.heightOfString(v, { width: widths[i] - 8 }) + 10,
          ),
        );
        if (doc.y + height > 770 || rowOnPage >= 25) {
          doc.addPage();
          rowOnPage = 0;
          header();
        }
        const y = doc.y;
        if (index % 2 === 0) doc.rect(40, y, 515, height).fill("#f3f4f6");
        let x = 44;
        row.values.forEach((value, i) => {
          doc
            .fillColor("#111827")
            .fontSize(8)
            .text(value, x, y + 5, {
              width: widths[i] - 8,
              strike: row.strike,
            });
          x += widths[i];
        });
        doc.y = y + height;
        rowOnPage++;
      });
      doc.moveDown();
    };
    line(`${round.election_name} (#${round.election_id})`, 18);
    title(
      `Bầu cử #${round.election_id} · ${mine ? "Báo cáo kiểm phiếu viên" : "Kết quả bầu cử"}`,
    );
    const date = (v: any) =>
      v
        ? new Date(v).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
        : "—";
    line(
      mine
        ? `${actor.name} · ${round.assignment?.team_name ?? ""}`
        : `Mở: ${date(round.opened_at)} · Đóng: ${date(round.closed_at)}`,
    );
    line(`Ngày lập: ${date(time)}`);
    const s = report.summary;
    line(
      `Tổng phiếu: ${s.received} · Hợp lệ: ${s.valid} · Không hợp lệ: ${s.invalid} (quá 10: ${s.over_limit}, trắng: ${s.blank}) · Hủy: ${s.void}`,
    );
    if (mine) {
      line(
        `Phiếu đầu: ${date(own.at(-1)?.received_at)} · Phiếu cuối: ${date(own[0]?.received_at)}`,
      );
      line(
        `Chờ đồng bộ (thiết bị báo gần nhất): ${round.assignment?.pending_count ?? 0}. Báo cáo chỉ bao gồm phiếu máy chủ đã nhận; xem bản sao JSON để kiểm tra phiếu bị từ chối.`,
      );
    } else {
      line(`Số kiểm phiếu viên: ${report.progress.length}`);
      if (candidates.some((candidate) => candidate.carried_from_round)) {
        title("Tạo bầu cử tiếp theo");
        const rules = [
          ...new Set(candidates.map((c) => JSON.stringify(c.carry_rule ?? {}))),
        ];
        rules.forEach((r) => line(`Quy tắc: ${r}`));
      }
    }
    title(mine ? "Thống kê riêng (phiếu hợp lệ)" : "Kết quả xếp hạng");
    table(
      ["Số", "Họ tên", "Phiếu", "% hợp lệ"],
      report.results.map((r: any, i: number) => ({
        values: [
          `${r.rank ?? i + 1}${r.tie ? " ≡" : ""}`,
          String(r.candidate_no),
          r.full_name,
          String(r.votes),
          `${(s.valid ? (100 * r.votes) / s.valid : 0).toFixed(1)}%`,
        ],
      })),
      [45, 40, 305, 45, 80],
    );
    if (!mine) {
      title("Biểu đồ Top 10");
      const maximum = report.results[0]?.votes ?? 0;
      for (const r of report.results.slice(0, 10)) {
        if (doc.y > 720) doc.addPage();
        line(`#${r.candidate_no} ${r.full_name}: ${r.votes}`, 9);
        const y = doc.y;
        doc
          .rect(40, y, maximum ? (480 * r.votes) / maximum : 0, 9)
          .fill("#2563eb");
        doc.y = y + 17;
      }
      title("Tiến độ kiểm phiếu viên");
      table(
        ["Kiểm phiếu viên", "Tổng", "Không hợp lệ", "Lần cuối"],
        report.progress.map((p: any) => ({
          values: [
            `${p.full_name}`,
            String(p.tickets),
            String(p.invalid),
            date(p.last_submission),
          ],
        })),
        [230, 45, 85, 155],
      );
    }
    doc.addPage();
    title(
      mine ? "Danh sách phiếu đã nộp" : "Phiếu không hợp lệ và phiếu đã hủy",
    );
    const listed = mine ? own : own.filter((t) => t.status !== "valid");
    table(
      ["#", "Mã phiếu / Thời gian", "Trạng thái / Lý do", "Ứng viên được chọn"],
      listed.map((t: any, i: number) => ({
        strike: t.status === "void",
        values: [
          String(i + 1),
          `${t.ticket_code}\n${date(t.created_at)}`,
          `${t.status === "valid" ? "Hợp lệ" : t.status === "void" ? "Đã hủy" : "Không hợp lệ"}\n${t.void_reason ?? (t.invalid_reason === "over_limit" ? "Quá 10 ứng viên" : t.invalid_reason === "blank" ? "Phiếu trắng" : t.invalid_reason === "manual" ? "Bất hợp lệ" : "")}`,
          t.candidates
            .map((c: any) => `#${c.candidate_no} ${c.full_name}`)
            .join(", ") || "—",
        ],
      })),
      [25, 145, 115, 230],
    );
    title("Phụ lục nhật ký");
    table(
      ["Thời gian", "Thao tác", "Mã phiếu / Dữ liệu"],
      logs.slice(-100).map((l: any) => ({
        values: [
          date(l.created_at),
          l.action,
          String(l.payload?.ticketId ?? l.payload?.client_uuid ?? ""),
        ],
      })),
      [135, 185, 195],
    );
    title("Xác nhận");
    line(
      mine
        ? "Kiểm phiếu viên ký / ngày: ____________________\n\nNgười xác minh (quản trị) / ngày: ____________________"
        : "Ban kiểm phiếu:\n\n1. ____________________\n\n2. ____________________\n\n3. ____________________",
    );
    const range = doc.bufferedPageRange();
    for (let p = 0; p < range.count; p++) {
      doc.switchToPage(p);
      doc
        .fillColor("#4b5563")
        .fontSize(8)
        .text(`Page ${p + 1} of ${range.count} · ${time} · ${hash}`, 40, 795, {
          lineBreak: false,
        });
    }
    doc.end();
  });
}
