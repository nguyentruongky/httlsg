import { electionPhase } from "@org/core";
import { Button } from "@org/ui";
import { Printer } from "lucide-react";
import type { Round } from "./types";

interface RoundSelectorProps {
  rounds: Round[];
  round: Round;
  onChange: (round: Round) => void;
}

export function RoundSelector({ rounds, round, onChange }: RoundSelectorProps) {
  if (rounds.length <= 1) return null;

  return (
    <label className="block text-sm">
      Cuộc bầu cử được phân công
      <select
        className="mt-2 block min-h-11 w-full rounded-lg border bg-background p-2"
        value={round.id}
        onChange={(e) => {
          const r = rounds.find((x) => x.id === Number(e.target.value));
          if (r) onChange(r);
        }}
      >
        {rounds.map((r) => (
          <option key={r.id} value={r.id}>
            {r.election_name} · #{r.election_id} · {electionPhase(r)}
          </option>
        ))}
      </select>
    </label>
  );
}
