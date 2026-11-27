import { ElectionPageBottomNav } from "./components/ElectionPageBottomNav";
import { electionPhase, ELECTION_PHASE_LABELS } from "@org/core";
import { LoadingView } from "@org/ui";
import { createElectionPolling } from "./polling";
import { useElectionResultsPolling } from "./use-election-results-polling";
import { TicketCard } from "./tickets/ticket-card";
import { AdminTicketFilters } from "./tickets/admin-ticket-filters";
import { TicketEntry } from "./scrutineer/ticket-entry";
export { TicketEntry } from "./scrutineer/ticket-entry";
import { CandidateManager } from "./candidate-manager";
import { ScrutineerManager } from "./scrutineer-manager";
import { RoundManagement } from "./RoundManagement";
import { Results } from "./Results";
import { Tickets } from "./Tickets";
import { Audit } from "./Audit";
import { BackupImport } from "./BackupImport";
import { useCallback, useEffect, useState } from "react";
import {
  apiRequest,
  authenticatedFetch,
  electionAdmin,
  electionAccess,
  electionSearch,
  useAuth,
  type ElectionCandidate,
} from "@org/core";
import { Button, Dialog, Input, useToast } from "@org/ui";
import {
  downloadElectionFile,
  exportElectionBackup,
  localMeta,
  localTickets,
  logElectionAction,
  syncElectionTickets,
  type LocalTicket,
} from "./local-election";

const post = (path: string, data: unknown = {}) =>
  apiRequest<any>(path, { method: "POST", body: JSON.stringify(data) });

const box =
  "rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]";

const selectClass =
  "min-h-10 rounded-lg border border-[#e2e0d8] bg-[#f8f7f3] px-3 py-1.5 text-sm text-[#1c1b18] focus:border-[#215e3d] focus:outline-none";

const primaryBtn =
  "bg-[#215e3d] text-white hover:bg-[#19492f] border-[#215e3d]";

const outlineBtn =
  "border-[#e6e4dd] bg-white text-[#1c1b18] hover:bg-[#f2f0e8]";

const labelStatus = (s: string) =>
  ({
    valid: "Hợp lệ",
    invalid: "Phiếu bất hợp lệ",
    void: "Đã hủy",
    open: "Đang mở",
    draft: "Bản nháp",
    closed: "Đã đóng",
    pending: "Chờ đồng bộ",
    synced: "Đã đồng bộ",
    rejected: "⚠ Bị từ chối",
  })[s] ?? s;

const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Không thể xử lý yêu cầu.";

async function download(path: string, filename: string) {
  const response = await authenticatedFetch(path);
  if (!response.ok) {
    let message = "Không thể xuất tệp.";
    try {
      message = (await response.json()).message ?? message;
    } catch {}
    throw new Error(message);
  }
  downloadElectionFile(await response.blob(), filename);
}

