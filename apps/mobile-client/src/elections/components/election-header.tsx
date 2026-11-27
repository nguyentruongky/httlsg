import { cn } from "@org/ui";
import { useElectionUIStore } from "../store";
import type { ElectionPhase } from "../domain/types";
import { ELECTION_PHASE_LABELS } from "../domain/types";

interface ElectionHeaderProps {
  electionName: string;
  phase: ElectionPhase;
  status: string;
  userName: string;
  onCreateElection?: () => void;
  canCreate: boolean;
}

export function ElectionHeader({
  electionName,
  phase,
  status,
  userName,
  onCreateElection,
  canCreate,
}: ElectionHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-[#6b6963]">
          Người nhập phiếu: {userName}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[#1c1b18]">
          {electionName}
        </h1>
      </div>
      {canCreate && onCreateElection && (
        <button
          className="bg-[#215e3d] text-white hover:bg-[#19492f] border-[#215e3d] h-10 px-4 rounded-xl text-sm font-medium"
          onClick={onCreateElection}
        >
          Tạo cuộc bầu cử
        </button>
      )}
    </header>
  );
}
