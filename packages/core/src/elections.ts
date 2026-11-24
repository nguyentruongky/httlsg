import type { AuthUser } from "./auth-contract";
export const MAX_ELECTION_SELECTIONS = 10;
export const electionAdmin = (u: AuthUser) =>
  [u.role, ...(u.roles ?? [])].some(
    (r) => r === "admin" || r === "election_admin",
  );
export const electionAccess = (u: AuthUser) =>
  electionAdmin(u) ||
  u.hasElectionAssignments === true ||
  [u.role, ...(u.roles ?? [])].includes("election_scrutineer");
export const isElectionScrutineer = (user: AuthUser) =>
  !electionAdmin(user) && electionAccess(user);
export const ELECTION_PHASE_LABELS = {
  draft: "Chưa bắt đầu",
  online: "Nhận phiếu trực tuyến",
  checking: "Kiểm phiếu thủ công",
  closed: "Đã đóng",
} as const;
export type ElectionPhase = keyof typeof ELECTION_PHASE_LABELS;
export function electionPhase(round: {
  status: string;
  phase?: string | null;
}): ElectionPhase {
  if (round.phase && Object.hasOwn(ELECTION_PHASE_LABELS, round.phase))
    return round.phase as ElectionPhase;
  return round.status === "open"
    ? "checking"
    : round.status === "closed"
      ? "closed"
      : "draft";
}
export const canCheckElection = (round: {
  status: string;
  phase?: string | null;
}) => round.status === "open" && electionPhase(round) === "checking";

export type AssignedElectionRound = {
  id: number;
  election_id: number;
  round_no: number;
  status: "draft" | "open" | "closed";
  phase?: ElectionPhase;
  opened_at: string | null;
  closed_at: string | null;
  election_name: string;
  election_code: string;
  assignment: {
    round_id: number;
    user_id: string;
    team_id: string | null;
    team_name: string | null;
    code?: string;
  };
};
export function electionSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
export type ElectionTicketKind = "normal" | "blank" | "invalid";
export function ticketOutcome(
  ids: readonly unknown[],
  kind: ElectionTicketKind = "normal",
) {
  if (kind === "invalid")
    return { status: "invalid", invalid_reason: "manual" };
  if (kind === "blank") return { status: "invalid", invalid_reason: "blank" };
  return ids.length > MAX_ELECTION_SELECTIONS
    ? { status: "invalid", invalid_reason: "over_limit" }
    : ids.length === 0
      ? { status: "invalid", invalid_reason: "blank" }
      : { status: "valid", invalid_reason: null };
}
export type ElectionCandidate = {
  id: number;
  candidate_no: number;
  full_name: string;
  name_search: string;
  member_id?: string | null;
  extra?: Record<string, unknown>;
};
export function searchElectionCandidates(
  candidates: ElectionCandidate[],
  query: string,
) {
  const tokens = electionSearch(query).split(" ").filter(Boolean);
  return candidates
    .filter((c) =>
      tokens.every((t) => `${c.candidate_no} ${c.name_search}`.includes(t)),
    )
    .slice(0, 20);
}
export function electionCommand(value: string): {
  type: "submit" | "clear" | "undo" | "toggle" | "invalid";
  position?: number;
} {
  if (value === "-s") return { type: "submit" };
  if (value === "-clear") return { type: "clear" };
  if (value === "-undo") return { type: "undo" };
  if (/^-[1-9]\d*$/.test(value))
    return { type: "toggle", position: Number(value.slice(1)) - 1 };
  return { type: "invalid" };
}
