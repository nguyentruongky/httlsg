import { electionPhase, ELECTION_PHASE_LABELS } from "@org/core";
import { LoadingView } from "@org/ui";
import React, { useCallback, useEffect, useState } from "react";
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
import { FilePlus2, FileCheck2 } from "lucide-react";
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

type Run = (fn: () => Promise<unknown>) => Promise<void>;

interface RoundManagementProps {
  round: any;
  scrutineers: any[];
  refresh: () => Promise<void>;
  run: Run;
}

function PreviewContent({
  preview,
  carry,
  setCarry,
  round,
  rule,
  value,
  setPreview,
  run,
}: {
  preview: any;
  carry: number[];
  setCarry: React.Dispatch<React.SetStateAction<number[]>>;
  round: any;
  rule: string;
  value: number;
  setPreview: React.Dispatch<React.SetStateAction<any>>;
  run: Run;
}) {
  return (
    <div>
      {preview.tie && (
        <p role="alert" className="rounded-lg bg-amber-200 p-3 text-black">
          Có ứng viên đồng phiếu tại ngưỡng. Ban kiểm phiếu cần quyết định.
        </p>
      )}
      {preview.results.map((r: any) => (
        <label key={r.id} className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={carry.includes(r.id)}
            onChange={() =>
              setCarry((old) =>
                old.includes(r.id)
                  ? old.filter((v) => v !== r.id)
                  : [...old, r.id],
              )
            }
            className="h-4 w-4 text-[#215e3d] border-[#e6e4dd] focus:ring-2 focus:ring-[#215e3d]/20"
          />
          {r.rank}. #{r.candidate_no} {r.full_name} · {r.votes} phiếu{" "}
          {r.tie ? "· Đồng phiếu" : ""}
        </label>
      ))}
      <Button
        className="bg-[#215e3d] text-white hover:bg-[#19492f] border-[#215e3d]"
        onClick={() =>
          void run(async () => {
            if (
              !window.confirm(
                "Tạo cuộc bầu cử tiếp theo với danh sách đã chọn?",
              )
            )
              return;
            const nextElection = await post(
              `/api/rounds/${round.id}/prepare-next`,
              {
                rule,
                value,
                candidateIds: carry,
                dryRun: false,
              },
            );
            setPreview(undefined);
            window.location.assign(
              `/client/admin/elections/${nextElection.election_id}`,
            );
          })
        }
      >
        Xác nhận tạo cuộc bầu cử tiếp theo
      </Button>
    </div>
  );
}

