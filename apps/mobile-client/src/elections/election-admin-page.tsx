import { ElectionListHeader } from "./components/ElectionListHeader";
import { ElectionListView } from "./components/ElectionListView";
import { ElectionDetailView } from "./components/ElectionDetailView";
import { CreateElectionDialog } from "./components/CreateElectionDialog";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiRequest,
  electionAdmin,
  electionAccess,
  useAuth,
  ApiError,
} from "@org/core";
import { LoadingView } from "@org/ui";
import { localMeta } from "./local-election";
import { useToast, Button } from "@org/ui";
import { navigateClient } from "../client-router";

const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Không thể xử lý yêu cầu.";

export function ElectionAdminPage({
  electionId,
  organizationId,
}: {
  electionId?: string;
  organizationId?: string;
}) {
  const user = useAuth()?.user;
  const { toast } = useToast();
  const [elections, setElections] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>();
  const [tab, setTab] = useState(0);
  const [error, setError] = useState("");
  const [tabLoaded, setTabLoaded] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<"church" | "department">(
    "church",
  );
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  // Countdown state for election start actions
  const [countdown, setCountdown] = useState<{
    open: boolean;
    action: "start-online" | "start-checking" | "manual-checking";
    seconds: number;
  }>({ open: false, action: "start-online", seconds: 3 });
  const [submitting, setSubmitting] = useState(false);

  const admin = Boolean(user && electionAdmin(user));
  // Ref to store execute functions from ElectionResults
  const executeRef = useRef<{
    executeStartRound: ((phase: "online" | "checking") => void) | null;
    executeManualChecking: (() => void) | null;
  }>({ executeStartRound: null, executeManualChecking: null });

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    try {
      setError("");
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  const load = useCallback(async () => {
    if (!user || !electionAccess(user)) return;
    if (electionId) {
      let data;
      try {
        data = await apiRequest<any>(`/api/elections/${electionId}`);
        await localMeta(`election:${user.id}:${electionId}`, data);
      } catch (e) {
        if (e instanceof ApiError && [401, 403, 404].includes(e.status))
          throw e;
        data = await localMeta(`election:${user.id}:${electionId}`);
        if (!data) throw e;
      }
      setDetail(data);
    } else {
      let data;
      try {
        data = await apiRequest<any>("/api/elections");
        await localMeta(`elections:${user.id}`, data);
      } catch (e) {
        data = await localMeta(`elections:${user.id}`);
        if (!data) throw e;
      }
      setElections(data.elections);
    }
  }, [user, electionId]);

  const handleDeleted = useCallback(
    async (id: number) => {
      setElections((items) => items.filter((item) => item.id !== id));
      if (user)
        await localMeta(`election:${user.id}:${id}`, null).catch(() => {});
      if (electionId) {
        setDetail(undefined);
        navigateClient("/client/admin/elections");
      } else await load();
    },
    [user, electionId, load],
  );

  const handleCreateElection = useCallback(async () => {
    if (!createName.trim() || createBusy) return;
    setCreateBusy(true);
    setCreateError("");
    try {
      const e = await apiRequest<any>("/api/elections", {
        method: "POST",
        body: JSON.stringify({
          name: createName.trim(),
          type: createType,
        }),
      });
      await load();
      setCreateName("");
      setCreateDialogOpen(false);
      toast({ title: "Đã tạo cuộc bầu cử" });
      navigateClient(`/client/admin/elections/${e.id}`);
    } catch (e) {
      setCreateError(
        e instanceof Error ? e.message : "Không thể tạo cuộc bầu cử.",
      );
    } finally {
      setCreateBusy(false);
    }
  }, [createName, createType, createBusy, load, toast]);

  useEffect(() => {
    let active = true;
    void run(load).finally(() => {
      if (active) setInitialLoading(false);
    });
    return () => {
      active = false;
    };
  }, [load, run]);

  useEffect(() => {
    if (!user || !electionId) return;
    let active = true;
    const loadTab = async () => {
      const saved = await localMeta(`election-tab:${user.id}:${electionId}`);
      if (active && typeof saved === "number") setTab(saved);
      setTabLoaded(true);
    };
    void loadTab();
    return () => {
      active = false;
    };
  }, [user, electionId]);

  useEffect(() => {
    if (!user || !electionId || !tabLoaded) return;
    void localMeta(`election-tab:${user.id}:${electionId}`, tab);
  }, [tab, user, electionId, tabLoaded]);

  // Countdown logic (must be before early returns)
  useEffect(() => {
    if (!countdown.open || countdown.seconds <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds <= 1) {
          clearInterval(timer);
          if (prev.action === "start-online")
            executeRef.current.executeStartRound?.("online");
          else if (prev.action === "start-checking")
            executeRef.current.executeStartRound?.("checking");
          else if (prev.action === "manual-checking")
            executeRef.current.executeManualChecking?.();
          return { ...prev, open: false, seconds: 3 };
        }
        return { ...prev, seconds: prev.seconds - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown.open, countdown.seconds, countdown.action]);

  const cancelCountdown = () => {
    setCountdown({ ...countdown, open: false, seconds: 3 });
  };

  // Setter for ElectionResults to register execute functions
  const setExecuteFunctions = useCallback(
    (fns: {
      executeStartRound: (phase: "online" | "checking") => void;
      executeManualChecking: () => void;
    }) => {
      executeRef.current = fns;
    },
    [],
  );

  const handleStartRound = (nextPhase: "online" | "checking") => {
    setCountdown({
      open: true,
      action: nextPhase === "online" ? "start-online" : "start-checking",
      seconds: 3,
    });
  };

  const handleManualChecking = () => {
    setCountdown({
      open: true,
      action: "manual-checking",
      seconds: 3,
    });
  };

  if (!user || !electionAccess(user))
    return <p role="alert">Bạn không có quyền truy cập bầu cử.</p>;

  if (!electionId && initialLoading)
    return <LoadingView message="Đang tải danh sách bầu cử…" />;

  // Ensure elections is always an array
  const electionsArray = Array.isArray(elections) ? elections : [];

  // Derived lists for list view
  const upcoming = electionsArray.filter(
    (e) => e && e.status !== "archived" && !e.ended_at,
  );
  const past = electionsArray.filter(
    (e) => e && (e.status === "archived" || e.ended_at),
  );

  // Loading/error states for detail view (only when electionId is provided)
  if (
    electionId &&
    (!detail ||
      !detail.election ||
      String(detail.election.id) !== String(electionId))
  )
    return error ? (
      <div className="space-y-4">
        <p role="alert">{error}</p>
        <Button
          variant="outline"
          onClick={() => navigateClient("/client/admin/elections")}
        >
          Về danh sách bầu cử
        </Button>
      </div>
    ) : (
      <LoadingView message="Đang tải cuộc bầu cử…" />
    );

  return (
    <>
      <CreateElectionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        createName={createName}
        setCreateName={setCreateName}
        createType={createType}
        setCreateType={setCreateType}
        createBusy={createBusy}
        createError={createError}
        onCreate={handleCreateElection}
        onCancel={() => setCreateDialogOpen(false)}
      />
      {electionId ? (
        <ElectionDetailView
          electionId={electionId}
          organizationId={organizationId}
          detail={detail}
          tab={tab}
          setTab={setTab}
          admin={admin}
          user={user}
          load={load}
          refresh={load}
          run={run}
          countdown={countdown}
          setCountdown={setCountdown}
          cancelCountdown={cancelCountdown}
          handleStartRound={handleStartRound}
          handleManualChecking={handleManualChecking}
          setExecuteFunctions={setExecuteFunctions}
        />
      ) : (
        <div className="min-h-screen bg-[#f8f7f3] text-[#1c1b18]">
          <ElectionListHeader
            admin={admin}
            onCreateClick={() => setCreateDialogOpen(true)}
          />
          <ElectionListView
            elections={electionsArray}
            admin={admin}
            onChanged={load}
            onDeleted={handleDeleted}
          />
        </div>
      )}
    </>
  );
}

export { ElectionResults } from "./election-results";
