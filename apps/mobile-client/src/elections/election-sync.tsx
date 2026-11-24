import { useEffect, useState } from "react";
import { useAuth, electionAccess, isElectionScrutineer } from "@org/core";
import { localTickets, syncElectionTickets } from "./local-election";
// Synchronize pending local work on changes/reconnection; never poll historical rounds.
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
      } catch {
        /* The queue persists; entry shows sync status and rejection details. */
      } finally {
        busy = false;
      }
    };
    void sync();
    window.addEventListener("online", sync);
    window.addEventListener("election-local-change", sync);
    return () => {
      active = false;
      window.removeEventListener("online", sync);
      window.removeEventListener("election-local-change", sync);
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
