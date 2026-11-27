import { ElectionHeader } from "../components/election-header";
import { ElectionSelector } from "../components/election-selector";

interface ElectionPageHeaderProps {
  user: any;
  elections: any[];
  selected: number;
  setSelected: (id: number) => void;
  detail: any;
  roundId: number;
  handleRoundChange: (id: number) => void;
  error: string;
  admin: boolean;
  handleCreateElection: () => void;
}

export function ElectionPageHeader({
  user,
  elections,
  selected,
  setSelected,
  detail,
  roundId,
  handleRoundChange,
  error,
  admin,
  handleCreateElection,
}: ElectionPageHeaderProps) {
  const roundData = detail?.rounds?.find(
    (round: { id: number }) => round.id === roundId,
  );
  const phase = roundData?.phase ?? "draft";
  return (
    <div className="min-h-screen bg-[#f8f7f3] text-[#1c1b18]">
      <main className="mx-auto max-w-6xl space-y-5 p-4 pb-28">
        <ElectionHeader
          electionName={detail?.election?.name ?? "Bầu cử"}
          phase={phase as any}
          status={roundData?.status ?? "draft"}
          userName={user?.name ?? ""}
          onCreateElection={admin ? handleCreateElection : undefined}
          canCreate={admin}
        />

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <ElectionSelector
          elections={elections}
          selected={selected}
          onChange={setSelected}
          detail={detail}
          roundId={roundId}
          onRoundChange={handleRoundChange}
        />

        {detail?.election?.description && (
          <p className="text-sm text-[#5c5a54]">
            {detail.election.description}
          </p>
        )}
      </main>
    </div>
  );
}
