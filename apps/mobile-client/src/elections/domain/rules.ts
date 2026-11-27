import type {
  ElectionCandidate,
  ElectionRound,
  ElectionRoundDetail,
  ElectionResult,
  ElectionSummary,
  ElectionProgress,
} from "./types";

/**
 * Pure domain logic for election rules.
 * No React, no framework dependencies.
 * Unit testable with Vitest.
 */

// Re-export from types
export { electionPhaseFromRound, canCheckElection } from "./types";

/**
 * Pure domain logic for election rules.
 * No React, no framework dependencies.
 * Unit testable with Vitest.
 */

export function calculateElectionPhase(round: ElectionRound): string {
  if (
    round.phase &&
    ["draft", "online", "checking", "closed"].includes(round.phase)
  ) {
    return round.phase;
  }
  if (round.status === "open") return "checking";
  if (round.status === "closed") return "closed";
  return "draft";
}

export function isRoundOpen(round: ElectionRound): boolean {
  return round.status === "open";
}

export function isRoundClosed(round: ElectionRound): boolean {
  return round.status === "closed";
}

export function isRoundDraft(round: ElectionRound): boolean {
  return round.status === "draft";
}

export function canRoundStart(round: ElectionRound, candidates?: ElectionCandidate[]): boolean {
  return round.status === "draft" && (candidates?.length ?? 0) > 0;
}

export function canRoundStop(round: ElectionRound): boolean {
  return round.status === "open";
}

export function canRoundReopen(round: ElectionRound): boolean {
  return round.status === "closed";
}

export function canRoundConfigure(round: ElectionRound): boolean {
  return round.status === "draft";
}

/**
 * Calculate vote tally for a candidate
 */
export function calculateVoteTally(
  votes: number,
  totalValidVotes: number,
): { votes: number; percent: number } {
  const percent = totalValidVotes > 0 ? (votes / totalValidVotes) * 100 : 0;
  return { votes, percent: Number(percent.toFixed(1)) };
}

/**
 * Calculate candidate rankings with tie handling
 */
export function calculateRankings(
  candidates: ElectionCandidate[],
  results: ElectionResult[],
): ElectionResult[] {
  // Sort by votes descending
  const sorted = [...results].sort((a, b) => b.votes - a.votes);

  // Assign ranks with tie handling
  let rank = 0;
  let previousVotes = -1;

  return sorted.map((result, index) => {
    if (result.votes !== previousVotes) {
      rank = index + 1;
    }
    previousVotes = result.votes;
    return { ...result, rank };
  });
}

/**
 * Check if candidate meets minimum vote threshold
 */
export function meetsMinimumThreshold(
  candidateVotes: number,
  totalValidVotes: number,
  minimumPercent: number,
): boolean {
  if (totalValidVotes === 0) return false;
  const percent = (candidateVotes / totalValidVotes) * 100;
  return percent >= minimumPercent;
}

/**
 * Select top X candidates by votes
 */
export function selectTopCandidates(
  candidates: ElectionCandidate[],
  results: ElectionResult[],
  count: number,
): ElectionResult[] {
  const ranked = calculateRankings(candidates, results);
  return ranked.slice(0, count);
}

/**
 * Select candidates meeting minimum threshold
 */
export function selectByMinimumThreshold(
  candidates: ElectionCandidate[],
  results: ElectionResult[],
  minimumPercent: number,
  totalValidVotes: number,
): ElectionResult[] {
  return results.filter((r) =>
    meetsMinimumThreshold(r.votes, totalValidVotes, minimumPercent),
  );
}

/**
 * Detect tie at threshold position
 */
export function detectTieAtThreshold(
  rankedResults: ElectionResult[],
  thresholdPosition: number,
): boolean {
  if (rankedResults.length <= thresholdPosition) return false;
  const thresholdVotes = rankedResults[thresholdPosition - 1]?.votes ?? 0;
  return rankedResults.some(
    (r, i) => i >= thresholdPosition && r.votes === thresholdVotes,
  );
}

/**
 * Validate ticket for over-limit
 */
export function validateTicketSelections(
  candidateIds: number[],
  maxSelections: number = 10,
): { valid: boolean; reason?: string } {
  if (candidateIds.length === 0) {
    return { valid: false, reason: "blank" };
  }
  if (candidateIds.length > maxSelections) {
    return { valid: false, reason: "over_limit" };
  }
  // Check for duplicates
  const unique = new Set(candidateIds);
  if (unique.size !== candidateIds.length) {
    return { valid: false, reason: "duplicate" };
  }
  return { valid: true };
}

/**
 * Calculate quorum
 */
export function calculateQuorum(
  totalMembers: number,
  votesReceived: number,
  quorumPercent: number,
): { quorum: number; met: boolean; percent: number } {
  const required = Math.ceil(totalMembers * (quorumPercent / 100));
  const percent = totalMembers > 0 ? (votesReceived / totalMembers) * 100 : 0;
  return {
    quorum: required,
    met: votesReceived >= required,
    percent: Number(percent.toFixed(1)),
  };
}

/**
 * Calculate average selections per valid ballot
 */
export function calculateAverageSelections(
  totalSelections: number,
  validVotes: number,
): number {
  if (validVotes === 0) return 0;
  return Number((totalSelections / validVotes).toFixed(2));
}

/**
 * Check if round is eligible for prepare-next
 */
export function canPrepareNext(round: ElectionRound): boolean {
  return round.status === "closed";
}

/**
 * Get election duration in minutes
 */
