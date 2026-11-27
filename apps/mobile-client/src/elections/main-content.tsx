import { canCheckElection } from "@org/core";
import { TicketEntry } from "./scrutineer/ticket-entry";
import { Tickets } from "./election-page";
import type { AuthUser } from "@org/core";

interface MainContentProps {
  round: any;
  user: AuthUser;
  run: (fn: () => Promise<unknown>) => Promise<void>;
  tab: "entry" | "tickets";
  canCheck: boolean;
}

export function MainContent({
  round,
  user,
  run,
  tab,
  canCheck,
}: MainContentProps) {
  return (
    <>
      {canCheck && tab === "entry" ? (
        <TicketEntry
          key={`${user.id}:${round.id}`}
          round={round}
          user={user}
          run={run}
          standalone
          electionType="department"
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
  );
}
