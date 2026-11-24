import { useEffect, useState } from "react";
import {
  useAuth,
  electionAccess,
  isElectionScrutineer,
  apiRequest,
} from "@org/core";
import { localTickets, syncElectionTickets } from "./local-election";
// Keep the write-ahead queue alive when moving between workspace tabs.
export function ElectionSync() {
  const user = useAuth()?.user;
  const [counts, setCounts] = useState({ pending: 0, rejected: 0 });
  const id = user && electionAccess(user) ? user.id : null;
  useEffect(() => {
    setCounts({ pending: 0, rejected: 0 });
    if (!id) return;
    let busy = false;
    let active = true;
    const sync = async () => {
      if (busy || !active) return;
      busy = true;
      try {
        await syncElectionTickets(id);
        const tickets = await localTickets(id);
        if (active)
          setCounts({
            pending: tickets.filter((t) => t.sync_state === "pending").length,
            rejected: tickets.filter((t) => t.sync_state === "rejected").length,
          });
        if (!navigator.onLine) return;
        for (const round of new Set(tickets.map((t) => t.round_id))) {
          if (!active) break;
          await apiRequest(`/api/rounds/${round}/heartbeat`, {
            method: "POST",
            body: JSON.stringify({
              pending: tickets.filter(
                (t) => t.round_id === round && t.sync_state === "pending",
              ).length,
            }),
          }).catch(() => {});
        }
      } catch {
        /* The queue persists; entry shows sync status and rejection details. */
      } finally {
        busy = false;
      }
    };
    void sync();
    const timer = setInterval(() => void sync(), 5000);
    window.addEventListener("online", sync);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("online", sync);
    };
  }, [id]);
  return id && (counts.pending || counts.rejected) ? (
    <a
      href={
        user && isElectionScrutineer(user)
          ? "/client/elections"
          : "/client/admin/elections"
      }
      role="status"
      className="fixed right-3 bottom-36 z-30 rounded-lg border bg-background px-3 py-2 text-sm shadow"
    >
      Bầu cử: {counts.pending} chờ đồng bộ
      {counts.rejected ? ` · ⚠ ${counts.rejected} bị từ chối` : ""}
    </a>
  ) : null;
}