export function ElectionPage() {
  const user = useAuth()?.user;
  const { toast } = useToast();
  const [elections, setElections] = useState<any[]>([]);
  const [selected, setSelected] = useState(0);
  const [detail, setDetail] = useState<any>();
  const [roundId, setRoundId] = useState(0);
  const [tab, setTab] = useState(
    user && electionAdmin(user) ? "manage" : "entry",
  );
  const [error, setError] = useState("");
  const admin = Boolean(user && electionAdmin(user));

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
    let data;
    try {
      data = await apiRequest<any>("/api/elections");
      await localMeta(`elections:${user.id}`, data);
    } catch (e) {
      data = await localMeta(`elections:${user.id}`);
      if (!data) throw e;
    }
    setElections(data.elections);
    const last = await localMeta(`election-selected:${user.id}`);
    setSelected(
      (old) =>
        old || (data.elections.some((e: any) => e.id === last) ? last : 0),
    );
  }, [user]);

  const refresh = useCallback(async () => {
    if (!selected || !user) return;
    let data;
    try {
      data = await apiRequest<any>(`/api/elections/${selected}`);
      await localMeta(`election:${user.id}:${selected}`, data);
    } catch (e) {
      data = await localMeta(`election:${user.id}:${selected}`);
      if (!data) throw e;
    }
    await localMeta(`election-selected:${user.id}`, selected);
    setDetail(data);
    setRoundId((old) =>
      data.rounds.some((r: any) => r.id === old)
        ? old
        : (data.rounds.at(-1)?.id ?? 0),
    );
  }, [selected, user]);

  useEffect(() => {
    void run(load);
  }, [load, run]);

  useEffect(() => {
    setDetail(undefined);
    void run(refresh);
  }, [refresh, run]);

  if (!user || !electionAccess(user))
    return <p role="alert">Bạn không có quyền truy cập bầu cử.</p>;

  const round = detail?.rounds.find((r: any) => r.id === roundId);

  return (
    <div className="min-h-screen bg-[#f8f7f3] text-[#1c1b18]">
      <main className="mx-auto max-w-6xl space-y-5 p-4 pb-28">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#6b6963]">
              Người nhập phiếu: {user.name}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[#1c1b18]">
              {detail?.election?.name ?? "Bầu cử"}
            </h1>
          </div>
          {admin && (
            <Button
              className="bg-[#215e3d] text-white hover:bg-[#19492f] border-[#215e3d]"
              onClick={() =>
                void run(async () => {
                  const name = window.prompt("Tên cuộc bầu cử");
                  if (!name?.trim()) return;
                  const description =
                    window.prompt("Mô tả (không bắt buộc)") ?? "";
                  const e = await post("/api/elections", { name, description });
                  await load();
                  setSelected(e.id);
                  toast({ title: "Đã tạo cuộc bầu cử" });
                })
              }
            >
              Tạo cuộc bầu cử
            </Button>
          )}
        </header>

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
              <span>Cuộc bầu cử</span>
              <select
                className="min-h-10 rounded-lg border border-[#e2e0d8] bg-[#f8f7f3] px-3 py-1.5 text-sm text-[#1c1b18] focus:border-[#215e3d] focus:outline-none"
                value={selected}
                onChange={(e) => {
                  setSelected(Number(e.target.value));
                  setRoundId(0);
                }}
              >
                <option value={0}>Chọn cuộc bầu cử</option>
                {elections.map((e) => (
                  <option key={e.id} value={e.id}>
                    #{e.id} · {e.name}
                  </option>
                ))}
              </select>
            </label>

            {detail && (
              <label className="flex items-center gap-2 text-sm font-medium">
                <span>Cuộc bầu cử</span>
                <select
                  className="min-h-10 rounded-lg border border-[#e2e0d8] bg-[#f8f7f3] px-3 py-1.5 text-sm text-[#1c1b18] focus:border-[#215e3d] focus:outline-none"
                  value={roundId}
                  onChange={(e) => setRoundId(Number(e.target.value))}
                >
                  <option value={0}>Chọn bầu cử</option>
                  {detail.rounds.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      Bầu cử #{r.election_id} ·{" "}
                      {ELECTION_PHASE_LABELS[electionPhase(r)]}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {detail?.election?.description && (
            <p className="text-sm text-[#5c5a54]">
              {detail.election.description}
            </p>
          )}
        </div>

        {detail && (
          <>
            {admin && (
              <>
                <CandidateManager
                  key={selected}
                  election={selected}
                  frozen={detail.rounds.some((r: any) => Boolean(r.opened_at))}
                  refresh={refresh}
                />
                <ScrutineerManager
                  key={`scrutineers:${selected}`}
                  election={selected}
                  refresh={refresh}
                />
              </>
            )}

            {round && (
              <>
                {admin && (
                  <nav className="flex flex-wrap gap-2" aria-label="Quản trị">
                    {["manage", "results", "audit"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`h-10 px-4 rounded-xl text-sm font-medium ${
                          tab === t
                            ? "bg-[#215e3d] text-white"
                            : "border-[#e6e4dd] bg-white text-[#1c1b18] hover:bg-[#f2f0e8]"
                        }`}
                      >
                        {
                          {
                            manage: "Quản lý bầu cử",
                            results: "Kết quả",
                            audit: "Nhật ký",
                          }[t]
                        }
                      </button>
                    ))}
                  </nav>
                )}

                {tab === "entry" && (
                  <TicketEntry
                    key={`${user.id}:${round.id}`}
                    round={round}
                    user={user}
                    run={run}
                  />
                )}

                {admin &&
                  (tab === "manage" ||
                    (tab === "entry" && round.status === "draft")) && (
                    <RoundManagement
                      round={round}
                      scrutineers={detail.scrutineers}
                      refresh={refresh}
                      run={run}
                    />
                  )}

                {admin && tab === "results" && (
                  <Results round={round} run={run} />
                )}

                {tab === "tickets" && (
                  <Tickets round={round} user={user} run={run} />
                )}

                {admin && tab === "audit" && (
                  <Audit election={selected} run={run} />
                )}
              </>
            )}

            {admin && <BackupImport election={selected} run={run} />}
          </>
        )}

        {!elections.length && (
          <p className="text-sm text-[#6b6963]">
            Chưa có cuộc bầu cử hoặc cuộc bầu cử được phân công đang mở.
          </p>
        )}

        <ElectionPageBottomNav
          roundData={round}
          tab={tab}
          setTab={setTab}
          showIcons
        />
      </main>
    </div>
  );
}

type Run = (fn: () => Promise<unknown>) => Promise<void>;
export { Tickets } from "./Tickets";
