import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@org/core";
import {
  useElections,
  useElection,
  useCreateElection,
  useConfigureRound,
  useStartRound,
  useStopRound,
  useManualChecking,
  useReopenRound,
  usePrepareNextElection,
  useScrutineers,
  useAssignScrutineers,
  useRoundDetail,
  useRoundResults,
  useVoidTicket,
  useVoidOnlineTicket,
  useElectionAudit,
  useTickets,
} from "../use-elections";
import type {
  ElectionRoundDetail,
  ElectionCandidate,
  ElectionRound,
  ElectionPhase,
} from "../../domain/types";
import { electionPhaseFromRound, canCheckElection } from "../../domain/rules";
import { createElectionPolling } from "../../polling";
import { localMeta } from "../../local-election";
import { downloadElectionFile } from "../../local-election";
import { logElectionAction } from "../../local-election";
import { downloadElectionFile as download } from "../../local-election";
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Không thể xử lý yêu cầu.";

/**
 * Orchestration hooks - combine queries, mutations, and local state
 * These are the "smart" hooks that components use
 */

export function useElectionPage() {
  const user = useAuth()?.user;
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(0);
  const [detail, setDetail] = useState<any>();
  const [roundId, setRoundId] = useState(0);
  const [tab, setTab] = useState(
    user && canUserAdminElection(user) ? "manage" : "entry",
  );
  const [error, setError] = useState("");

  const { data: elections } = useElections();
  const { data: detailData, refetch: refetchDetail } = useElection(selected);
  const createElectionMutation = useCreateElection();

  const round = detailData?.rounds?.find((r: any) => r.id === roundId);

  const load = useCallback(async () => {
    if (!user || !canUserAccessElection(user)) return;
    await queryClient.invalidateQueries({ queryKey: ["elections", "list"] });
  }, [user, queryClient]);

  const refresh = useCallback(async () => {
    if (!selected || !user) return;
    await refetchDetail();
    if (detailData?.rounds) {
      const lastRound = detailData.rounds.at(-1);
      setRoundId((old) =>
        detailData.rounds.some((r: any) => r.id === old)
          ? old
          : (lastRound?.id ?? 0),
      );
    }
  }, [selected, user, refetchDetail, detailData]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selected) refresh();
  }, [selected, refresh]);

  const handleCreateElection = useCallback(async () => {
    const name = window.prompt("Tên cuộc bầu cử");
    if (!name?.trim()) return;
    const description = window.prompt("Mô tả (không bắt buộc)") ?? "";
    const e = await createElectionMutation.mutateAsync({ name, description });
    await load();
    setSelected(e.id);
  }, [createElectionMutation, load]);

  const handleRoundChange = useCallback((id: number) => {
    setRoundId(id);
  }, []);

  const handleTabChange = useCallback((newTab: string) => {
    setTab(newTab);
  }, []);

  return {
    user,
    elections: elections ?? [],
    selected,
    setSelected,
    detail: detailData,
    roundId,
    setRoundId,
    round,
    tab,
    setTab: handleTabChange,
    error,
    admin: user && canUserAdminElection(user),
    load,
    refresh,
    handleCreateElection,
    handleRoundChange,
  };
}

