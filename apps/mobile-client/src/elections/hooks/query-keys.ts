import type { ElectionPhase } from "../domain/types";

/**
 * TanStack Query key factory for elections
 * Ensures consistent cache keys and invalidation patterns
 */

export const electionKeys = {
  all: ["elections"] as const,
  lists: () => [...electionKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...electionKeys.lists(), filters] as const,
  details: () => [...electionKeys.all, "detail"] as const,
  detail: (id: number) => [...electionKeys.details(), id] as const,
  rounds: (electionId: number) =>
    [...electionKeys.detail(electionId), "rounds"] as const,
  round: (roundId: number) => [...electionKeys.all, "round", roundId] as const,
  roundDetail: (roundId: number) =>
    [...electionKeys.round(roundId), "detail"] as const,
  candidates: (roundId: number) =>
    [...electionKeys.round(roundId), "candidates"] as const,
  results: (roundId: number) =>
    [...electionKeys.round(roundId), "results"] as const,
  tickets: (roundId: number) =>
    [...electionKeys.round(roundId), "tickets"] as const,
  scrutineers: (electionId: number) =>
    [...electionKeys.detail(electionId), "scrutineers"] as const,
  audit: (electionId: number) =>
    [...electionKeys.detail(electionId), "audit"] as const,
  activity: (electionId: number) =>
    [...electionKeys.detail(electionId), "activity"] as const,
  public: (sessionId: string) => ["public-election", sessionId] as const,
  assigned: () => ["elections", "assigned"] as const,
} as const;

/**
 * Query key helpers for invalidation
 */
export function invalidateElectionList(queryClient: any): void {
  queryClient.invalidateQueries({ queryKey: electionKeys.lists() });
}

export function invalidateElectionDetail(
  queryClient: any,
  electionId: number,
): void {
  queryClient.invalidateQueries({ queryKey: electionKeys.detail(electionId) });
}

export function invalidateRoundDetail(queryClient: any, roundId: number): void {
  queryClient.invalidateQueries({ queryKey: electionKeys.round(roundId) });
}

export function invalidateRoundResults(
  queryClient: any,
  roundId: number,
): void {
  queryClient.invalidateQueries({ queryKey: electionKeys.results(roundId) });
}

export function invalidateAllElectionData(
  queryClient: any,
  electionId: number,
): void {
  queryClient.invalidateQueries({ queryKey: electionKeys.detail(electionId) });
  queryClient.invalidateQueries({ queryKey: electionKeys.lists() });
}

/**
 * Query options helpers
 */
export function getElectionListQueryOptions(): {
  queryKey: readonly (string | number)[];
  queryFn: () => Promise<any>;
} {
  return {
    queryKey: electionKeys.lists(),
    queryFn: async () => {
      const { fetchElections } = await import("../api/client");
      return fetchElections();
    },
  };
}

export function getElectionDetailQueryOptions(electionId: number): {
  queryKey: readonly (string | number)[];
  queryFn: () => Promise<any>;
  enabled: boolean;
} {
  return {
    queryKey: electionKeys.detail(electionId),
    queryFn: async () => {
      const { fetchElection } = await import("../api/client");
      return fetchElection(electionId);
    },
    enabled: electionId > 0,
  };
}

export function getRoundDetailQueryOptions(roundId: number): {
  queryKey: readonly (string | number)[];
  queryFn: () => Promise<any>;
  enabled: boolean;
} {
  return {
    queryKey: electionKeys.roundDetail(roundId),
    queryFn: async () => {
      const { fetchRoundDetail } = await import("../api/client");
      return fetchRoundDetail(roundId);
    },
    enabled: roundId > 0,
  };
}

export function getRoundResultsQueryOptions(roundId: number): {
  queryKey: readonly (string | number)[];
  queryFn: () => Promise<any>;
  enabled: boolean;
} {
  return {
    queryKey: electionKeys.results(roundId),
    queryFn: async () => {
      const { fetchRoundResults } = await import("../api/client");
      return fetchRoundResults(roundId);
    },
    enabled: roundId > 0,
  };
}

export function getCandidatesQueryOptions(roundId: number): {
  queryKey: readonly (string | number)[];
  queryFn: () => Promise<any>;
  enabled: boolean;
} {
  return {
    queryKey: electionKeys.candidates(roundId),
    queryFn: async () => {
      const { fetchCandidates } = await import("../api/client");
      return fetchCandidates(roundId);
    },
    enabled: roundId > 0,
  };
}

export function getScrutineersQueryOptions(electionId: number): {
  queryKey: readonly (string | number)[];
  queryFn: () => Promise<any>;
  enabled: boolean;
} {
  return {
    queryKey: electionKeys.scrutineers(electionId),
    queryFn: async () => {
      const { fetchScrutineers } = await import("../api/client");
      return fetchScrutineers(electionId);
    },
    enabled: electionId > 0,
  };
}
