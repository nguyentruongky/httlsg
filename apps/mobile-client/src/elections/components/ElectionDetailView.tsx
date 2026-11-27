import { navigateClient } from "../../client-router";
import { ElectionTabs } from "./ElectionTabs";
import { CandidateManager } from "../candidate-manager";
import { ScrutineerManager } from "../scrutineer-manager";
import { ElectionAudit } from "../election-audit";
import { ElectionResults } from "../election-results";
import { PublicSessionSettings } from "../public/public-session-settings";
import { TicketEntry } from "../scrutineer/ticket-entry";
import { useElectionResultsPolling } from "../use-election-results-polling";
import { ElectionStatCard } from "../election-stat-card";
import { CountedBallotsCard } from "../counted-ballots-card";
import { Tickets } from "../election-page";
import { ElectionActions } from "../election-actions";
import { ElectionResultsHeader } from "../election-results-header";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, authenticatedFetch } from "@org/core";
import { Button, Dialog, useToast, cn } from "@org/ui";
import {
  List,
  Settings2,
  Users,
  ClipboardList,
  BarChart3,
  Play,
  Square,
  FileChartColumn,
  ChevronDown,
  UsersRound,
  Vote,
  CircleCheck,
  CircleX,
  Ban,
  FileText,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { downloadElectionFile, localMeta } from "../local-election";
import {
  electionPhase,
  type ElectionPhase,
  ELECTION_PHASE_LABELS,
} from "@org/core";
import { LoadingView } from "@org/ui";

const post = (path: string, data: unknown = {}) =>
  apiRequest<any>(path, { method: "POST", body: JSON.stringify(data) });

type Run = (fn: () => Promise<unknown>) => Promise<void>;

interface ElectionDetailViewProps {
  electionId: string;
  organizationId?: string;
  detail: any;
  tab: number;
  setTab: (tab: number) => void;
  admin: boolean;
  user: any;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
  run: Run;
  countdown: {
    open: boolean;
    action: "start-online" | "start-checking" | "manual-checking";
    seconds: number;
  };
  setCountdown: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      action: "start-online" | "start-checking" | "manual-checking";
      seconds: number;
    }>
  >;
  cancelCountdown: () => void;
  handleStartRound: (nextPhase: "online" | "checking") => void;
  handleManualChecking: () => void;
  setExecuteFunctions: (fns: {
    executeStartRound: (phase: "online" | "checking") => void;
    executeManualChecking: () => void;
  }) => void;
}

export function ElectionDetailView({
  electionId,
  organizationId,
  detail,
  tab,
  setTab,
  admin,
  user,
  load,
  refresh,
  run,
  countdown,
  setCountdown,
  cancelCountdown,
  handleStartRound,
  handleManualChecking,
  setExecuteFunctions,
}: ElectionDetailViewProps) {
  const { toast } = useToast();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [closeError, setCloseError] = useState("");

  const handleDeleted = useCallback(
    async (id: number) => {
      // This would need access to setDetail and navigateClient which are in the parent
      // For now, just show a toast
      toast({ title: "Xóa cuộc bầu cử" });
    },
    [toast],
  );

  const electionName = detail?.election?.name ?? "";
  const electionType = detail?.election?.type ?? "church";
  const rounds = detail?.rounds ?? [];
  const round = rounds.at(-1);

  const managementActions =
    admin && detail?.election ? (
      <ElectionActions
        election={{
          ...detail.election,
          phase: electionPhase(round ?? { status: "draft" }),
        }}
        onChanged={load}
        onDeleted={handleDeleted}
        onImport={() => candidateManagerRef.current?.triggerImport()}
      />
    ) : null;

  const candidateManagerRef = useRef<{ triggerImport: () => void }>(null);
  const executeRef = useRef<{
    executeStartRound: ((phase: "online" | "checking") => void) | null;
    executeManualChecking: (() => void) | null;
  }>({ executeStartRound: null, executeManualChecking: null });

  return (
    <div className="min-h-screen bg-white text-[#1c1b18]">
      <main
        className={cn(
          "mx-auto space-y-5 pb-24",
          tab === 3 || tab === 4 ? "max-w-7xl" : "max-w-6xl",
        )}
      >
        {tab !== 3 && tab !== 4 && (
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#1c1b18]">
              {electionName}
            </h1>
            {managementActions}
          </header>
        )}

        {(tab === 3 || tab === 4) && managementActions && (
          <div className="flex justify-end">{managementActions}</div>
        )}
        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        {tab !== 3 && tab !== 4 && detail?.election?.description && (
          <p className="text-sm text-[#5c5a54]">
            {detail.election.description}
          </p>
        )}

        <section>
          {tab === 0 && (
            <CandidateManager
              key={electionId}
              election={Number(electionId)}
              organizationId={organizationId}
              frozen={rounds.some((r: any) => Boolean(r.opened_at))}
              refresh={load}
            />
          )}
          {tab === 1 && electionType === "department" && round && user && (
            <TicketEntry
              key={`ticket-entry:${electionId}`}
              round={round}
              user={user}
              run={run}
              electionType="department"
            />
          )}
          {tab === 1 && electionType !== "department" && (
            <ScrutineerManager
              key={`scrutineers:${electionId}`}
              election={Number(electionId)}
              refresh={load}
              electionName={electionName}
            />
          )}
          {tab === 2 && (
            <ElectionAudit election={Number(electionId)} run={run} />
          )}
          {tab === 3 && round && (
            <div className="space-y-5">
              <ElectionResults
                round={round}
                electionName={electionName}
                run={run}
                refresh={load}
                canManageRound={admin}
                onSuccess={(msg) => toast({ title: msg })}
                ballots={<Tickets round={round} user={user} run={run} />}
                electionType={electionType}
                countdown={countdown}
                setCountdown={setCountdown}
                cancelCountdown={cancelCountdown}
                handleStartRound={handleStartRound}
                handleManualChecking={handleManualChecking}
                setExecuteFunctions={setExecuteFunctions}
              />
            </div>
          )}
          {tab === 4 && admin && (
            <div className="space-y-5">
              {round ? (
                <ElectionResults
                  round={round}
                  electionName={electionName}
                  run={run}
                  refresh={load}
                  canManageRound={admin}
                  onSuccess={(msg) => toast({ title: msg })}
                  headerOnly
                  electionType={electionType}
                  countdown={countdown}
                  setCountdown={setCountdown}
                  cancelCountdown={cancelCountdown}
                  handleStartRound={handleStartRound}
                  handleManualChecking={handleManualChecking}
                  setExecuteFunctions={setExecuteFunctions}
                />
              ) : (
                <ElectionResultsHeader title={electionName} status="draft" />
              )}
              <PublicSessionSettings electionId={Number(electionId)} />
            </div>
          )}
          {tab === 3 && !round && (
            <p className="text-sm text-[#6b6963]">
              Chưa lưu danh sách ứng viên.
            </p>
          )}
        </section>

        <ElectionTabs tab={tab} setTab={setTab} round={round} admin={admin} />
      </main>
    </div>
  );
}
