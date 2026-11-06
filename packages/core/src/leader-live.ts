"use client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthEventStream } from "./auth-event-stream";
import { useAuth } from "./auth-session";
export function useLeaderLiveSync(enabled: boolean) {
  const client = useQueryClient(),
    auth = useAuth(),
    [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;
    const source = new AuthEventStream("/api/leader/events");
    let active = true;
    const resync = () => {
      void client.invalidateQueries({ queryKey: ["leader-otps"] });
      void client.invalidateQueries({ queryKey: ["admin-otps"] });
      void client.invalidateQueries({
        predicate: (q) =>
          q.queryKey.includes("leader-directory") ||
          q.queryKey.includes("team-member"),
      });
    };
    source.onopen = () => {
      if (active) setConnected(true);
    };
    source.onerror = () => {
      if (active) setConnected(false);
    };
    source.addEventListener("resync", resync);
    source.addEventListener("team-change", (event) => {
      let data: any;
      try {
        data = JSON.parse((event as MessageEvent).data);
      } catch {
        return;
      }
      if (data.kind === "otps") {
        for (const prefix of ["leader-otps", "admin-otps"]) {
          void client.cancelQueries({ queryKey: [prefix] }).then(() => {
            if (!active) return;
            if (data.removed && data.id)
              client.setQueriesData<{ items: { id: string }[]; total: number }>(
                { queryKey: [prefix] },
                (old) => {
                  if (!old) return old;
                  const items = old.items.filter((item) => item.id !== data.id);
                  return {
                    ...old,
                    items,
                    total: Math.max(
                      0,
                      old.total - (old.items.length - items.length),
                    ),
                  };
                },
              );
            void client.invalidateQueries({ queryKey: [prefix] });
          });
        }
      } else resync();
    });
    source.addEventListener("access-revoked", (event) => {
      setConnected(false);
      client.removeQueries({ queryKey: ["leader-otps"] });
      client.removeQueries({ queryKey: ["admin-otps"] });
      client.removeQueries({
        predicate: (q) =>
          q.queryKey.includes("leader-directory") ||
          q.queryKey.includes("team-member"),
      });
      let status = 401;
      try {
        status = JSON.parse((event as MessageEvent).data).status;
      } catch {}
      void auth?.refresh().catch(() => {});
    });
    return () => {
      active = false;
      setConnected(false);
    };
  }, [enabled, client, auth?.refresh]);
  return connected;
}
