import { createElectionPolling } from "../polling";
import { useEffect, useState } from "react";
import { apiRequest } from "@org/core";
import { localTickets } from "../local-election";

/** Count own ballots once by UUID, including those waiting to sync. */
export function useOwnTicketCount(
  userId?: string,
  roundId?: number,
  roundStatus?: string,
) {
  const [value, setValue] = useState({ userId, roundId, count: 0 });
  useEffect(() => {
    if (!userId || !roundId) return;
    let active = true;
    let fetching = false;
    let server = new Set<string>();
    let local = new Set<string>();
    const update = () => {
      if (active)
        setValue({
          userId,
          roundId,
          count: new Set([...server, ...local]).size,
        });
    };
    const readLocal = async () => {
      try {
        const tickets = await localTickets(userId, roundId);
        if (!active) return;
        local = new Set(
          tickets
            .filter((ticket) => ticket.sync_state !== "rejected")
            .map((ticket) => ticket.client_uuid),
        );
        update();
      } catch {
        /* Server totals remain available when browser storage is unavailable. */
      }
    };
    const readServer = async (signal: AbortSignal) => {
      if (!active || fetching || !navigator.onLine) return false;
      fetching = true;
      try {
        const response = await apiRequest<{
          items: Array<{ client_uuid: string; scrutineer_id: string }>;
          polling: boolean;
        }>(`/api/rounds/${roundId}/tickets`, { signal });
        if (!active || signal.aborted) return false;
        server = new Set(
          response.items
            .filter((ticket) => ticket.scrutineer_id === userId)
            .map((ticket) => ticket.client_uuid),
        );
        update();
        return response.polling === true;
      } finally {
        fetching = false;
      }
    };
    update();
    void readLocal();
    const polling = createElectionPolling({
      initiallyPolling: roundStatus === "open",
      load: readServer,
    });
    window.addEventListener("election-local-change", readLocal);
    return () => {
      active = false;
      polling.stop();
      window.removeEventListener("election-local-change", readLocal);
    };
  }, [userId, roundId, roundStatus]);
  return value.userId === userId && value.roundId === roundId ? value.count : 0;
}
