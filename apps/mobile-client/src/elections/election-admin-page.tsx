import { ElectionAudit } from "./election-audit";
import { ElectionStatCard } from "./election-stat-card";
import type { ReactNode } from "react";
import { Tickets } from "./election-page";
import { PublicSessionSettings } from "./public/public-session-settings";
import { ElectionResultsHeader } from "./election-results-header";
import { CandidateManager } from "./candidate-manager";
import { CountedBallotsCard } from "./counted-ballots-card";
import { ScrutineerManager } from "./scrutineer-manager";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiRequest,
  authenticatedFetch,
  electionAdmin,
  electionAccess,
  useAuth,
} from "@org/core";
import { Button, Dialog, Input, useToast, cn } from "@org/ui";
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
import { downloadElectionFile, localMeta } from "./local-election";

const post = (path: string, data: unknown = {}) =>
  apiRequest<any>(path, { method: "POST", body: JSON.stringify(data) });

const cardClass =
  "rounded-xl border-2 border-[#cfd2c9] bg-white p-4 shadow-none";

const labelStatus = (s: string) =>
  ({
    valid: "Hợp lệ",
    invalid: "Phiếu bất hợp lệ",
    void: "Đã hủy",
    open: "Đang diễn ra",
    draft: "Chưa bắt đầu",
    closed: "Đã kết thúc",
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
    if (electionId) {
      let data;
      try {
        data = await apiRequest<any>(`/api/elections/${electionId}`);
        await localMeta(`election:${user.id}:${electionId}`, data);
      } catch (e) {
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

  useEffect(() => {
    void run(load);
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

  if (!user || !electionAccess(user))
    return <p role="alert">Bạn không có quyền truy cập bầu cử.</p>;

  if (!electionId) {
    const upcoming = elections.filter((e) => e.status !== "archived");
    const past = elections.filter((e) => e.status === "archived");
    return (
      <div className="min-h-screen bg-[#f8f7f3] text-[#1c1b18]">
        <main className="mx-auto max-w-6xl space-y-6 p-4 pb-24">
          <header className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Bầu cử</h1>
          </header>
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Sắp diễn ra</h2>
              <div className="space-y-2">
                {upcoming.map((e) => (
                  <a
                    key={e.id}
                    href={`/client/admin/elections/${e.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#e6e4dd] bg-white p-4 transition-colors hover:bg-[#f2f0e8]"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{e.name}</h3>
                      <p className="text-sm text-[#6b6963]">Bầu cử #{e.id}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#215e3d]">
                      Vào phòng
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Đã kết thúc</h2>
              <div className="space-y-2">
                {past.map((e) => (
                  <a
                    key={e.id}
                    href={`/client/admin/elections/${e.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#e6e4dd] bg-white p-4 opacity-90 transition-colors hover:bg-[#f2f0e8]"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{e.name}</h3>
                      <p className="text-sm text-[#6b6963]">Bầu cử #{e.id}</p>
                    </div>
                    <span className="text-sm text-[#6b6963]">Đã kết thúc</span>
                  </a>
                ))}
              </div>
            </section>
          )}
          {elections.length === 0 && (
            <p className="text-sm text-[#6b6963]">Chưa có cuộc bầu cử nào.</p>
          )}
        </main>
      </div>
    );
  }

  if (!detail) return <p role="status">Đang tải…</p>;

  const electionName = detail.election.name;
  const rounds = detail.rounds ?? [];
  const round = rounds.at(-1);

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
          </header>
        )}

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        {tab !== 3 && tab !== 4 && detail.election.description && (
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
          {tab === 1 && (
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

        <nav className="fixed bottom-0 left-0 right-0 z-50 flex w-full items-center justify-center border-t border-[#cfd2c9] bg-white px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2">
          <div className="flex w-full max-w-6xl justify-between p-1">
            {[
              { id: 0, label: "Danh sách ứng viên", icon: List },
              { id: 1, label: "Nhân sự kiểm phiếu", icon: Users },
              { id: 2, label: "Log sự kiện", icon: ClipboardList },
              { id: 3, label: "Kết quả", icon: BarChart3, disabled: !round },
              ...(admin
                ? [
                    {
                      id: 4,
                      label: "Settings",
                      icon: Settings2,
                      disabled: false,
                    },
                  ]
                : []),
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => !t.disabled && setTab(t.id)}
                disabled={t.disabled}
                aria-current={tab === t.id ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10px] sm:px-3 sm:text-xs font-medium transition-colors focus-visible:outline-none",
                  t.disabled
                    ? "pointer-events-none opacity-40"
                    : tab === t.id
                      ? "font-semibold text-[#1c1b18]"
                      : "text-[#8a8881] hover:text-[#1c1b18]",
                )}
              >
                <t.icon
                  size={20}
                  strokeWidth={tab === t.id ? 2.25 : 1.5}
                  className={cn(
                    tab === t.id ? "text-[#1c1b18]" : "text-[#8a8881]",
                  )}
                />
                <span className="text-center leading-tight sm:whitespace-nowrap">
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </nav>
      </main>
    </div>
  );
}

type Run = (fn: () => Promise<unknown>) => Promise<void>;

export function ElectionResults({
  round,
  electionName,
  run,
  refresh,
  canManageRound,
  onSuccess,
  headerOnly = false,
  ballots,
}: {
  ballots?: ReactNode;
  headerOnly?: boolean;
  round: any;
  electionName: string;
  run: Run;
  refresh: () => Promise<unknown>;
  canManageRound: boolean;
  onSuccess: (message: string) => void;
}) {
  const [data, setData] = useState<any>();
  const [sort, setSort] = useState("votes");
  const [resultTab, setResultTab] = useState<"candidates" | "ballots">(
    "candidates",
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [closeError, setCloseError] = useState("");
  const fetchResults = useCallback(async () => {
    const r = await apiRequest<any>(`/api/rounds/${round.id}/results`);
    setData(r);
  }, [round.id]);

  useEffect(() => {
    let active = true;
    const load = () =>
      run(async () => {
        const r = await apiRequest<any>(`/api/rounds/${round.id}/results`);
        if (active) setData(r);
      });
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [round.id, run]);

  if (!data) return <p role="status">Đang tải kết quả…</p>;

  const status: string = data.round.status ?? "draft";
  const isNotStarted = status === "draft";
  const isOpen = status === "open";
  const candidateCount = data.results?.length ?? 0;
  const scrutineerCount = Number(
    data.readiness?.scrutineer_count ?? data.progress?.length ?? 0,
  );

  const handleStartRound = () =>
    void run(async () => {
      if (
        !window.confirm(
          `Bắt đầu bầu cử #${data.round.election_id}? ${candidateCount} ứng viên; ${scrutineerCount} nhân sự kiểm phiếu.`,
        )
      )
        return;
      setSubmitting(true);
      try {
        await post(`/api/rounds/${round.id}/start`);
        await Promise.all([fetchResults(), refresh()]);
        onSuccess("Đã bắt đầu cuộc bầu cử.");
      } finally {
        setSubmitting(false);
      }
    });

  const handleCloseRound = () =>
    void run(async () => {
      if (submitting) return;
      setCloseError("");
      setSubmitting(true);
      try {
        await post(`/api/rounds/${round.id}/stop`);
        setConfirmEnd(false);
        await Promise.all([fetchResults(), refresh()]);
        onSuccess("Đã kết thúc cuộc bầu cử.");
      } catch (error) {
        setCloseError(errorMessage(error));
        throw error;
      } finally {
        setSubmitting(false);
      }
    });

  const rows = [...(data.results ?? [])].sort((a: any, b: any) =>
    sort === "name"
      ? a.full_name.localeCompare(b.full_name, "vi")
      : b.votes - a.votes,
  );

  const metrics: Array<{
    label: string;
    icon: LucideIcon;
    value: number;
    valid?: boolean;
    hint?: string;
  }> = [
    {
      label: "Tổng số phiếu (đã nhập)",
      value: data.summary.received ?? 0,
      icon: Vote,
      hint: `${data.summary.paper ?? 0} phiếu giấy · ${data.summary.online ?? 0} trực tuyến`,
    },
    {
      label: "Phiếu đã hủy",
      value: data.summary.void ?? 0,
      icon: Ban,
      hint: "Không tính vào kết quả",
    },
    {
      label: "Hợp lệ",
      value: data.summary.valid ?? 0,
      icon: CircleCheck,
      valid: true,
    },
    {
      label: "Phiếu bất hợp lệ",
      value: Math.max(
        0,
        Number(data.summary.invalid ?? 0) - Number(data.summary.blank ?? 0),
      ),
      icon: CircleX,
      hint: "",
    },
    {
      label: "Phiếu trắng",
      value: data.summary.blank ?? 0,
      icon: FileText,
    },
  ];
  const panel = "rounded-2xl border-2 border-[#cfd2c9] bg-white shadow-none";
  const actionClass =
    "h-12 min-h-12 gap-2 rounded-xl px-5 text-base font-medium";
  const exportClass = cn(
    actionClass,
    "border-[#e4e5de] bg-white text-[#1e211c] hover:bg-[#f6f6f2]",
  );
  return (
    <section
      className="space-y-5"
      aria-label={`Kết quả bầu cử #${data.round.election_id}`}
    >
      <ElectionResultsHeader
        title={data.round.election_name ?? electionName}
        status={status}
      >
        <div
          className="flex flex-wrap items-center gap-3 lg:shrink-0 lg:justify-end"
          aria-label="Thao tác kết quả"
        >
          {canManageRound && isNotStarted && (
            <Button
              disabled={
                submitting || candidateCount === 0 || scrutineerCount === 0
              }
              onClick={handleStartRound}
              className={cn(
                actionClass,
                "min-w-36 bg-[#216e4a] text-white hover:bg-[#195639]",
              )}
            >
              <Play size={17} className="fill-current" aria-hidden="true" />
              {submitting ? "Đang mở…" : "Bắt đầu"}
            </Button>
          )}
          {canManageRound && isOpen && (
            <Button
              variant="destructive"
              disabled={submitting}
              onClick={() => {
                setCloseError("");
                setConfirmEnd(true);
              }}
              className={cn(actionClass, "min-w-36")}
            >
              <Square size={16} className="fill-current" aria-hidden="true" />
              {submitting ? "Đang đóng…" : "Kết thúc"}
            </Button>
          )}
          {status === "closed" && (
            <Button
              variant="outline"
              className={exportClass}
              onClick={() =>
                void run(() =>
                  download(
                    `/api/rounds/${round.id}/results/export?format=xlsx`,
                    "ket-qua.xlsx",
                  ),
                )
              }
            >
              <FileChartColumn
                size={19}
                className="text-[#216e4a]"
                aria-hidden="true"
              />
              Xuất Excel
            </Button>
          )}
        </div>
      </ElectionResultsHeader>

      {isNotStarted && (candidateCount === 0 || scrutineerCount === 0) && (
        <p role="status" className="text-sm text-[#60635b]">
          {candidateCount === 0
            ? "Lưu danh sách ứng viên để bắt đầu bầu cử."
            : "Thêm nhân sự kiểm phiếu để bắt đầu bầu cử."}
        </p>
      )}

      {!headerOnly && (
        <>
          <dl className="grid grid-cols-3 gap-3 sm:gap-4">
            <CountedBallotsCard
              key={data.round.election_id}
              electionId={data.round.election_id}
              value={Number(data.summary.counted_ballots ?? 0)}
              editable={canManageRound}
              onSaved={(count) =>
                setData((current: any) => ({
                  ...current,
                  summary: { ...current.summary, counted_ballots: count },
                }))
              }
            />
            {metrics.map((metric) => (
              <ElectionStatCard key={metric.label} {...metric} />
            ))}
          </dl>

          {ballots && (
            <div
              className="flex flex-wrap gap-2 border-b border-[#e4e5de] pb-3"
              aria-label="Nội dung kết quả"
            >
              {(
                [
                  ["candidates", "Kết quả ứng viên"],
                  ["ballots", "Phiếu bầu"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={resultTab === value}
                  onClick={() => setResultTab(value)}
                  className={`min-h-11 rounded-xl px-5 font-semibold ${resultTab === value ? "bg-[#215e3d] text-white" : "text-[#60635b] hover:bg-stone-100"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {resultTab === "ballots" && ballots ? (
            ballots
          ) : (
            <section
              className={cn(panel, "p-4 sm:p-6 lg:p-7")}
              aria-labelledby="election-candidate-results"
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="space-y-1.5">
                  <h2
                    id="election-candidate-results"
                    className="text-xl font-bold tracking-tight text-[#1e211c] sm:text-2xl"
                  >
                    Kết quả ứng viên
                  </h2>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0 mb-3">
                  <div className="relative sm:w-56">
                    <select
                      aria-label="Sắp xếp kết quả"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="h-11 min-h-11 w-full appearance-none rounded-xl border border-[#e4e5de] bg-white pl-4 pr-10 text-base text-[#1e211c] outline-none focus-visible:ring-2 focus-visible:ring-[#216e4a]"
                    >
                      <option value="votes">Sắp xếp: Số phiếu</option>
                      <option value="name">Sắp xếp: Họ tên</option>
                    </select>
                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#60635b]"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-165 table-fixed border-collapse text-left text-sm sm:text-base">
                  <colgroup>
                    <col className="w-[7%]" />
                    <col />
                    <col className="w-[9%]" />
                    <col className="w-[26%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-y border-[#e4e5de] text-xs font-semibold uppercase tracking-wide text-[#60635b] sm:text-sm">
                      <th scope="col" className="py-4 pr-3">
                        STT
                      </th>
                      <th scope="col" className="py-4 pr-4">
                        Họ tên
                      </th>
                      <th scope="col" className="py-4 pr-4 text-right">
                        Phiếu
                      </th>
                      <th scope="col" className="py-4 text-right">
                        % phiếu hợp lệ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((result: any, index: number) => {
                      const percent = Number(result.percent) || 0;
                      const progress = Math.max(0, Math.min(100, percent));
                      return (
                        <tr
                          key={result.id}
                          className="border-b border-[#edeee8] transition-colors last:border-b-0 hover:bg-[#f9faf7]"
                        >
                          <td className="py-4 pr-3 align-top tabular-nums text-[#60635b]">
                            {index + 1}
                          </td>
                          <td className="wrap-break-word py-4 pr-4 align-top font-medium text-[#1e211c]">
                            {result.full_name}
                          </td>
                          <td className="py-4 pr-4 text-right align-top font-semibold tabular-nums text-[#1e211c]">
                            {result.votes}
                          </td>
                          <td className="py-4 align-top">
                            <div className="flex min-h-6 items-center justify-end gap-3">
                              <div
                                role="progressbar"
                                aria-label={`Tỷ lệ phiếu hợp lệ của ${result.full_name}`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={progress}
                                className="h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-[#edeee8] sm:max-w-28"
                              >
                                <div
                                  className="h-full rounded-full bg-[#216e4a] transition-[width] duration-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="w-14 shrink-0 text-right tabular-nums text-[#60635b]">
                                {percent.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!rows.length && (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-10 text-center text-sm text-[#60635b]"
                        >
                          Chưa có ứng viên trong cuộc bầu cử này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
      <Dialog
        open={confirmEnd && isOpen}
        onOpenChange={(open) => {
          if (!submitting) setConfirmEnd(open);
        }}
        title="Xác nhận kết thúc cuộc bầu cử"
        description="Sau khi kết thúc, cuộc bầu cử này sẽ ngừng nhận phiếu và bạn có thể xuất kết quả Excel."
        closeLabel="Hủy"
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => setConfirmEnd(false)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={submitting}
              onClick={handleCloseRound}
            >
              {submitting ? "Đang kết thúc…" : "Xác nhận kết thúc"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="font-medium">
            {data.round.election_name ?? electionName} · #
            {data.round.election_id}
          </p>
          <dl className="grid grid-cols-2 gap-3 rounded-xl bg-muted p-4">
            <div>
              <dt className="text-sm text-muted-foreground">Phiếu đã nhận</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">
                {data.summary.received}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Chờ đồng bộ</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">
                {(data.progress ?? []).reduce(
                  (total: number, person: any) =>
                    total + Number(person.pending_count ?? 0),
                  0,
                )}
              </dd>
            </div>
          </dl>
          {(data.progress ?? []).some(
            (person: any) => person.pending_count > 0,
          ) && (
            <ul className="space-y-1 text-sm">
              {data.progress
                .filter((person: any) => person.pending_count > 0)
                .map((person: any) => (
                  <li key={person.user_id}>
                    {person.full_name}: {person.pending_count} phiếu chờ đồng bộ
                  </li>
                ))}
            </ul>
          )}
          <p className="text-sm text-muted-foreground">
            Số chờ đồng bộ phản ánh lần báo cáo gần nhất của từng thiết bị.
          </p>
          {closeError && (
            <p role="alert" className="text-sm text-destructive">
              {closeError}
            </p>
          )}
        </div>
      </Dialog>
    </section>
  );
}
