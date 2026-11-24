import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, type ElectionCandidate } from "@org/core";
import {
  downloadElectionFile,
  exportElectionBackup,
  localMeta,
  localTickets,
  logElectionAction,
  syncElectionTickets,
} from "../local-election";
import type { EntryProps } from "./entry-types";
const post = (path: string, data: unknown) =>
  apiRequest<any>(path, { method: "POST", body: JSON.stringify(data) });
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Không thể xử lý yêu cầu.";
export function useRoundSession({
  round: initial,
  user,
  run,
  standalone = false,
}: EntryProps) {
  const [round, setRound] = useState<any>(initial);
  const [candidates, setCandidates] = useState<ElectionCandidate[]>([]);
  const [hint, setHint] = useState("");
  const [pending, setPending] = useState(0);
  const [ready, setReady] = useState(false);
  const [next, setNext] = useState(1);
  const closedNotice = useRef(false);
  const audit = useCallback(
    (type: string, payload: unknown = {}) =>
      logElectionAction(user.id, initial.id, type, payload),
    [user.id, initial.id],
  );

  useEffect(() => {
    let active = true;
    void run(async () => {
      await navigator.storage?.persist?.().catch(() => false);
      let data: any;
      try {
        data = await apiRequest<any>(`/api/rounds/${initial.id}/candidates`);
        await localMeta(`round:${user.id}:${initial.id}`, data).catch(
          (error) => {
            if (active) setHint(errorMessage(error));
          },
        );
      } catch (e) {
        data = await localMeta(`round:${user.id}:${initial.id}`);
        if (!data) throw e;
      }
      if (!active) return;
      setRound(data.round);
      setCandidates(data.candidates);
      await audit("login");
      await audit("round_loaded");
      const existing = await apiRequest<any>(
        `/api/rounds/${initial.id}/tickets`,
      ).catch(() => null);
      const maximum = Math.max(
        0,
        ...(existing?.items ?? []).map((t: any) => t.seq_no),
      );
      await localMeta(
        `seq:${user.id}:${initial.id}`,
        Math.max(
          maximum,
          Number((await localMeta(`seq:${user.id}:${initial.id}`)) ?? 0),
        ),
      );
      if (active) {
        setNext(
          Math.max(
            maximum,
            Number((await localMeta(`seq:${user.id}:${initial.id}`)) ?? 0),
          ) + 1,
        );
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [initial.id, user.id, run, audit]);

  useEffect(() => {
    let active = true;
    let busy = false;
    const work = async () => {
      if (busy) return;
      busy = true;
      try {
        await syncElectionTickets(user.id);
        const tickets = await localTickets(user.id, initial.id);
        const count = tickets.filter((t) => t.sync_state === "pending").length;
        if (!active) return;
        setPending(count);
        setNext(
          Number((await localMeta(`seq:${user.id}:${initial.id}`)) ?? 0) + 1,
        );
        const heartbeat = await post(`/api/rounds/${initial.id}/heartbeat`, {
          pending: count,
        }).catch(() => null);
        if (heartbeat?.status === "closed" && active) {
          setRound((old: any) => ({ ...old, status: "closed" }));
          if (!closedNotice.current) {
            closedNotice.current = true;
            if (
              !standalone &&
              window.confirm("Cuộc bầu cử đã kết thúc. Xuất bản sao lưu ngay?")
            )
              await backup();
          }
        }
      } catch (e) {
        if (active) setHint(errorMessage(e));
      } finally {
        busy = false;
      }
    };
    void work();
    const timer = setInterval(() => void work(), 5000);
    window.addEventListener("online", work);
    window.addEventListener("election-local-change", work);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("online", work);
      window.removeEventListener("election-local-change", work);
    };
  }, [user.id, initial.id]);

  async function backup() {
    const data = await exportElectionBackup(user.id, round.id);
    downloadElectionFile(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      `backup_E${round.election_id}_T${round.assignment?.team_id ?? "unassigned"}_${new Date().toISOString().slice(0, 10)}.json`,
    );
  }

  return {
    round,
    candidates,
    hint,
    setHint,
    pending,
    setPending,
    ready,
    next,
    setNext,
    audit,
  };
}