export function useRoundManagement(roundId: number) {
  const user = useAuth()?.user;
  const queryClient = useQueryClient();
  const [users, setUsers] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [progress, setProgress] = useState<any>();
  const [rule, setRule] = useState("top");
  const [value, setValue] = useState(10);
  const [preview, setPreview] = useState<any>();
  const [carry, setCarry] = useState<number[]>([]);

  const roundDetail = useRoundDetail(roundId);
  const roundResults = useRoundResults(roundId);
  const configureMutation = useConfigureRound();
  const startMutation = useStartRound();
  const stopMutation = useStopRound();
  const manualMutation = useManualChecking();
  const reopenMutation = useReopenRound();
  const prepareMutation = usePrepareNextElection();
  const scrutineersQuery = useScrutineers(roundId); // Need electionId

  const round = roundDetail.data?.round;

  useEffect(() => {
    if (!roundId) return;
    const loadData = async () => {
      const c = await queryClient.getQueryData<{
        availableCandidates?: ElectionRoundDetail["candidates"];
        candidates: ElectionRoundDetail["candidates"];
      }>(["rounds", roundId, "candidates"]);
      if (c) setCandidates(c.availableCandidates ?? c.candidates);
      const r = await queryClient.getQueryData<{
        progress?: { user_id: string }[];
      }>(["rounds", roundId, "results"]);
      if (r) {
        setProgress(r);
        setUsers(r.progress?.map((p: any) => p.user_id) ?? []);
      }
      setPreview(undefined);
    };
    loadData();
  }, [roundId, roundDetail.data?.status, queryClient]);

  const change = useCallback(
    async (action: string, phase?: "online" | "checking") => {
      const reason =
        action === "reopen" ? window.prompt("Lý do mở lại") : undefined;
      if (action === "reopen" && !reason?.trim()) return;

      const fresh = await fetch(
        `${import.meta.env.VITE_API_BASE}/rounds/${roundId}/results`,
      );
      if (!fresh.ok) return;
      const freshData = await fresh.json();
      setProgress(freshData);

      const description =
        action === "start"
          ? `Bắt đầu bầu cử #${roundId}: ${freshData.candidates?.length ?? 0} ứng viên`
          : action === "stop"
            ? `Kết thúc bầu cử #${roundId}: đã nhận ${freshData.summary?.received ?? 0} phiếu`
            : action === "manual-checking"
              ? "Đóng cổng trực tuyến và chuyển sang kiểm phiếu thủ công?"
              : "Xác nhận mở lại bầu cử để kiểm phiếu thủ công?";

      if (!window.confirm(description)) return;

      switch (action) {
        case "start":
          await startMutation.mutateAsync({ roundId, input: { phase } });
          break;
        case "stop":
          await stopMutation.mutateAsync({ roundId, input: { reason } });
          break;
        case "manual-checking":
          await manualMutation.mutateAsync({ roundId, input: {} });
          break;
        case "reopen":
          await reopenMutation.mutateAsync({ roundId, input: { reason } });
          break;
      }
      await queryClient.invalidateQueries({ queryKey: ["rounds", roundId] });
    },
    [
      roundId,
      startMutation,
      stopMutation,
      manualMutation,
      reopenMutation,
      fetch,
    ],
  );

  const handleConfigure = useCallback(async () => {
    await configureMutation.mutateAsync({
      roundId,
      input: { userIds: users, candidateIds: selected },
    });
    await queryClient.invalidateQueries({ queryKey: ["rounds", roundId] });
  }, [roundId, users, selected, configureMutation, queryClient]);

  const handlePrepareNext = useCallback(async () => {
    const p = await prepareMutation.mutateAsync({
      roundId,
      input: { rule, value, dryRun: true },
    });
    setPreview(p);
    setCarry(p.selected);
  }, [roundId, rule, value, prepareMutation]);

  const handleCreateNext = useCallback(async () => {
    if (!window.confirm("Tạo cuộc bầu cử tiếp theo với danh sách đã chọn?"))
      return;
    const nextElection = await prepareMutation.mutateAsync({
      roundId,
      input: { rule, value, candidateIds: carry, dryRun: false },
    });
    setPreview(undefined);
    window.location.assign(
      `/client/admin/elections/${nextElection.election_id}`,
    );
  }, [roundId, rule, value, carry, prepareMutation]);

  return {
    round,
    users,
    setUsers,
    candidates,
    selected,
    setSelected,
    progress,
    rule,
    setRule,
    value,
    setValue,
    preview,
    carry,
    setCarry,
    configureMutation,
    startMutation,
    stopMutation,
    manualMutation,
    reopenMutation,
    prepareMutation,
    change,
    handleConfigure,
    handlePrepareNext,
    handleCreateNext,
  };
}

export function useResultsView(roundId: number) {
  const roundResults = useRoundResults(roundId);
  const roundDetail = useRoundDetail(roundId);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("votes");
  const [top, setTop] = useState(10);

  const data = roundResults.data;
  const round = roundDetail.data?.round;

  const rows = data?.results
    ?.filter((r: any) =>
      (r.full_name + " " + r.candidate_no)
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a: any, b: any) =>
      sort === "name"
        ? a.full_name.localeCompare(b.full_name, "vi")
        : sort === "number"
          ? a.candidate_no - b.candidate_no
          : b.votes - a.votes,
    );

  const handleExport = async (format: "pdf" | "xlsx") => {
    // Would call download API
  };

  return {
    data,
    round,
    search,
    setSearch,
    sort,
    setSort,
    top,
    setTop,
    rows,
    handleExport,
  };
}

