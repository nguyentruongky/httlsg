import { LoadingView } from "@org/ui";
import { useEffect, useState } from "react";
import { flushPublicConnectionReports } from "./connection-check";
import { Button } from "@org/ui";
import { usePublicElection } from "./use-public-election";
import { PublicConnectionCheck } from "./connection-check-card";
import { PublicJoinCard } from "./join-card";
import { ElectionEligibilityError } from "./eligibility-error";
import { PublicSessionLobby } from "./session-lobby";
import { PublicCandidateSelection } from "./candidate-selection";
export function PublicElectionPage() {
  const election = usePublicElection();
  const [failedSession, setFailedSession] = useState<string | null>(null);
  const session = election.session;
  useEffect(() => {
    if (!session || session.status !== "open" || session.receipt) return;
    const controller = new AbortController();
    const flush = () => {
      if (!document.hidden && navigator.onLine)
        void flushPublicConnectionReports(session.id, controller.signal);
    };
    flush();
    window.addEventListener("online", flush);
    return () => {
      controller.abort();
      window.removeEventListener("online", flush);
    };
  }, [session?.id, session?.status, Boolean(session?.receipt)]);
  const closed = Boolean(
    session &&
    ["closed", "cancelled"].includes(session.status) &&
    !session.receipt,
  );
  const needsCheck = Boolean(
    session &&
    !session.receipt &&
    !closed &&
    session.status !== "checking" &&
    (!election.connectionApproved || !session.location.verified),
  );
  const failed = Boolean(session && failedSession === session.id);
  const blocked = closed || (needsCheck && failed);
  const restart = () => {
    setFailedSession(null);
    election.leave();
  };
  const showEntry = !election.loading && (!session || (needsCheck && !failed));
  return (
    <main
      className={`mobile-client min-h-dvh px-4 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] text-[#20211d] sm:px-6 ${blocked ? "bg-white" : "bg-[#f8f7f3]"}`}
    >
      <div className="mx-auto max-w-2xl space-y-5">
        {session && !needsCheck && !closed && (
          <header className="flex items-start justify-between gap-3">
            <h1 className="mt-2 text-2xl font-bold leading-tight">
              {session.title}
            </h1>
          </header>
        )}
        {election.error && !blocked && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-800"
          >
            {election.error}
          </p>
        )}
        {election.networkError && !needsCheck && !blocked && (
          <div
            role="status"
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
          >
            <p>{election.networkError}</p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => void election.refresh().catch(() => {})}
            >
              Thử kết nối lại
            </Button>
          </div>
        )}
        {election.loading && !session && (
          <LoadingView message="Đang tải phiên bầu cử…" />
        )}
        {showEntry && (
          <PublicJoinCard
            busy={election.busy || needsCheck}
            silent={needsCheck}
            onJoin={election.join}
          />
        )}
        {session &&
          (session.receipt || session.status === "checking" ? (
            <PublicSessionLobby
              session={session}
              onLeave={restart}
              onRefresh={() => void election.refresh().catch(() => {})}
            />
          ) : closed ? (
            <ElectionEligibilityError
              session={session}
              reason="session_unavailable"
              onBack={restart}
            />
          ) : needsCheck ? (
            <PublicConnectionCheck
              key={session.id}
              session={session}
              onContinue={election.approveConnection}
              onRestart={restart}
              onFailure={() => setFailedSession(session.id)}
            />
          ) : session.status === "waiting" ? (
            <PublicSessionLobby
              session={session}
              onLeave={restart}
              onRefresh={() => void election.refresh().catch(() => {})}
            />
          ) : (
            <PublicCandidateSelection
              session={session}
              selected={election.selected}
              tab={election.tab}
              onTab={election.setTab}
              query={election.query}
              onQuery={election.setQuery}
              busy={election.busy}
              offline={Boolean(election.networkError)}
              onToggle={election.toggle}
              onSubmit={() => void election.submit()}
            />
          ))}
      </div>
    </main>
  );
}
