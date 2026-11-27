import { canCheckElection, electionPhase } from "@org/core";
import { LoadingView } from "@org/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, ApiError, electionAccess, useAuth } from "@org/core";
import { Button, useToast } from "@org/ui";
import { Clock3, Printer } from "lucide-react";
import { navigateClient } from "../client-router";
import { TicketEntry } from "./scrutineer/ticket-entry";
import { localMeta } from "./local-election";
import { createElectionPolling } from "./polling";
import { RoundSelector } from "./round-selector";
import { DraftStateView } from "./draft-state-view";
import { ClosedStateView } from "./closed-state-view";
import { MainContent } from "./main-content";
import { BottomNav } from "./bottom-nav";
import type { Round } from "./types";

export function ManualTicketEntryPage({
  roundId,
  electionId,
}: {
  roundId?: string;
  electionId?: string;
}) {
  const user = useAuth()?.user;
  const userId = user?.id;
  const { toast } = useToast();
  const [round, setRound] = useState<Round | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [tab, setTab] = useState<"entry" | "tickets">("entry");
  const run = useCallback(async (fn: () => Promise<unknown>) => {
    try {
      setError("");
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể xử lý yêu cầu.");
    }
  }, []);
  const reload = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!userId) return;
    let active = true;
    let busy = false;
    const load = async (signal: AbortSignal) => {
      if (!active || busy) return false;
      busy = true;
      try {
        let data: { rounds: Round[] };
        let cached = false;
        try {
          data = await apiRequest<{ rounds: Round[] }>("/api/rounds/assigned", {
            signal,
          });
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
        if (!active || signal.aborted) return false;
        setRounds(data.rounds);
        setOffline(cached);
        setError("");
        const targetRound = data.rounds.find((r) =>
          electionId
            ? String(r.election_id) === electionId
            : String(r.id) === roundId,
        );
        if (targetRound) {
          setRound(targetRound);
        }
        return !cached && targetRound?.status === "open";
      } catch (e) {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Không thể tải cuộc bầu cử được phân công.",
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
  }, [userId, roundId, electionId]);

  useEffect(() => {
    if (!round) return;
    if (round.status === "closed" && tab === "entry") {
      setTab("tickets");
    }
  }, [round, tab]);

  if (!user || !electionAccess(user))
    return <p role="alert">Bạn không có quyền nhập phiếu.</p>;

  const canCheck = round ? canCheckElection(round) : false;
  const entryLayout = Boolean(round && canCheck) && tab === "entry";

  return (
    <main
      className={`min-h-screen bg-[#f8f7f3] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 text-[#20211d] sm:px-8 sm:pt-10 ${entryLayout ? "lg:h-[calc(100dvh-var(--offline-banner-height))] lg:min-h-0 lg:overflow-hidden" : ""}`}
    >
      <div
        className={`mx-auto max-w-360 space-y-6 ${entryLayout ? "lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:gap-6 lg:space-y-0" : ""}`}
      >
        <header className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Nhập phiếu thủ công</h1>
          {round && (round.status !== "open" || offline) && (
            <Button variant="outline" onClick={() => void reload.current()}>
              Làm mới trạng thái
            </Button>
          )}
        </header>
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
            Đang dùng thông tin đã lưu. Chọn Làm mới trạng thái sau khi kết nối
            trở lại.
          </p>
        )}
        {loading && !round ? (
          <LoadingView message="Đang tải cuộc bầu cử…" />
        ) : !round ? (
          <section
            role="status"
            className="rounded-2xl border bg-card p-8 text-center"
          >
            <Clock3 className="mx-auto mb-4 text-muted-foreground" size={40} />
            <h2 className="text-xl font-semibold">Đang chờ phân công</h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Bạn chưa được phân công vào cuộc bầu cử nào. <br />
              Chọn Làm mới sau khi quản trị viên phân công.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => void reload.current()}
            >
              Làm mới
            </Button>
          </section>
        ) : (
          <>
            <RoundSelector rounds={rounds} round={round} onChange={setRound} />
            {round.status === "draft" ? (
              <DraftStateView
                round={round}
                onReload={() => void reload.current()}
                loading={loading}
              />
            ) : (
              <>
                <ClosedStateView onViewTickets={() => setTab("tickets")} />
                <MainContent
                  round={round}
                  user={user}
                  run={run}
                  tab={tab}
                  canCheck={canCheck}
                />
              </>
            )}
          </>
        )}
      </div>
      {round && round.status !== "draft" && (
        <BottomNav round={round} tab={tab} onTabChange={setTab} />
      )}
    </main>
  );
}