export function useTicketEntry(roundId: number, standalone = false) {
  const user = useAuth()?.user;
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState("");
  const [scrollResetKey, setScrollResetKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const ticketsQuery = useTickets(roundId);
  const roundDetail = useRoundDetail(roundId);
  const voidMutation = useVoidTicket();
  const voidOnlineMutation = useVoidOnlineTicket();

  const round = roundDetail.data?.round;
  const tickets = ticketsQuery.data?.items ?? [];

  useEffect(() => {
    setReady(!!round && canCheckElection(round));
  }, [round]);

  const candidates = roundDetail.data?.candidates ?? [];
  const voteMap = new Map(
    roundDetail.data?.results?.map((r: any) => [r.id, r.votes]) ?? [],
  );

  const found = candidates
    .filter((c: ElectionCandidate) => {
      const tokens = query
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ")
        .split(" ")
        .filter(Boolean);
      return tokens.every((t) =>
        `${c.candidate_no} ${c.full_name.toLowerCase()}`.includes(t),
      );
    })
    .slice(0, 5);

  const toggle = useCallback((id: number) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((v) => v !== id);
      if (current.length >= 10) return current;
      return [...current, id];
    });
  }, []);

  const save = useCallback(async () => {
    if (!selected.length || saving) return;
    setSaving(true);
    try {
      // Implementation depends on backend
    } finally {
      setSaving(false);
    }
  }, [selected, saving]);

  return {
    round,
    user,
    selected,
    toggle,
    query,
    setQuery,
    saving,
    ready,
    hint,
    scrollResetKey,
    setScrollResetKey,
    inputRef,
    found,
    candidates,
    voteMap,
    save,
    roundDetail,
    ticketsQuery,
  };
}

export function useScrutineerPage() {
  const user = useAuth()?.user;
  const queryClient = useQueryClient();
  const [roundId, setRoundId] = useState(0);
  const [electionId, setElectionId] = useState(0);
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [tab, setTab] = useState<"entry" | "tickets">("entry");
  const reload = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!user) return;
    let active = true;
    let busy = false;
    const load = async (signal: AbortSignal) => {
      if (!active || busy) return false;
      busy = true;
      try {
        let data: { rounds: any[] };
        let cached = false;
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE}/rounds/assigned`,
            {
              signal,
            },
          );
          if (!response.ok) throw new Error("Failed to fetch");
          data = await response.json();
          await localMeta(`election-assigned:${user.id}`, data).catch(() => {});
        } catch (e) {
          data = await localMeta(`election-assigned:${user.id}`);
          if (!data) throw e;
          cached = true;
        }
        if (!active || signal.aborted) return false;
        setRounds(data.rounds);
        setOffline(cached);
        setError("");
        const targetRound = data.rounds.find((r) =>
          electionId ? r.election_id === electionId : r.id === roundId,
        );
        if (targetRound) setRoundId(targetRound.id);
        else if (!roundId && data.rounds[0]) setRoundId(data.rounds[0].id);
        return !cached && targetRound?.status === "open";
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Không thể tải cuộc bầu cử.",
          );
        throw e;
      } finally {
        busy = false;
        if (active) setLoading(false);
      }
    };
    const polling = createElectionPolling({ load });
    reload.current = () => polling.refresh();
    return () => {
      active = false;
      polling.stop();
    };
  }, [user, roundId, electionId]);

  const round = rounds.find((r) => String(r.id) === String(roundId));
  const canCheck = round ? canCheckElection(round) : false;
  const entryLayout = Boolean(round && canCheck) && tab === "entry";

  const handleReload = useCallback(async () => {
    await reload.current();
  }, [reload]);

  const handleTabChange = useCallback((newTab: "entry" | "tickets") => {
    setTab(newTab);
  }, []);

  const handleRoundChange = useCallback(
    (id: number) => {
      const r = rounds.find((x) => x.id === id);
      if (r) setRoundId(r.id);
    },
    [rounds],
  );

  return {
    user,
    round,
    rounds,
    loading,
    error,
    offline,
    tab,
    setTab: handleTabChange,
    roundId,
    setRoundId: handleRoundChange,
    entryLayout,
    canCheck,
    reload: handleReload,
  };
}

function canUserAdminElection(user: any) {
  return (
    user &&
    [user.role, ...(user.roles ?? [])].some(
      (r) => r === "admin" || r === "election_admin",
    )
  );
}

function canUserAccessElection(user: any) {
  return (
    canUserAdminElection(user) ||
    user.hasElectionAssignments === true ||
    [user.role, ...(user.roles ?? [])].includes("election_scrutineer")
  );
}
