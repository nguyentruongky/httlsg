import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";

import { electionKeys } from "./query-keys";
import {
  fetchElections,
  fetchElection,
  fetchRoundDetail,
  fetchRoundResults,
  createElection,
  configureRound,
  startRound,
  stopRound,
  manualChecking,
  reopenRound,
  prepareNextElection,
  fetchScrutineers,
  assignScrutineers,
  fetchTickets,
  fetchOnlineTickets,
  voidTicket,
  voidOnlineTicket,
  fetchElectionAudit,
  previewElectionBackup,
  restoreElectionBackup,
} from "../api/client";
import type {
  Election,
  ElectionRoundDetail,
  ConfigureRoundInput,
  StartRoundInput,
  StopRoundInput,
  ManualCheckingInput,
  ReopenRoundInput,
  PrepareNextRule,
  PrepareNextPreview,
} from "../domain/types";

/**
 * TanStack Query hooks for elections
 * These handle server state - caching, invalidation, mutations
 */

export function useElections(
  options?: Omit<UseQueryOptions<Election[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: electionKeys.lists(),
    queryFn: fetchElections,
    ...options,
  });
}

export function useElection(
  electionId: number,
  options?: Omit<
    UseQueryOptions<ElectionRoundDetail>,
    "queryKey" | "queryFn" | "enabled"
  >,
) {
  return useQuery({
    queryKey: electionKeys.detail(electionId),
    queryFn: () => fetchElection(electionId),
    enabled: electionId > 0,
    ...options,
  });
}

export function useRoundDetail(
  roundId: number,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn" | "enabled">,
) {
  return useQuery({
    queryKey: electionKeys.roundDetail(roundId),
    queryFn: () => fetchRoundDetail(roundId),
    enabled: roundId > 0,
    ...options,
  });
}

export function useRoundResults(
  roundId: number,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn" | "enabled">,
) {
  return useQuery({
    queryKey: electionKeys.results(roundId),
    queryFn: () => fetchRoundResults(roundId),
    enabled: roundId > 0,
    ...options,
  });
}

export function useElectionResultsPolling(
  roundId: number,
  electionId: number,
  roundStatus: string,
  run: (fn: () => Promise<unknown>) => Promise<void>,
  setData: React.Dispatch<React.SetStateAction<any>>,
) {
  // This is a specialized hook that handles polling for results
  // It's kept for backward compatibility with existing code
  // Consider migrating to useRoundResults with refetchInterval
  return null;
}

export function useCreateElection(
  options?: UseMutationOptions<
    Election,
    Error,
    { name: string; description?: string }
  >,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, description }) => createElection(name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: electionKeys.lists() });
    },
    ...options,
  });
}

export function useConfigureRound(
  options?: UseMutationOptions<any, Error, { roundId: number; input: any }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roundId, input }) => configureRound(roundId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: electionKeys.round(variables.roundId),
      });
    },
    ...options,
  });
}

export function useStartRound(
  options?: UseMutationOptions<any, Error, { roundId: number; input: any }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roundId, input }) => startRound(roundId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: electionKeys.round(variables.roundId),
      });
      queryClient.invalidateQueries({
        queryKey: electionKeys.results(variables.roundId),
      });
    },
    ...options,
  });
}

export function useStopRound(
  options?: UseMutationOptions<any, Error, { roundId: number; input: any }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roundId, input }) => stopRound(roundId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: electionKeys.round(variables.roundId),
      });
      queryClient.invalidateQueries({
        queryKey: electionKeys.results(variables.roundId),
      });
    },
    ...options,
  });
}

export function useManualChecking(
  options?: UseMutationOptions<any, Error, { roundId: number; input: any }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roundId, input }) => manualChecking(roundId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: electionKeys.round(variables.roundId),
      });
      queryClient.invalidateQueries({
        queryKey: electionKeys.results(variables.roundId),
      });
    },
    ...options,
  });
}

export function useReopenRound(
  options?: UseMutationOptions<any, Error, { roundId: number; input: any }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roundId, input }) => reopenRound(roundId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: electionKeys.round(variables.roundId),
      });
      queryClient.invalidateQueries({
        queryKey: electionKeys.results(variables.roundId),
      });
    },
    ...options,
  });
}

export function usePrepareNextElection(
  options?: UseMutationOptions<any, Error, { roundId: number; input: any }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roundId, input }) => prepareNextElection(roundId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: electionKeys.lists() });
    },
    ...options,
  });
}

export function useScrutineers(
  electionId: number,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn" | "enabled">,
) {
  return useQuery({
    queryKey: electionKeys.scrutineers(electionId),
    queryFn: () => fetchScrutineers(electionId),
    enabled: electionId > 0,
  });
}

export function useAssignScrutineers(
  options?: UseMutationOptions<
    any,
    Error,
    { electionId: number; userIds: string[] }
  >,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ electionId, userIds }) =>
      assignScrutineers(electionId, userIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: electionKeys.scrutineers(variables.electionId),
      });
    },
    ...options,
  });
}

export function useTickets(
  roundId: number,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn" | "enabled">,
) {
  return useQuery({
    queryKey: electionKeys.tickets(roundId),
    queryFn: () => fetchTickets(roundId),
    enabled: roundId > 0,
  });
}

export function useOnlineTickets(
  roundId: number,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn" | "enabled">,
) {
  return useQuery({
    queryKey: [...electionKeys.tickets(roundId), "online"],
    queryFn: () => fetchOnlineTickets(roundId),
    enabled: roundId > 0,
  });
}

export function useVoidTicket(
  options?: UseMutationOptions<any, Error, { ticketId: number; input: any }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, input }) => voidTicket(ticketId, input),
    onSuccess: (_data, variables) => {
      // Invalidate tickets for the round - we'd need roundId from context
      queryClient.invalidateQueries({ queryKey: electionKeys.all });
    },
    ...options,
  });
}

export function useVoidOnlineTicket(
  options?: UseMutationOptions<any, Error, { ticketId: string; input: any }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, input }) => voidOnlineTicket(ticketId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: electionKeys.all });
    },
    ...options,
  });
}

export function useElectionAudit(
  electionId: number,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn" | "enabled">,
) {
  return useQuery({
    queryKey: electionKeys.audit(electionId),
    queryFn: () => fetchElectionAudit(electionId),
    enabled: electionId > 0,
  });
}
