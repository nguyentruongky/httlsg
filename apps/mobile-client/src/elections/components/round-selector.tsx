import type { ElectionRound } from "../domain/types";
import { electionPhaseFromRound } from "../domain";
import { ELECTION_PHASE_LABELS } from "../domain/types";

interface RoundSelectorProps {
  rounds: ElectionRound[];
  currentRoundId: number;
  onChange: (roundId: number) => void;
}

export function RoundSelector({
  rounds,
  currentRoundId,
  onChange,
}: RoundSelectorProps) {
  if (rounds.length <= 1) return null;

  return (
    <label className="block text-sm">
      <span className="font-medium">Vòng bầu cử</span>
      <select
        className="mt-2 block min-h-10 w-full rounded-lg border border-[#e2e0d8] bg-[#f8f7f3] px-3 py-1.5 text-sm text-[#1c1b18] focus:border-[#215e3d] focus:outline-none"
        value={currentRoundId}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {rounds.map((r) => (
          <option key={r.id} value={r.id}>
            Bầu cử #{r.election_id} ·{" "}
            {ELECTION_PHASE_LABELS[electionPhaseFromRound(r)]}
          </option>
        ))}
      </select>
    </label>
  );
}
