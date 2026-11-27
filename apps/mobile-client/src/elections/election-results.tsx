import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { apiRequest, authenticatedFetch, electionPhase } from "@org/core";
import { Button, Dialog, cn, LoadingView } from "@org/ui";
import { Play, ChevronDown, Square, FileChartColumn } from "lucide-react";
import { ElectionResultsHeader } from "./election-results-header";
import { ElectionResultsMetrics } from "./election-results-metrics";
import { ElectionResultsTabs } from "./election-results-tabs";
import { CountedBallotsCard } from "./counted-ballots-card";
import { useElectionResultsPolling } from "./use-election-results-polling";
import { downloadElectionFile } from "./local-election";
const post = (path: string, data: unknown = {}) =>
  apiRequest<any>(path, { method: "POST", body: JSON.stringify(data) });
const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Không thể xử lý yêu cầu.";
async function download(path: string, filename: string) {
  const response = await authenticatedFetch(path);
  if (!response.ok) throw new Error("Không thể xuất tệp.");
  downloadElectionFile(await response.blob(), filename);
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
  electionType = "church",
  // Countdown props from parent
  countdown,
  setCountdown,
  cancelCountdown,
  handleStartRound,
  handleManualChecking,
  setExecuteFunctions,
}: {
  ballots?: ReactNode;
  headerOnly?: boolean;
  electionType?: "church" | "department";
  round: any;
  electionName: string;
  run: Run;
  refresh: () => Promise<unknown>;
  canManageRound: boolean;
  onSuccess: (message: string) => void;
  // Countdown props
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
}) {
  const [data, setData] = useState<any>();
  const [sort, setSort] = useState("votes");
  const [resultTab, setResultTab] = useState<"candidates" | "ballots">(
    "candidates",
  );
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [closeError, setCloseError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fetchResults = useCallback(async () => {
    const r = await apiRequest<any>(`/api/rounds/${round.id}/results`);
    setData(r);
  }, [round.id]);

  useElectionResultsPolling(
    round.id,
    round.election_id,
    round.status,
    run,
    setData,
  );

  // Register execute functions with parent component
  useEffect(() => {
    setExecuteFunctions({
      executeStartRound: (phase: "online" | "checking") =>
        void run(async () => {
          setSubmitting(true);
          try {
            await post(`/api/rounds/${round.id}/start`, { phase });
            await Promise.all([fetchResults(), refresh()]);
            onSuccess("Đã bắt đầu cuộc bầu cử.");
          } finally {
            setSubmitting(false);
          }
        }),
      executeManualChecking: () =>
        void run(async () => {
          setSubmitting(true);
          try {
            await post(`/api/rounds/${round.id}/manual-checking`);
            await Promise.all([fetchResults(), refresh()]);
            onSuccess("Đã chuyển sang kiểm phiếu thủ công.");
          } finally {
            setSubmitting(false);
          }
        }),
    });
  }, [round.id, run, refresh, fetchResults, onSuccess, setExecuteFunctions]);

  if (!data) return <LoadingView message="Đang tải kết quả…" />;

  const status: string = data.round.status ?? "draft";
  const isNotStarted = status === "draft";
  const phase = electionPhase(data.round);
  const isOnline = phase === "online";
  const isChecking = phase === "checking";
  const candidateCount = data.results?.length ?? 0;
  const scrutineerCount = Number(
    data.readiness?.scrutineer_count ?? data.progress?.length ?? 0,
  );
  // For department type elections, admin acts as scrutineer - no scrutineer requirement
  const needsScrutineers = electionType !== "department";

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
      <ElectionResultsHeader title={electionName} status={status} phase={phase}>
        <div
          className="flex flex-wrap items-center gap-3 lg:shrink-0 lg:justify-end"
          aria-label="Thao tác kết quả"
        >
          {canManageRound && isNotStarted && (
            <Button
              disabled={
                submitting ||
                candidateCount === 0 ||
                (needsScrutineers && scrutineerCount === 0)
              }
              onClick={() => handleStartRound("online")}
              className={cn(
                actionClass,
                "min-w-36 bg-[#216e4a] text-white hover:bg-[#195639]",
              )}
            >
              <Play size={17} className="fill-current" aria-hidden="true" />
              {submitting ? "Đang mở…" : "Nhận phiếu trực tuyến"}
            </Button>
          )}
          {canManageRound && isNotStarted && (
            <Button
              variant="outline"
              disabled={
                submitting ||
                candidateCount === 0 ||
                (needsScrutineers && scrutineerCount === 0)
              }
              onClick={() => handleStartRound("checking")}
              className={actionClass}
            >
              Kiểm phiếu thủ công
            </Button>
          )}
          {canManageRound && isOnline && (
            <Button
              disabled={submitting}
              onClick={handleManualChecking}
              className={actionClass}
            >
              Chuyển sang kiểm phiếu thủ công
            </Button>
          )}
          {canManageRound && isChecking && (
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
              {submitting ? "Đang đóng…" : "Đóng bầu cử"}
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

      <Dialog
        open={countdown.open}
        onOpenChange={(open) => {
          if (!open) cancelCountdown();
        }}
        title={
          countdown.action === "start-online"
            ? "Nhận phiếu trực tuyến"
            : countdown.action === "start-checking"
              ? "Kiểm phiếu thủ công"
              : "Chuyển sang kiểm phiếu thủ công"
        }
        description={
          countdown.action === "manual-checking"
            ? "Đóng cổng nhận phiếu trực tuyến và chuyển sang kiểm phiếu thủ công? Các phiếu trực tuyến đã gửi vẫn được giữ nguyên."
            : `${countdown.action === "start-online" ? "Bắt đầu nhận phiếu trực tuyến" : "Bắt đầu kiểm phiếu thủ công"} cho bầu cử #${data.round.election_id}? ${candidateCount} ứng viên; ${scrutineerCount} nhân sự kiểm phiếu.`
        }
        closeLabel="Hủy"
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="outline"
              disabled={submitting}
              onClick={cancelCountdown}
            >
              Hủy
            </Button>
          </div>
        }
      >
        <div className="text-center py-4">
          <p className="text-4xl font-bold text-[#215e3d] mb-2">
            {countdown.seconds}s
          </p>
          <p className="text-sm text-[#6b6963]">
            Tự động bắt đầu sau {countdown.seconds} giây...
          </p>
        </div>
      </Dialog>

      {isNotStarted &&
        (candidateCount === 0 ||
          (needsScrutineers && scrutineerCount === 0)) && (
          <p role="status" className="text-sm text-[#60635b]">
            {candidateCount === 0
              ? "Lưu danh sách ứng viên để bắt đầu bầu cử."
              : "Thêm nhân sự kiểm phiếu để bắt đầu bầu cử."}
          </p>
        )}

      {!headerOnly && (
        <>
          <ElectionResultsMetrics
            summary={data.summary}
            countedBallots={
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
            }
          />

          {ballots && (
            <ElectionResultsTabs
              resultTab={resultTab}
              setResultTab={setResultTab}
            />
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
        open={confirmEnd && isChecking}
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