export function RoundManagement({
  round,
  scrutineers,
  refresh,
  run,
}: RoundManagementProps) {
  const [users, setUsers] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [progress, setProgress] = useState<any>();
  const [rule, setRule] = useState("top");
  const [value, setValue] = useState(10);
  const [preview, setPreview] = useState<any>();
  const [carry, setCarry] = useState<number[]>([]);

  useEffect(() => {
    void run(async () => {
      const c = await apiRequest<any>(`/api/rounds/${round.id}/candidates`);
      setCandidates(c.availableCandidates ?? c.candidates);
      setSelected(c.candidates.map((v: any) => v.id));
      const r = await apiRequest<any>(`/api/rounds/${round.id}/results`);
      setProgress(r);
      setUsers(r.progress.map((s: any) => s.user_id));
      setPreview(undefined);
    });
  }, [round.id, round.status, run]);

  const change = (action: string, phase?: "online" | "checking") =>
    run(async () => {
      const reason =
        action === "reopen" ? window.prompt("Lý do mở lại") : undefined;
      if (action === "reopen" && !reason?.trim()) return;
      const fresh = await apiRequest<any>(`/api/rounds/${round.id}/results`);
      setProgress(fresh);
      const description =
        action === "start"
          ? `Bắt đầu bầu cử #${round.election_id}: ${fresh.candidates.length} ứng viên; ${fresh.progress.map((p: any) => p.full_name).join(", ")}?`
          : action === "stop"
            ? `Kết thúc bầu cử #${round.election_id}: đã nhận ${fresh.summary.received} phiếu.\nChờ đồng bộ: ${fresh.progress.map((p: any) => `${p.full_name}: ${p.pending_count} (báo lần cuối ${p.heartbeat_at ?? "chưa có"})`).join("; ")}. Thiết bị mất kết nối có thể chưa báo đủ.`
            : action === "manual-checking"
              ? "Đóng cổng trực tuyến và chuyển sang kiểm phiếu thủ công?"
              : "Xác nhận mở lại bầu cử để kiểm phiếu thủ công?";
      if (!window.confirm(description)) return;
      await post(`/api/rounds/${round.id}/${action}`, {
        reason,
        ...(phase ? { phase } : {}),
      });
      await refresh();
    });

  return (
    <section className={box}>
      <h2 className="text-lg font-semibold text-[#1c1b18]">
        Bầu cử #{round.election_id} ·{" "}
        {ELECTION_PHASE_LABELS[electionPhase(round)]}
      </h2>
      {round.status === "draft" && (
        <div>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium text-[#1c1b18]">
              Người nhập phiếu
            </legend>
            {scrutineers.map((s) => (
              <label key={s.id} className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={users.includes(s.id)}
                  onChange={() =>
                    setUsers((old) =>
                      old.includes(s.id)
                        ? old.filter((v) => v !== s.id)
                        : [...old, s.id],
                    )
                  }
                  className="h-4 w-4 text-[#215e3d] border-[#e6e4dd] focus:ring-2 focus:ring-[#215e3d]/20"
                />
                {s.full_name}
              </label>
            ))}
          </fieldset>
          <details className="rounded-lg border border-[#e6e4dd] bg-[#f8f7f3] p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Ứng viên ({selected.length})
            </summary>
            <div className="mt-2 space-y-1">
              {candidates.map((c) => (
                <label key={c.id} className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() =>
                      setSelected((old) =>
                        old.includes(c.id)
                          ? old.filter((v) => v !== c.id)
                          : [...old, c.id],
                      )
                    }
                    className="h-4 w-4 text-[#215e3d] border-[#e6e4dd] focus:ring-2 focus:ring-[#215e3d]/20"
                  />
                  {c.candidate_no} · {c.full_name}
                </label>
              ))}
            </div>
          </details>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-[#e6e4dd] bg-white text-[#1c1b18] hover:bg-[#f2f0e8]"
              onClick={() =>
                void run(async () => {
                  await post(`/api/rounds/${round.id}/configure`, {
                    userIds: users,
                    candidateIds: selected,
                  });
                  await refresh();
                })
              }
            >
              Lưu phân công và ứng viên
            </Button>
            <Button
              className="bg-[#215e3d] text-white hover:bg-[#19492f] border-[#215e3d]"
              onClick={() => void change("start", "online")}
            >
              Nhận phiếu trực tuyến
            </Button>
            <Button
              className="border-[#e6e4dd] bg-white text-[#1c1b18] hover:bg-[#f2f0e8]"
              onClick={() => void change("start", "checking")}
            >
              Kiểm phiếu thủ công
            </Button>
          </div>
          {preview && (
            <PreviewContent
              preview={preview}
              carry={carry}
              setCarry={setCarry}
              round={round}
              rule={rule}
              value={value}
              setPreview={setPreview}
              run={run}
            />
          )}
        </div>
      )}
      {electionPhase(round) === "online" && (
        <Button onClick={() => void change("manual-checking")}>
          Chuyển sang kiểm phiếu thủ công
        </Button>
      )}
      {electionPhase(round) === "checking" && (
        <Button variant="destructive" onClick={() => void change("stop")}>
          Đóng bầu cử
        </Button>
      )}
      {round.status === "closed" && (
        <div>
          <Button
            className="border-[#e6e4dd] bg-white text-[#1c1b18] hover:bg-[#f2f0e8]"
            onClick={() => void change("reopen")}
          >
            Mở lại (cần lý do)
          </Button>
          <h3 className="font-medium">Chuẩn bị cuộc bầu cử tiếp theo</h3>
          <select
            aria-label="Quy tắc tạo bầu cử mới"
            className="min-h-10 rounded-lg border border-[#e2e0d8] bg-[#f8f7f3] px-3 py-1.5 text-sm text-[#1c1b18] focus:border-[#215e3d] focus:outline-none"
            value={rule}
            onChange={(e) => {
              setRule(e.target.value);
              setPreview(undefined);
            }}
          >
            <option value="top">Top X theo số phiếu</option>
            <option value="minimum">Số phiếu tối thiểu</option>
            <option value="manual">Chọn thủ công</option>
          </select>
          <Input
            aria-label="Giá trị quy tắc"
            type="number"
            min={0}
            value={value}
            className="border-[#e2e0d8] bg-[#f8f7f3]"
            onChange={(e) => {
              setValue(Number(e.target.value));
              setPreview(undefined);
            }}
          />
          <Button
            className="bg-[#215e3d] text-white hover:bg-[#19492f] border-[#215e3d]"
            onClick={() =>
              void run(async () => {
                const p = await post(`/api/rounds/${round.id}/prepare-next`, {
                  rule,
                  value,
                  dryRun: true,
                });
                setPreview(p);
                setCarry(p.selected);
              })
            }
          >
            Xem trước tạo bầu cử mới
          </Button>
          {preview && (
            <PreviewContent
              preview={preview}
              carry={carry}
              setCarry={setCarry}
              round={round}
              rule={rule}
              value={value}
              setPreview={setPreview}
              run={run}
            />
          )}
        </div>
      )}
      {progress && (
        <p className="text-sm text-[#6b6963]">
          Đã nhận {progress.summary.received} phiếu.
        </p>
      )}
    </section>
  );
}
