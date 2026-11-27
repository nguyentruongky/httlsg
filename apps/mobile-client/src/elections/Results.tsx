import { electionPhase, ELECTION_PHASE_LABELS } from "@org/core";
import { LoadingView } from "@org/ui";
import { useElectionResultsPolling } from "./use-election-results-polling";
import { useCallback, useEffect, useState } from "react";
import {
  apiRequest,
  authenticatedFetch,
  electionAdmin,
  electionAccess,
  electionSearch,
  useAuth,
} from "@org/core";
import { Button, Input, useToast } from "@org/ui";
import { FilePlus2, FileCheck2 } from "lucide-react";
import {
  downloadElectionFile,
  localMeta,
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

type Run = (fn: () => Promise<unknown>) => Promise<void>;

interface ResultsProps {
  round: any;
  run: Run;
}

export function Results({ round, run }: ResultsProps) {
  const [data, setData] = useState<any>();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("votes");
  const [top, setTop] = useState(10);

  useElectionResultsPolling(
    round.id,
    round.election_id,
    round.status,
    run,
    setData,
  );

  if (!data) return <LoadingView message="Đang tải kết quả…" />;

  const rows = data.results
    .filter((r: any) =>
      electionSearch(r.full_name + " " + r.candidate_no).includes(
        electionSearch(search),
      ),
    )
    .sort((a: any, b: any) =>
      sort === "name"
        ? a.full_name.localeCompare(b.full_name, "vi")
        : sort === "number"
        ? a.candidate_no - b.candidate_no
        : b.votes - a.votes,
    );

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Đã nhận", data.summary.received],
          ["Hợp lệ", data.summary.valid],
          ["Quá giới hạn", data.summary.over_limit],
          ["Phiếu trắng", data.summary.blank],
          ["Đã hủy", data.summary.void],
          [
            "TB lựa chọn / phiếu hợp lệ",
            Number(data.summary.average).toFixed(2),
          ],
          ["Trạng thái", ELECTION_PHASE_LABELS[electionPhase(data.round)]],
          [
            "Thời gian (phút)",
            data.round.opened_at
              ? Math.max(
                  0,
                  Math.round(
                    (new Date(data.round.closed_at ?? Date.now()).getTime() -
                      new Date(data.round.opened_at).getTime()) /
                      60000,
                  ),
                )
              : 0,
          ],
        ].map(([label, value]) => (
          <div className={box} key={String(label)}>
            <p className="text-sm text-[#5c5a54]">{label}</p>
            <strong className="text-xl font-bold text-[#1c1b18]">
              {value}
            </strong>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          className={primaryBtn}
          onClick={() =>
            void run(() =>
              download(
                `/api/rounds/${round.id}/results/export?format=pdf`,
                "ket-qua.pdf",
              ),
            )
          }
        >
          Xuất PDF
        </Button>
        <Button
          variant="outline"
          className={outlineBtn}
          onClick={() =>
            void run(() =>
              download(
                `/api/rounds/${round.id}/results/export?format=xlsx`,
                "ket-qua.xlsx",
              ),
            )
          }
        >
          Xuất Excel
        </Button>
      </div>
      <div className={box}>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Tìm ứng viên</span>
          <Input
            value={search}
            className="border-[#e2e0d8] bg-[#f8f7f3]"
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Sắp xếp"
          className={selectClass}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="votes">Số phiếu</option>
          <option value="name">Họ tên</option>
          <option value="number">Số ứng viên</option>
        </select>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#e6e4dd]">
                {["Hạng", "Số", "Họ tên", "Phiếu", "% phiếu hợp lệ"].map(
                  (h) => (
                    <th className="p-2 font-semibold" key={h}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, index: number) => (
                <tr key={r.id} className="border-b border-[#efede7]">
                  <td className="p-2">
                    {r.rank} {r.tie ? "≡" : ""}
                  </td>
                  <td>{r.candidate_no}</td>
                  <td>{r.full_name}</td>
                  <td>{r.votes}</td>
                  <td>{r.percent.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[#6b6963]">≡ Đồng phiếu</p>
      </div>
      <div className={box}>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Biểu đồ Top</span>
          <Input
            type="number"
            min={1}
            max={100}
            value={top}
            className="border-[#e2e0d8] bg-[#f8f7f3]"
            onChange={(e) =>
              setTop(Math.max(1, Math.min(100, Number(e.target.value))))
            }
          />
        </label>
        {data.results.slice(0, top).map((r: any) => (
          <div key={r.id}>
            <p className="text-sm">
              #{r.candidate_no} {r.full_name} · {r.votes}
            </p>
            <div
              className="h-3 rounded bg-[#215e3d]"
              style={{
                width: `${data.results[0]?.votes ? (100 * r.votes) / data.results[0].votes : 0}%`,
              }}
            />
          </div>
        ))}
      </div>
      <div className={box}>
        <h3 className="font-semibold">Tiến độ kiểm phiếu viên</h3>
        {data.progress.map((p: any) => (
          <p key={p.user_id} className="text-sm">
            {p.full_name}: {p.tickets} phiếu, {p.invalid} không hợp lệ,{" "}
            {p.pending_count} chờ (báo lần cuối{" "}
            {p.heartbeat_at
              ? new Date(p.heartbeat_at).toLocaleTimeString("vi-VN")
              : "chưa có"}
            ), phiếu cuối{" "}
            {p.last_submission
              ? new Date(p.last_submission).toLocaleString("vi-VN")
              : "—"}
          </p>
        ))}
      </div>
    </section>
  );
}