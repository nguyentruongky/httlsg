import { useOwnTicketCount } from "./scrutineer/use-own-ticket-count";
import { ScrutineerHeader } from "./scrutineer/scrutineer-header";
import { ScrutineerNavigation } from "./scrutineer/scrutineer-navigation";
import {
  exportScrutineerJson,
  useScrutineerExports,
} from "./scrutineer/use-scrutineer-exports";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiRequest,
  ApiError,
  electionAccess,
  useAuth,
  type AssignedElectionRound,
} from "@org/core";
import { Button, useToast } from "@org/ui";
import { Clock3, Printer } from "lucide-react";
import { navigateClient } from "../client-router";
import { Tickets } from "./election-page";
import { TicketEntry } from "./scrutineer/ticket-entry";
import { localMeta } from "./local-election";
type AssignedResponse = { rounds: AssignedElectionRound[] };
export function ScrutineerPage({
  roundId,
  electionId,
}: {
  roundId?: string;
  electionId?: string;
}) {
  const user = useAuth()?.user;
  const userId = user?.id;
  const { toast } = useToast();
  const [rounds, setRounds] = useState<AssignedElectionRound[]>([]);
  const [selected, setSelected] = useState(Number(roundId) || 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [tab, setTab] = useState<"entry" | "tickets">("entry");
  const requested = useRef({ roundId, electionId });
  requested.current = { roundId, electionId };
  const reload = useRef<() => Promise<void>>(async () => {});
  const previous = useRef<AssignedElectionRound | undefined>(undefined);
  const run = useCallback(async (fn: () => Promise<unknown>) => {
    try {
      setError("");
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể xử lý yêu cầu.");
    }
  }, []);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    let busy = false;
    const load = async () => {
      if (busy) return;
      busy = true;
      try {
        let data: AssignedResponse;
        let cached = false;
        try {
          data = await apiRequest<AssignedResponse>("/api/rounds/assigned");
          await localMeta(`election-assigned:${userId}`, data).catch(() => {});
        } catch (e) {
          if (e instanceof ApiError && [401, 403].includes(e.status)) {
            if (active) setRounds([]);
            throw e;
          }
          data = await localMeta(`election-assigned:${userId}`);
          if (!data) throw e;
          cached = true;
        }
        if (!active) return;
        setRounds(data.rounds);
        setOffline(cached);
        setError("");
        setSelected((current) =>
          data.rounds.some((r) => r.id === current)
            ? current
            : (data.rounds.find((r) =>
                requested.current.electionId
                  ? String(r.election_id) === requested.current.electionId
                  : String(r.id) === requested.current.roundId,
              )?.id ??
              data.rounds[0]?.id ??
              0),
        );
      } catch (e) {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Không thể tải cuộc bầu cử được phân công.",
          );
      } finally {
        busy = false;
        if (active) setLoading(false);
      }
    };
    reload.current = load;
    void load();
    const timer = setInterval(() => void load(), 5000);
    window.addEventListener("online", load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("online", load);
    };
  }, [userId]);
  useEffect(() => {
    const requestedRound = rounds.find((value) =>
      electionId
        ? String(value.election_id) === electionId
        : String(value.id) === roundId,
    );
    if (requestedRound) {
      setSelected(requestedRound.id);
      setTab("entry");
    }
  }, [roundId, electionId]);
  const round = rounds.find((r) => r.id === selected);
  const ticketCount = useOwnTicketCount(userId, round?.id);
  const { busy: exporting, exportFile } = useScrutineerExports(
    userId,
    round,
    run,
  );
  const backup = useCallback(
    async (value: AssignedElectionRound) => {
      if (userId) await exportScrutineerJson(userId, value);
    },
    [userId],
  );
  useEffect(() => {
    if (!round) return;
    const old = previous.current;
    previous.current = round;
    if (String(round.election_id) !== electionId)
      navigateClient(`/client/elections/${round.election_id}`, true);
    if (
      old?.id === round.id &&
      old.status !== "open" &&
      round.status === "open"
    )
      setTab("entry");
    if (
      old?.id === round.id &&
      old.status === "open" &&
      round.status === "closed"
    ) {
      setTab("tickets");
      toast({
        title: "Cuộc bầu cử đã kết thúc",
        description: "Các phiếu đã lưu trên thiết bị được giữ nguyên.",
      });
      if (
        window.confirm(
          "Cuộc bầu cử đã kết thúc. Xuất bản sao lưu công việc ngay?",
        )
      )
        void run(() => backup(round));
    }
  }, [round, electionId, run, backup, toast]);
  const entryLayout = round?.status === "open" && tab === "entry";
  if (!user || !electionAccess(user))
    return <p role="alert">Bạn không có quyền kiểm phiếu.</p>;
  return (
    <main
      className={`min-h-screen bg-[#f8f7f3] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 text-[#20211d] sm:px-8 sm:pt-10 ${entryLayout ? "lg:h-[calc(100dvh-var(--offline-banner-height))] lg:min-h-0 lg:overflow-hidden" : ""}`}
    >
      <div
        className={`mx-auto max-w-[1440px] space-y-6 ${entryLayout ? "lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:gap-6 lg:space-y-0" : ""}`}
      >
        <ScrutineerHeader
          name={user.name}
          round={round}
          onExport={exportFile}
          exporting={exporting}
        />
        {error && (
          <div
            role="alert"
            className="space-y-2 rounded-xl border border-destructive/30 p-3 text-destructive"
          >
            <p>{error}</p>
            <Button variant="outline" onClick={() => void reload.current()}>
              Thử lại
            </Button>
          </div>
        )}
        {offline && (
          <p
            role="status"
            className="rounded-lg bg-amber-100 p-3 text-sm text-amber-950"
          >
            Đang dùng thông tin đã lưu. Trạng thái bầu cử sẽ được cập nhật khi
            kết nối trở lại.
          </p>
        )}
        {loading && !round ? (
          <p role="status">Đang tải cuộc bầu cử được phân công…</p>
        ) : !round ? (
          <section
            role="status"
            className="rounded-2xl border bg-card p-8 text-center"
          >
            <Clock3 className="mx-auto mb-4 text-muted-foreground" size={40} />
            <h2 className="text-xl font-semibold">Đang chờ phân công</h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Bạn chưa được phân công vào cuộc bầu cử nào. {<br />}Màn hình sẽ
              tự cập nhật khi quản trị viên phân công.
            </p>
          </section>
        ) : (
          <>
            {rounds.length > 1 && (
              <label className="block text-sm">
                Cuộc bầu cử được phân công
                <select
                  className="mt-2 block min-h-11 w-full rounded-lg border bg-background p-2"
                  value={selected}
                  onChange={(e) => {
                    setSelected(Number(e.target.value));
                    setTab("entry");
                  }}
                >
                  {rounds.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.election_name} · #{r.election_id} ·{" "}
                      {r.status === "open"
                        ? "Đang mở"
                        : r.status === "draft"
                          ? "Chờ mở"
                          : "Đã đóng"}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {round.status === "draft" ? (
              <section
                role="status"
                aria-live="polite"
                className="rounded-2xl border bg-card px-5 py-12 text-center"
              >
                <Clock3 className="mx-auto mb-4 text-primary" size={44} />
                <h2 className="text-xl font-semibold">
                  Đang chờ mở bầu cử #{round.election_id}
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
                  Bạn đã được phân công kiểm phiếu. Hãy giữ màn hình này mở; ô
                  tìm ứng viên và nhập phiếu sẽ tự xuất hiện khi quản trị viên
                  bắt đầu bầu cử.
                </p>
                <p className="mt-5 text-sm text-muted-foreground">
                  Tự cập nhật mỗi 5 giây.
                </p>
              </section>
            ) : (
              <>
                {round.status === "closed" && (
                  <section
                    role="status"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted p-4"
                  >
                    <h2 className="font-semibold">Cuộc bầu cử đã kết thúc</h2>
                    <Button
                      variant="outline"
                      disabled={exporting || !round.assignment.team_id}
                      onClick={() => exportFile("print")}
                      className="gap-2 border-[#d3dfd5] bg-white text-[#215e3d] shadow-none"
                    >
                      <Printer size={17} />
                      In biên bản
                    </Button>
                  </section>
                )}
                {round.status === "open" && tab === "entry" ? (
                  <TicketEntry
                    key={`${user.id}:${round.id}`}
                    round={round}
                    user={user}
                    run={run}
                    standalone
                  />
                ) : (
                  <Tickets
                    key={`${user.id}:${round.id}`}
                    round={round}
                    user={user}
                    run={run}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
      {round && round.status !== "draft" && (
        <ScrutineerNavigation
          tab={tab}
          closed={round.status === "closed"}
          ticketCount={ticketCount}
          onChange={setTab}
        />
      )}
    </main>
  );
}