export function getElectionDurationMinutes(
  openedAt: string | null,
  closedAt: string | null,
): number {
  if (!openedAt || !closedAt) return 0;
  const diff = new Date(closedAt).getTime() - new Date(openedAt).getTime();
  return Math.max(0, Math.round(diff / 60000));
}

/**
 * Filter candidates by search query
 */
export function filterCandidates(
  candidates: ElectionCandidate[],
  query: string,
): ElectionCandidate[] {
  const normalized = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  if (!normalized) return candidates;

  const tokens = normalized.split(" ").filter(Boolean);
  return candidates.filter((c) =>
    tokens.every((t) =>
      `${c.candidate_no} ${c.full_name.toLowerCase()}`.includes(t),
    ),
  );
}

/**
 * Sort candidates
 */
export function sortCandidates(
  candidates: ElectionCandidate[],
  sortBy: "votes" | "name" | "number",
  results?: ElectionResult[],
): ElectionCandidate[] {
  const sorted = [...candidates];
  switch (sortBy) {
    case "name":
      return sorted.sort((a, b) =>
        a.full_name.localeCompare(b.full_name, "vi"),
      );
    case "number":
      return sorted.sort((a, b) => a.candidate_no - b.candidate_no);
    case "votes":
    default:
      if (results) {
        const voteMap = new Map(results.map((r) => [r.id, r.votes]));
        return sorted.sort(
          (a, b) => (voteMap.get(b.id) ?? 0) - (voteMap.get(a.id) ?? 0),
        );
      }
      return sorted;
  }
}

/**
 * Sort election results
 */
export function sortResults(
  results: ElectionResult[],
  sortBy: "votes" | "name" | "number",
): ElectionResult[] {
  const sorted = [...results];
  switch (sortBy) {
    case "name":
      return sorted.sort((a, b) =>
        a.full_name.localeCompare(b.full_name, "vi"),
      );
    case "number":
      return sorted.sort((a, b) => a.candidate_no - b.candidate_no);
    case "votes":
    default:
      return sorted.sort((a, b) => b.votes - a.votes);
  }
}

/**
 * Search results by query
 */
export function searchResults(
  results: ElectionResult[],
  query: string,
): ElectionResult[] {
  const normalized = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  if (!normalized) return results;

  const tokens = normalized.split(" ").filter(Boolean);
  return results.filter((r) =>
    tokens.every((t) =>
      `${r.candidate_no} ${r.full_name.toLowerCase()}`.includes(t),
    ),
  );
}

/**
 * Progress reporting helpers
 */
export function calculatePendingCount(progress: ElectionProgress[]): number {
  return progress.reduce((sum, p) => sum + p.pending_count, 0);
}

export function getLastHeartbeat(progress: ElectionProgress[]): string | null {
  const heartbeats = progress
    .filter((p) => p.heartbeat_at)
    .map((p) => new Date(p.heartbeat_at!));
  if (heartbeats.length === 0) return null;
  return new Date(
    Math.max(...heartbeats.map((d) => d.getTime())),
  ).toISOString();
}

/**
 * Calculate election statistics
 */
export function calculateElectionStats(
  summary: ElectionSummary,
  progress: ElectionProgress[],
): {
  totalReceived: number;
  totalValid: number;
  totalInvalid: number;
  totalBlank: number;
  totalVoid: number;
  averageSelections: number;
  pendingCount: number;
  participationRate: number;
} {
  return {
    totalReceived: summary.received,
    totalValid: summary.valid,
    totalInvalid: summary.invalid,
    totalBlank: summary.blank,
    totalVoid: summary.void,
    averageSelections: summary.average,
    pendingCount: calculatePendingCount(progress),
    participationRate:
      summary.received > 0
        ? Number(
            (((summary.valid + summary.invalid) / summary.received) * 100).toFixed(1),
          )
        : 0,
  };
}

/**
 * Validate round configuration
 */
export function validateRoundConfiguration(
  scrutineerIds: string[],
  candidateIds: number[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (scrutineerIds.length === 0) {
    errors.push("Phải có ít nhất 1 nhân sự kiểm phiếu");
  }
  if (candidateIds.length === 0) {
    errors.push("Phải có ít nhất 1 ứng viên");
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Prepare next election candidate selection
 */
export function prepareNextElection(
  currentResults: ElectionResult[],
  rule: "top" | "minimum" | "manual",
  value: number,
  manualSelection?: number[],
): {
  selected: number[];
  tie: boolean;
  results: {
    id: number;
    rank: number;
    candidate_no: number;
    full_name: string;
    votes: number;
    tie: boolean;
  }[];
} {
  const ranked = [...currentResults].sort((a, b) => b.votes - a.votes);

  // Assign ranks
  let rank = 0;
  let previousVotes = -1;
  const rankedWithRanks = ranked.map((result, index) => {
    if (result.votes !== previousVotes) {
      rank = index + 1;
    }
    previousVotes = result.votes;
    return { ...result, rank };
  });

  let selected: number[];
  let tie = false;

  switch (rule) {
    case "top":
      if (rankedWithRanks.length <= value) {
        selected = rankedWithRanks.map((r) => r.id);
      } else {
        const thresholdVotes = rankedWithRanks[value - 1]?.votes ?? 0;
        selected = rankedWithRanks
          .filter((r) => r.votes > thresholdVotes)
          .map((r) => r.id);
        tie = rankedWithRanks.some(
          (r, i) => i >= value && r.votes === thresholdVotes,
        );
      }
      break;
    case "minimum":
      selected = rankedWithRanks
        .filter((r) => r.percent >= value)
        .map((r) => r.id);
      break;
    case "manual":
      selected = manualSelection ?? [];
      break;
  }

  return {
    selected,
    tie,
    results: rankedWithRanks,
  };
}
