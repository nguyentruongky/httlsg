import type { AuthUser } from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { roundCandidates } from "./elections";
export async function electionTeamExportData(
  db: DB,
  actor: AuthUser,
  round: any,
) {
  const teamId = round.assignment?.team_id;
  if (!teamId)
    throw new HttpError(403, "Bạn chưa được phân công vào tổ kiểm phiếu.");
  if (round.status !== "closed")
    throw new HttpError(
      409,
      "Có thể xuất kết quả và biên bản sau khi cuộc bầu cử kết thúc.",
    );
  const tickets = (
    await db.query(
      `SELECT t.*,u.full_name scrutineer_name FROM church.election_tickets t JOIN church.users u ON u.id=t.scrutineer_id WHERE t.election_id=$1 AND t.team_id=$2 ORDER BY t.team_ticket_no,t.id`,
      [round.election_id, teamId],
    )
  ).rows;
  const members = (
    await db.query(
      `SELECT p.id,p.full_name,min(s.position) position FROM church.election_scrutineers s JOIN church.member_profiles p ON p.id=s.user_id WHERE s.election_id=$1 AND s.team_id=$2 GROUP BY p.id ORDER BY min(s.position) NULLS LAST,p.id`,
      [round.election_id, teamId],
    )
  ).rows;
  const candidates = await roundCandidates(db, round.id);
  const valid = tickets.filter((ticket) => ticket.status === "valid");
  const blank = tickets.filter(
    (ticket) =>
      ticket.status === "invalid" && ticket.invalid_reason === "blank",
  ).length;
  const invalid = tickets.filter(
    (ticket) =>
      ticket.status === "invalid" && ticket.invalid_reason !== "blank",
  ).length;
  const voided = tickets.filter((ticket) => ticket.status === "void").length;
  const votes = new Map<number, number>();
  for (const ticket of valid)
    for (const id of ticket.candidate_ids as number[])
      votes.set(id, (votes.get(id) ?? 0) + 1);
  return {
    electionId: round.election_id as number,
    title: round.election_name as string,
    teamId: teamId as string,
    teamName: (round.assignment.team_name ?? "Tổ kiểm phiếu") as string,
    exporter: actor.name,
    openedAt: round.opened_at,
    closedAt: round.closed_at,
    generatedAt: new Date().toISOString(),
    members,
    tickets,
    stats: {
      received: tickets.length,
      counted: tickets.length - voided,
      valid: valid.length,
      invalid,
      blank,
      voided,
    },
    results: candidates
      .map((candidate) => ({
        ...candidate,
        votes: votes.get(candidate.id) ?? 0,
        percent: valid.length
          ? (100 * (votes.get(candidate.id) ?? 0)) / valid.length
          : 0,
      }))
      .sort((a, b) => b.votes - a.votes || a.candidate_no - b.candidate_no),
  };
}
export type ElectionTeamExport = Awaited<
  ReturnType<typeof electionTeamExportData>
>;
export const teamExportDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    : "—";
export const teamTicketStatus = (ticket: {
  status: string;
  invalid_reason: string | null;
}) =>
  ticket.status === "void"
    ? "Đã hủy"
    : ticket.status === "valid"
      ? "Hợp lệ"
      : ticket.invalid_reason === "blank"
        ? "Phiếu trắng"
        : ticket.invalid_reason === "over_limit"
          ? "Phiếu bất hợp lệ (quá 10)"
          : "Phiếu bất hợp lệ";
export function teamStats(data: ElectionTeamExport): Array<[string, number]> {
  return [
    ["Tổng số phiếu đã nhận", data.stats.received],
    ["Số phiếu được kiểm (không gồm phiếu đã hủy)", data.stats.counted],
    ["Hợp lệ", data.stats.valid],
    ["Phiếu bất hợp lệ (không gồm phiếu trắng)", data.stats.invalid],
    ["Phiếu trắng", data.stats.blank],
    ["Đã hủy", data.stats.voided],
  ];
}
