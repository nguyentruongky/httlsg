import { TicketCard } from "./tickets/ticket-card";
import { AdminTicketFilters } from "./tickets/admin-ticket-filters";
import { TicketEntry } from "./scrutineer/ticket-entry";
export { TicketEntry } from "./scrutineer/ticket-entry";
import { CandidateManager } from "./candidate-manager";
import { ScrutineerManager } from "./scrutineer-manager";
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
              className={primaryBtn}
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

        <div className={box}>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
              <span>Cuộc bầu cử</span>
              <select
                className={selectClass}
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
                  className={selectClass}
                  value={roundId}
                  onChange={(e) => setRoundId(Number(e.target.value))}
                >
                  <option value={0}>Chọn bầu cử</option>
                  {detail.rounds.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      Bầu cử #{r.election_id} · {labelStatus(r.status)}
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
                      <Button
                        key={t}
                        variant={tab === t ? "default" : "outline"}
                        className={tab === t ? primaryBtn : outlineBtn}
                        onClick={() => setTab(t)}
                      >
                        {
                          {
                            manage: "Quản lý bầu cử",
                            results: "Kết quả",
                            audit: "Nhật ký",
                          }[t]
                        }
                      </Button>
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

        {/* Fixed 2-Tab Bottom Navigation Bar */}
        <nav
          aria-label="Điều hướng kiểm phiếu"
          className="fixed bottom-0 left-0 right-0 z-50 flex w-full items-center justify-center border-t border-[#e6e4dd] bg-[#f8f7f3] px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2"
        >
          <div className="flex w-full max-w-6xl justify-between p-1">
            {[
              { id: "entry", label: "Nhập phiếu", icon: FilePlus2 },
              { id: "tickets", label: "Phiếu của tôi", icon: FileCheck2 },
            ].map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={!round}
                  onClick={() => round && setTab(t.id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-1 flex-col items-center justify-center gap-1 px-3 py-1.5 text-xs transition-colors focus-visible:outline-none ${
                    !round
                      ? "pointer-events-none opacity-40"
                      : active
                        ? "font-semibold text-[#1c1b18]"
                        : "font-medium text-[#8a8881] hover:text-[#1c1b18]"
                  }`}
                >
                  <t.icon
                    size={20}
                    strokeWidth={active ? 2.25 : 1.5}
                    className={active ? "text-[#215e3d]" : "text-[#8a8881]"}
                  />
                  <span className="whitespace-nowrap">{t.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}

type Run = (fn: () => Promise<unknown>) => Promise<void>;

function RoundManagement({
  round,
  scrutineers,
  refresh,
  run,
}: {
  round: any;
  scrutineers: any[];
  refresh: () => Promise<void>;
  run: Run;
}) {
  const [users, setUsers] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<ElectionCandidate[]>([]);
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

  const change = (action: string) =>
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
            : "Xác nhận mở lại bầu cử?";
      if (!window.confirm(description)) return;
      await post(`/api/rounds/${round.id}/${action}`, { reason });
      await refresh();
    });

  return (
    <section className={box}>
      <h2 className="text-lg font-semibold text-[#1c1b18]">
        Bầu cử #{round.election_id} · {labelStatus(round.status)}
      </h2>
      {round.status === "draft" && (
        <>
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
                  />
                  {c.candidate_no} · {c.full_name}
                </label>
              ))}
            </div>
          </details>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className={outlineBtn}
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
            <Button className={primaryBtn} onClick={() => void change("start")}>
              Bắt đầu bầu cử
            </Button>
          </div>
        </>
      )}
      {round.status === "open" && (
        <Button variant="destructive" onClick={() => void change("stop")}>
          Kết thúc bầu cử
        </Button>
      )}
      {round.status === "closed" && (
        <>
          <Button
            variant="outline"
            className={outlineBtn}
            onClick={() => void change("reopen")}
          >
            Mở lại (cần lý do)
          </Button>
          <h3 className="font-medium">Chuẩn bị cuộc bầu cử tiếp theo</h3>
          <select
            aria-label="Quy tắc tạo bầu cử mới"
            className={selectClass}
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
            className={primaryBtn}
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
            <>
              {preview.tie && (
                <p
                  role="alert"
                  className="rounded-lg bg-amber-200 p-3 text-black"
                >
                  Có ứng viên đồng phiếu tại ngưỡng. Ban kiểm phiếu cần quyết
                  định.
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
                  />
                  {r.rank}. #{r.candidate_no} {r.full_name} · {r.votes} phiếu{" "}
                  {r.tie ? "· Đồng phiếu" : ""}
                </label>
              ))}
              <Button
                className={primaryBtn}
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
            </>
          )}
        </>
      )}
      {progress && (
        <p className="text-sm text-[#6b6963]">
          Đã nhận {progress.summary.received} phiếu.
        </p>
      )}
    </section>
  );
}

function Results({ round, run }: { round: any; run: Run }) {
  const [data, setData] = useState<any>();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("votes");
  const [top, setTop] = useState(10);

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

  if (!data) return <p>Đang tải kết quả…</p>;

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
          ["Trạng thái", labelStatus(data.round.status)],
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
              {rows.map((r: any) => (
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

export function Tickets({
  round,
  user,
  run,
}: {
  round: any;
  user: any;
  run: Run;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [local, setLocal] = useState<LocalTicket[]>([]);
  const [candidateList, setCandidateList] = useState<ElectionCandidate[]>([]);
  const [teamFilter, setTeamFilter] = useState("all");
  const admin = electionAdmin(user);

  const load = useCallback(async () => {
    setLocal(await localTickets(user.id, round.id));
    const cached = await localMeta(`round:${user.id}:${round.id}`);
    setCandidateList(cached?.candidates ?? []);
    if (navigator.onLine)
      setItems(
        (await apiRequest<any>(`/api/rounds/${round.id}/tickets`)).items,
      );
  }, [round.id, user.id]);

  useEffect(() => {
    void run(load);
    const timer = setInterval(() => void run(load), 5000);
    return () => clearInterval(timer);
  }, [load, run]);

  const seen = new Set(items.map((t) => t.client_uuid));
  const rows = [
    ...items.map((t) => ({ ...t, sync_state: "synced" })),
    ...local
      .filter((t) => !seen.has(t.client_uuid))
      .map((t) => ({
        ...t,
        scrutineer_name: user.name,
        candidates: t.candidate_ids.map(
          (id) =>
            candidateList.find((c) => c.id === id) ?? {
              candidate_no: id,
              full_name: "Ứng viên chưa có trong bộ nhớ",
            },
        ),
      })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // Group by persisted team ID, never by names or the operator's current team.
  const teamKey = (ticket: any): string =>
    ticket.source === "online" ? "online" : (ticket.team_id ?? "unassigned");
  const teams = [
    ...new Map<
      string,
      { name: string; order: number }
    >(
      rows.map((ticket) => [
        teamKey(ticket),
        {
          name:
            ticket.source === "online"
              ? "Trực tuyến"
              : (ticket.team_name ?? "Tổ chưa xác định"),
          order:
            ticket.source === "online"
              ? Number.MAX_SAFE_INTEGER
              : Number(ticket.team_sort_order ?? Number.MAX_SAFE_INTEGER),
        },
      ]),
    ).entries(),
  ]
    .map(([id, value]) => ({ id, name: value.name, order: value.order }))
    .sort(
      (a, b) =>
        a.order - b.order || a.name.localeCompare(b.name, "vi", { numeric: true }),
    );
  const visibleRows = admin
    ? rows
        .filter(
          (ticket) => teamFilter === "all" || teamKey(ticket) === teamFilter,
        )
        .sort(
          (a, b) =>
            Number(a.team_ticket_no ?? a.seq_no) -
              Number(b.team_ticket_no ?? b.seq_no) ||
            (a.team_name ?? "Trực tuyến").localeCompare(
              b.team_name ?? "Trực tuyến",
              "vi",
              { numeric: true },
            ) ||
            String(a.client_uuid).localeCompare(String(b.client_uuid)),
        )
    : rows;

  return (
    <section
      className="space-y-4 rounded-2xl bg-[#f8f7f3] p-3 sm:p-4"
      aria-label={admin ? "Tất cả phiếu" : "Phiếu của tôi"}
    >
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[#1c1b18]">
          {admin
            ? `Tất cả phiếu (${rows.length})`
            : `Phiếu của tôi (${rows.length})`}{" "}
        </h2>
      </header>
      {admin && (
        <>
          <AdminTicketFilters
            teams={teams}
            team={teamFilter}
            onTeam={setTeamFilter}
          />
          <p role="status" className="text-sm text-[#60635b]">
            Hiển thị {visibleRows.length} / {rows.length} phiếu
          </p>
        </>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {visibleRows.map((ticket) => (
          <TicketCard
            key={ticket.client_uuid}
            ticket={ticket}
            admin={admin}
            onAction={async (requestOnly, reason) => {
              await post(
                ticket.source === "online"
                  ? `/api/tickets/online/${ticket.id}/void`
                  : `/api/tickets/${ticket.id}/void`,
                requestOnly ? { reason, requestOnly: true } : { reason },
              );
              if (requestOnly)
                await logElectionAction(
                  user.id,
                  round.id,
                  "ticket_void_requested",
                  { ticketId: ticket.id, reason },
                );
              await load();
            }}
          />
        ))}
      </div>
      {!visibleRows.length && (
        <p className="rounded-xl border border-[#e6e4dd] bg-white p-8 text-center text-sm text-[#777368]">
          {rows.length
            ? "Không có phiếu phù hợp. Hãy đổi tổ hoặc số thứ tự phiếu."
            : "Chưa có phiếu nào."}
        </p>
      )}
    </section>
  );
}

function Audit({ election, run }: { election: number; run: Run }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    void run(async () =>
      setItems(
        (await apiRequest<any>(`/api/elections/${election}/audit`)).items,
      ),
    );
  }, [election, run]);
  return (
    <div className={box}>
      {items.map((a) => (
        <details key={a.id}>
          <summary className="min-h-11 cursor-pointer text-sm">
            {new Date(a.created_at).toLocaleString("vi-VN")} · {a.full_name} ·{" "}
            {a.action}
          </summary>
          <pre className="overflow-auto rounded-lg bg-[#f8f7f3] p-3 text-xs">
            {JSON.stringify(a.payload, null, 2)}
          </pre>
        </details>
      ))}
    </div>
  );
}

function BackupImport({ election, run }: { election: number; run: Run }) {
  const [backup, setBackup] = useState<any>();
  const [preview, setPreview] = useState<any>();
  return (
    <details className={box}>
      <summary className="cursor-pointer text-sm font-medium">
        Đối chiếu bản sao JSON
      </summary>
      <input
        type="file"
        accept=".json"
        className="text-sm"
        onChange={(e) =>
          void run(async () => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 10000000) throw new Error("Tệp tối đa 10 MB.");
            setBackup(JSON.parse(await file.text()));
            setPreview(undefined);
          })
        }
      />
      <Button
        className={primaryBtn}
        disabled={!backup}
        onClick={() =>
          void run(async () =>
            setPreview(
              await post(`/api/elections/${election}/backup`, {
                backup,
                dryRun: true,
              }),
            ),
          )
        }
      >
        Xem trước đối chiếu
      </Button>
      {preview && (
        <>
          <pre className="max-h-64 overflow-auto rounded-lg bg-[#f8f7f3] p-3 text-xs">
            {JSON.stringify(preview, null, 2)}
          </pre>
          <p className="text-xs text-[#6b6963]">
            Chỉ bổ sung phiếu thiếu vào cuộc bầu cử đang mở. Phiếu của bầu cử đã
            kết thúc và xung đột được giữ để đối chiếu.
          </p>
          <Button
            className={primaryBtn}
            disabled={preview.chainErrors.length > 0}
            onClick={() =>
              void run(async () => {
                const result = await post(`/api/elections/${election}/backup`, {
                  backup,
                  dryRun: false,
                  expectedHash: preview.hash,
                });
                setPreview({ ...result, chainErrors: [] });
              })
            }
          >
            Xác nhận khôi phục phiếu thiếu
          </Button>
        </>
      )}
    </details>
  );
}
