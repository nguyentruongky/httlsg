import type { AuthUser } from "@org/core";

export interface Election {
  id: number;
  name: string;
  description: string | null;
  status: ElectionStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ElectionStatus = "draft" | "open" | "closed";

export interface ElectionRound {
  id: number;
  election_id: number;
  round_no: number;
  status: "draft" | "open" | "closed";
  phase: ElectionPhase | null;
  opened_at: string | null;
  closed_at: string | null;
  election_name: string;
  election_code: string;
}

export interface AssignedElectionRound extends ElectionRound {
  assignment: {
    round_id: number;
    user_id: string;
    team_id: string | null;
    team_name: string | null;
    code?: string;
  };
}

export type ElectionPhase = "draft" | "online" | "checking" | "closed";

export const ELECTION_PHASE_LABELS: Record<ElectionPhase, string> = {
  draft: "Chưa bắt đầu",
  online: "Nhận phiếu trực tuyến",
  checking: "Kiểm phiếu thủ công",
  closed: "Đã đóng",
};

export interface ElectionCandidate {
  id: number;
  candidate_no: number;
  full_name: string;
  name_search: string;
  member_id: string | null;
  extra: Record<string, unknown>;
  included: boolean;
}

export interface ElectionResult {
  id: number;
  candidate_no: number;
  full_name: string;
  votes: number;
  percent: number;
  rank: number;
  tie: boolean;
}

export interface ElectionSummary {
  received: number;
  valid: number;
  invalid: number;
  blank: number;
  void: number;
  over_limit: number;
  counted_ballots: number;
  paper: number;
  online: number;
  average: number;
}

export interface ElectionProgress {
  user_id: string;
  full_name: string;
  tickets: number;
  invalid: number;
  pending_count: number;
  heartbeat_at: string | null;
  last_submission: string | null;
}

export interface ElectionRoundDetail {
  round: ElectionRound;
  election: Election;
  candidates: ElectionCandidate[];
  scrutineers: Scrutineer[];
  rounds: ElectionRound[];
  results?: ElectionResult[];
  summary?: ElectionSummary;
  progress?: ElectionProgress[];
}

export interface Scrutineer {
  id: string;
  full_name: string;
  team_id: string | null;
  team_name: string | null;
  team_sort_order: number | null;
}

export interface ElectionTicket {
  candidates: ElectionCandidate[];
  client_uuid: string;
  id: number | null;
  source: "online" | "offline";
  candidate_ids: number[];
  candidate_no?: number;
  created_at: string;
  sync_state: "synced" | "pending" | "failed";
  scrutineer_name: string;
  team_id: string | null;
  team_name: string | null;
  team_sort_order: number | null;
  team_ticket_no?: number;
  seq_no?: number;
}

export interface ElectionAuditLog {
  id: number;
  created_at: string;
  full_name: string;
  action: string;
  payload: Record<string, unknown>;
}

export interface ElectionBackup {
  hash: string;
  chainErrors: string[];
  items: ElectionTicket[];
}

export interface PrepareNextRule {
  rule: "top" | "minimum" | "manual";
  value: number;
  candidateIds: number[];
  dryRun: boolean;
}

export interface PrepareNextPreview {
  results: {
    id: number;
    rank: number;
    candidate_no: number;
    full_name: string;
    votes: number;
    tie: boolean;
  }[];
  tie: boolean;
  selected: number[];
}

export interface ConfigureRoundInput {
  userIds: string[];
  candidateIds: number[];
}

export interface StartRoundInput {
  phase: "online" | "checking";
  reason?: string;
}

export interface StopRoundInput {
  reason?: string;
}

export interface ManualCheckingInput {
  // empty
}

export interface ReopenRoundInput {
  reason: string;
}

export interface VoidTicketInput {
  reason: string;
  requestOnly?: boolean;
}

export interface CastVoteInput {
  requestId: string;
  candidateIds: number[];
  location: {
    lat: number;
    lng: number;
    accuracy: number;
    nonce: string;
  };
}

export const MAX_ELECTION_SELECTIONS = 10;

export function canUserAdminElection(user: AuthUser): boolean {
  return [user.role, ...(user.roles ?? [])].some(
    (r) => r === "admin" || r === "election_admin",
  );
}

export function canUserAccessElection(user: AuthUser): boolean {
  return (
    canUserAdminElection(user) ||
    user.hasElectionAssignments === true ||
    [user.role, ...(user.roles ?? [])].includes("election_scrutineer")
  );
}

export function isElectionScrutineer(user: AuthUser): boolean {
  return !canUserAdminElection(user) && canUserAccessElection(user);
}

export function electionPhaseFromRound(round: {
  status: string;
  phase?: string | null;
}): ElectionPhase {
  if (
    round.phase &&
    ["draft", "online", "checking", "closed"].includes(round.phase)
  ) {
    return round.phase as ElectionPhase;
  }
  if (round.status === "open") return "checking";
  if (round.status === "closed") return "closed";
  return "draft";
}

export function canCheckElection(round: {
  status: string;
  phase?: string | null;
}): boolean {
  return (
    round.status === "open" && electionPhaseFromRound(round) === "checking"
  );
}

export function electionSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function searchElectionCandidates(
  candidates: ElectionCandidate[],
  query: string,
): ElectionCandidate[] {
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

export type ElectionTicketKind = "normal" | "blank" | "invalid";

export function ticketOutcome(
  ids: readonly unknown[],
  kind: ElectionTicketKind = "normal",
): {
  status: "valid" | "invalid";
  invalid_reason: string | null;
} {
  if (kind === "invalid")
    return { status: "invalid", invalid_reason: "manual" };
  if (kind === "blank") return { status: "invalid", invalid_reason: "blank" };
  if (ids.length > 10)
    return { status: "invalid", invalid_reason: "over_limit" };
  if (ids.length === 0) return { status: "invalid", invalid_reason: "blank" };
  return { status: "valid", invalid_reason: null };
}
