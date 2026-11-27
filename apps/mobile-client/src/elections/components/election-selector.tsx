import { useElectionUIStore } from "../store";
import type { Election } from "../domain/types";

interface ElectionSelectorProps {
  elections: { id: number; name: string }[];
  selected: number;
  onChange: (id: number) => void;
  detail?: any;
  roundId?: number;
  onRoundChange?: (id: number) => void;
}

export function ElectionSelector({
  elections,
  selected,
  onChange,
  detail,
  roundId,
  onRoundChange,
}: ElectionSelectorProps) {
  const { candidateSearchQuery, setCandidateSearchQuery } =
    useElectionUIStore();

  return (
    <div className="space-y-3">
      <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
        <span>Cuộc bầu cử</span>
        <select
          className="min-h-10 rounded-lg border border-[#e2e0d8] bg-[#f8f7f3] px-3 py-1.5 text-sm text-[#1c1b18] focus:border-[#215e3d] focus:outline-none"
          value={selected}
          onChange={(e) => {
            onChange(Number(e.target.value));
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
          <span>Vòng bầu cử</span>
          <select
            className="min-h-10 rounded-lg border border-[#e2e0d8] bg-[#f8f7f3] px-3 py-1.5 text-sm text-[#1c1b18] focus:border-[#215e3d] focus:outline-none"
            value={roundId}
            onChange={(e) => onRoundChange?.(Number(e.target.value))}
          >
            <option value={0}>Chọn bầu cử</option>
            {detail.rounds?.map((r: any) => (
              <option key={r.id} value={r.id}>
                Bầu cử #{r.election_id} ·{" "}
                {r.status === "draft"
                  ? "Chưa bắt đầu"
                  : r.status === "open"
                    ? "Đang mở"
                    : "Đã đóng"}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
