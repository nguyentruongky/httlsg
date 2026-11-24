import { useEffect, useState } from "react";
import { apiRequest } from "@org/core";
import { localTickets } from "../local-election";

/** Count own ballots once by UUID, including those waiting to sync. */
export function useOwnTicketCount(userId?: string, roundId?: number) {
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
    const readServer = async () => {
      if (fetching || !navigator.onLine) return;
      fetching = true;
      try {
        const response = await apiRequest<{
          items: Array<{ client_uuid: string; scrutineer_id: string }>;
        }>(`/api/rounds/${roundId}/tickets`);
        if (!active) return;
        server = new Set(
          response.items
            .filter((ticket) => ticket.scrutineer_id === userId)
            .map((ticket) => ticket.client_uuid),
        );
        update();
      } catch {
        /* Keep the most recent count while offline. */
      } finally {
        fetching = false;
      }
    };
    update();
    void readLocal();
    void readServer();
    const timer = setInterval(() => void readServer(), 5000);
    window.addEventListener("election-local-change", readLocal);
    window.addEventListener("online", readServer);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("election-local-change", readLocal);
      window.removeEventListener("online", readServer);
    };
  }, [userId, roundId]);
  return value.userId === userId && value.roundId === roundId ? value.count : 0;
}
