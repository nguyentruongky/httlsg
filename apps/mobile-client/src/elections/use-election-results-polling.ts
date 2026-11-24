import { useEffect } from "react";
import { apiRequest } from "@org/core";
import { useClientRoute } from "../client-router";
import { createElectionPolling } from "./polling";

type Run = (operation: () => Promise<unknown>) => Promise<void>;

export function useElectionResultsPolling<
  T extends { round: { status: string } },
>(
  roundId: number | undefined,
  electionId: number | undefined,
  roundStatus: string | undefined,
  run: Run,
  onResults: (result: T) => void,
) {
  const route = useClientRoute();
  const detailId = /^\/client\/admin\/elections\/(\d+)$/.exec(route)?.[1];
  const enabled = Boolean(
    detailId && roundId && (!electionId || String(electionId) === detailId),
  );
  useEffect(() => {
    if (!enabled || !roundId) return;
    const polling = createElectionPolling({
      initiallyPolling: roundStatus === "open",
      load: async (signal) => {
        const result = await apiRequest<T>(`/api/rounds/${roundId}/results`, {
          signal,
        });
        if (signal.aborted) return false;
        onResults(result);
        return result.round.status === "open";
      },
      onError: (error) =>
        run(async () => {
          throw error;
        }),
    });
    return polling.stop;
  }, [enabled, roundId, electionId, roundStatus, detailId, run, onResults]);
}
