import { apiRequest, authenticatedFetch, type AuthUser } from "@org/core";
import type {
  AssignedElectionRound,
  Election,
  ElectionRound,
  ElectionRoundDetail,
  ElectionCandidate,
  ElectionResult,
  ElectionSummary,
  ElectionProgress,
  ElectionTicket,
  Scrutineer,
  ConfigureRoundInput,
  StartRoundInput,
  StopRoundInput,
  ManualCheckingInput,
  ReopenRoundInput,
  VoidTicketInput,
  CastVoteInput,
  PrepareNextRule,
  PrepareNextPreview,
  ElectionBackup,
  ElectionAuditLog,
} from "../domain/types";

/**
 * Pure async API functions - no React hooks
 * Returns domain types, not raw DTOs
 */

const ELECTIONS_BASE = "/api/elections";
const ROUNDS_BASE = "/api/rounds";
const TICKETS_BASE = "/api/tickets";

export async function fetchElections(): Promise<Election[]> {
  const data = await apiRequest<any>("/api/elections");
  return mapElectionsList(data);
}

export async function fetchElection(id: number): Promise<ElectionRoundDetail> {
  const data = await apiRequest<any>(`${ELECTIONS_BASE}/${id}`);
  return mapElectionDetail(data);
}

export async function createElection(
  name: string,
  description: string = "",
): Promise<Election> {
  const data = await apiRequest<any>(ELECTIONS_BASE, {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
  return mapElection(data);
}

export async function fetchRounds(
  electionId: number,
): Promise<ElectionRound[]> {
  const data = await apiRequest<any>(`${ELECTIONS_BASE}/${electionId}/rounds`);
  return mapRounds(data);
}

export async function fetchRoundDetail(
  roundId: number,
): Promise<ElectionRoundDetail> {
  const data = await apiRequest<any>(`${ROUNDS_BASE}/${roundId}`);
  return mapRoundDetail(data);
}

export async function fetchRoundResults(roundId: number): Promise<{
  results: any[];
  summary: any;
  progress: any[];
  round: any;
}> {
  return apiRequest<any>(`${ROUNDS_BASE}/${roundId}/results`);
}

export async function fetchCandidates(roundId: number): Promise<{
  candidates: any[];
  availableCandidates?: any[];
}> {
  return apiRequest<any>(`${ROUNDS_BASE}/${roundId}/candidates`);
}

export async function configureRound(
  roundId: number,
  input: ConfigureRoundInput,
): Promise<any> {
  return apiRequest<any>(`${ROUNDS_BASE}/${roundId}/configure`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function startRound(
  roundId: number,
  input: StartRoundInput,
): Promise<any> {
  return apiRequest<any>(`${ROUNDS_BASE}/${roundId}/start`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function stopRound(
  roundId: number,
  input: StopRoundInput = {},
): Promise<any> {
  return apiRequest<any>(`${ROUNDS_BASE}/${roundId}/stop`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function manualChecking(
  roundId: number,
  input: ManualCheckingInput = {},
): Promise<any> {
  return apiRequest<any>(`${ROUNDS_BASE}/${roundId}/manual-checking`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function reopenRound(
  roundId: number,
  input: ReopenRoundInput,
): Promise<any> {
  return apiRequest<any>(`${ROUNDS_BASE}/${roundId}/reopen`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function prepareNextElection(
  roundId: number,
  input: PrepareNextRule,
): Promise<PrepareNextPreview> {
  const data = await apiRequest<any>(`${ROUNDS_BASE}/${roundId}/prepare-next`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return mapPrepareNextPreview(data);
}

export async function fetchScrutineers(
  electionId: number,
): Promise<Scrutineer[]> {
  const data = await apiRequest<any>(
    `${ELECTIONS_BASE}/${electionId}/scrutineers`,
  );
  return mapScrutineers(data);
}

export async function assignScrutineers(
  electionId: number,
  userIds: string[],
): Promise<any> {
  return apiRequest<any>(`${ELECTIONS_BASE}/${electionId}/scrutineers`, {
    method: "POST",
    body: JSON.stringify({ userIds }),
  });
}

export async function fetchTickets(
  roundId: number,
  signal?: AbortSignal,
): Promise<{
  items: any[];
  polling: boolean;
}> {
  return apiRequest<any>(`${ROUNDS_BASE}/${roundId}/tickets`, { signal });
}

export async function fetchOnlineTickets(
  roundId: number,
  signal?: AbortSignal,
): Promise<any[]> {
  return apiRequest<any>(`${ROUNDS_BASE}/${roundId}/tickets/online`, {
    signal,
  });
}

export async function voidTicket(
  ticketId: number,
  input: VoidTicketInput,
): Promise<any> {
  return apiRequest<any>(`${TICKETS_BASE}/${ticketId}/void`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function voidOnlineTicket(
  ticketId: string,
  input: VoidTicketInput,
): Promise<any> {
  return apiRequest<any>(`${TICKETS_BASE}/online/${ticketId}/void`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function castVote(
  roundId: number,
  input: CastVoteInput,
): Promise<any> {
  return apiRequest<any>(`${ROUNDS_BASE}/${roundId}/votes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function downloadResults(
  roundId: number,
  format: "pdf" | "xlsx" = "xlsx",
): Promise<Blob> {
  const response = await authenticatedFetch(
    `${ROUNDS_BASE}/${roundId}/results/export?format=${format}`,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? "Không thể xuất tệp.");
  }
  return response.blob();
}

export async function fetchElectionAudit(
  electionId: number,
): Promise<ElectionAuditLog[]> {
  const data = await apiRequest<any>(`${ELECTIONS_BASE}/${electionId}/audit`);
  return mapAuditLogs(data);
}

export async function previewElectionBackup(
  electionId: number,
  backup: any,
): Promise<any> {
  return apiRequest<any>(`${ELECTIONS_BASE}/${electionId}/backup`, {
    method: "POST",
    body: JSON.stringify({ backup, dryRun: true }),
  });
}

export async function restoreElectionBackup(
  electionId: number,
  backup: any,
  expectedHash: string,
): Promise<any> {
  return apiRequest<any>(`${ELECTIONS_BASE}/${electionId}/backup`, {
    method: "POST",
    body: JSON.stringify({ backup, dryRun: false, expectedHash }),
  });
}

export async function exportElectionBackup(electionId: number): Promise<any> {
  return apiRequest<any>(`${ELECTIONS_BASE}/${electionId}/backup/export`);
}

export async function importElectionCandidates(
  electionId: number,
  file: File,
): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<any>(`${ELECTIONS_BASE}/${electionId}/candidates/import`, {
    method: "POST",
    body: formData,
  });
}

export async function fetchElectionActivity(electionId: number): Promise<any> {
  return apiRequest<any>(`${ELECTIONS_BASE}/${electionId}/activity`);
}

/**
 * Mappers - Convert DTOs to domain types
 */

function mapElectionsList(data: any): Election[] {
  if (!data?.elections) return [];
  return data.elections.map(mapElection);
}

function mapElection(data: any): Election {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    status: data.status,
    created_by: data.created_by,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function mapElectionDetail(data: any): ElectionRoundDetail {
  return {
    round: mapRound(data.round ?? data.rounds?.at(-1) ?? {}),
    rounds: (data.rounds ?? []).map(mapRound),
    election: mapElection(data.election),
    candidates: (data.candidates ?? []).map(mapCandidate),
    scrutineers: (data.scrutineers ?? []).map(mapScrutineer),
    results: data.results?.map(mapResult),
    summary: data.summary ? mapSummary(data.summary) : undefined,
    progress: data.progress?.map(mapProgress),
  };
}

function mapRound(
  data: any,
): ElectionRound & { assignment?: AssignedElectionRound["assignment"] } {
  return {
    id: data.id,
    election_id: data.election_id,
    round_no: data.round_no,
    status: data.status,
    phase: data.phase,
    opened_at: data.opened_at,
    closed_at: data.closed_at,
    election_name: data.election_name,
    election_code: data.election_code,
    assignment: data.assignment
      ? {
          round_id: data.assignment.round_id,
          user_id: data.assignment.user_id,
          team_id: data.assignment.team_id,
          team_name: data.assignment.team_name,
          code: data.assignment.code,
        }
      : undefined,
  };
}

function mapRoundDetail(data: any): ElectionRoundDetail {
  return mapElectionDetail({ round: data.round, ...data });
}

function mapRounds(data: any): ElectionRound[] {
  if (!data?.rounds) return [];
  return data.rounds.map(mapRound);
}

function mapCandidate(data: any): ElectionCandidate {
  return {
    id: data.id,
    candidate_no: data.candidate_no,
    full_name: data.full_name,
    name_search: data.name_search,
    member_id: data.member_id,
    extra: data.extra ?? {},
    included: data.included ?? true,
  };
}

function mapScrutineer(data: any): Scrutineer {
  return {
    id: data.id,
    full_name: data.full_name,
    team_id: data.team_id,
    team_name: data.team_name,
    team_sort_order: data.team_sort_order,
  };
}

function mapResult(data: any): any {
  return {
    id: data.id,
    candidate_no: data.candidate_no,
    full_name: data.full_name,
    votes: data.votes,
    percent: data.percent,
    rank: data.rank,
    tie: data.tie ?? false,
  };
}

function mapSummary(data: any): ElectionSummary {
  return {
    received: data.received ?? 0,
    valid: data.valid ?? 0,
    invalid: data.invalid ?? 0,
    blank: data.blank ?? 0,
    void: data.void ?? 0,
    over_limit: data.over_limit ?? 0,
    counted_ballots: data.counted_ballots ?? 0,
    paper: data.paper ?? 0,
    online: data.online ?? 0,
    average: data.average ?? 0,
  };
}

function mapProgress(data: any): ElectionProgress {
  return {
    user_id: data.user_id,
    full_name: data.full_name,
    tickets: data.tickets ?? 0,
    invalid: data.invalid ?? 0,
    pending_count: data.pending_count ?? 0,
    heartbeat_at: data.heartbeat_at,
    last_submission: data.last_submission,
  };
}

function mapPrepareNextPreview(data: any): PrepareNextPreview {
  return {
    results:
      data.results?.map((r: any) => ({
        id: r.id,
        rank: r.rank,
        candidate_no: r.candidate_no,
        full_name: r.full_name,
        votes: r.votes,
        tie: r.tie ?? false,
      })) ?? [],
    tie: data.tie ?? false,
    selected: data.selected ?? [],
  };
}

function mapScrutineers(data: any): Scrutineer[] {
  if (!data?.scrutineers) return [];
  return data.scrutineers.map((s: any) => ({
    id: s.id,
    full_name: s.full_name,
    team_id: s.team_id,
    team_name: s.team_name,
    team_sort_order: s.team_sort_order,
  }));
}

function mapAuditLogs(data: any): ElectionAuditLog[] {
  if (!data?.items) return [];
  return data.items.map((a: any) => ({
    id: a.id,
    created_at: a.created_at,
    full_name: a.full_name,
    action: a.action,
    payload: a.payload,
  }));
}
