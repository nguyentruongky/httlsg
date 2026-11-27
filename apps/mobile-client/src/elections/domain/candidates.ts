import type { ElectionCandidate } from "./types";

/**
 * Candidate filtering, sorting, and search utilities
 */

export function filterCandidatesBySearch(
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
      `${c.candidate_no} ${c.full_name.toLowerCase()}${c.name_search ? ` ${c.name_search}` : ""}`.includes(
        t,
      ),
    ),
  );
}

export function sortCandidatesBy(
  candidates: ElectionCandidate[],
  sortBy: "votes" | "name" | "number",
  voteMap?: Map<number, number>,
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
      if (voteMap) {
        return sorted.sort(
          (a, b) => (voteMap.get(b.id) ?? 0) - (voteMap.get(a.id) ?? 0),
        );
      }
      return sorted;
  }
}

export function createCandidateVoteMap(
  results: { id: number; votes: number }[],
): Map<number, number> {
  return new Map(results.map((r) => [r.id, r.votes]));
}

export function enrichCandidatesWithVotes(
  candidates: ElectionCandidate[],
  results: { id: number; votes: number; percent: number; rank?: number }[],
): (ElectionCandidate & { votes: number; percent: number; rank?: number })[] {
  const voteMap = new Map(results.map((r) => [r.id, r]));
  return candidates.map((c) => ({
    ...c,
    ...(voteMap.get(c.id) ?? { votes: 0, percent: 0 }),
  }));
}

export function searchCandidates(
  candidates: ElectionCandidate[],
  query: string,
): ElectionCandidate[] {
  if (!query.trim()) return candidates;
  const normalized = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  const tokens = normalized.split(" ").filter(Boolean);
  return candidates.filter((c) =>
    tokens.every((t) =>
      `${c.candidate_no} ${c.full_name.toLowerCase()}${c.name_search ? ` ${c.name_search}` : ""}`.includes(t)
    )
  );
}

// Alias for backward compatibility
export const searchElectionCandidates = searchCandidates;

export function getCandidateById(
  candidates: ElectionCandidate[],
  id: number,
): ElectionCandidate | undefined {
  return candidates.find((c) => c.id === id);
}

export function getCandidatesByIds(
  candidates: ElectionCandidate[],
  ids: number[],
): ElectionCandidate[] {
  const idSet = new Set(ids);
  return candidates.filter((c) => idSet.has(c.id));
}

export function filterEnabledCandidates(
  candidates: ElectionCandidate[],
): ElectionCandidate[] {
  return candidates.filter((c) => c.included);
}

export function getNextCandidateNumber(
  candidates: ElectionCandidate[],
): number {
  if (candidates.length === 0) return 1;
  return Math.max(...candidates.map((c) => c.candidate_no)) + 1;
}

export function validateCandidateName(
  name: string,
  existingNames: string[],
  excludeId?: number,
  candidates?: ElectionCandidate[],
): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) return { valid: false, error: "Tên không được để trống" };
  if (trimmed.length > 200)
    return { valid: false, error: "Tên tối đa 200 ký tự" };
  const lower = trimmed.toLowerCase();
  const duplicate = existingNames.some((n) => n.toLowerCase() === lower);
  if (duplicate) return { valid: false, error: "Tên ứng viên đã tồn tại" };
  return { valid: true };
}
