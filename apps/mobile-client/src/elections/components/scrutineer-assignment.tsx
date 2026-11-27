import type { ElectionCandidate } from "../domain/types";

interface ScrutineerAssignmentProps {
  scrutineers: { id: string; full_name: string }[];
  assignedIds: string[];
  onToggle: (id: string) => void;
  candidates: ElectionCandidate[];
  selectedCandidateIds: number[];
  onCandidateToggle: (id: number) => void;
  onSave: () => void;
  loading?: boolean;
}

export function ScrutineerAssignment({
  scrutineers,
  assignedIds,
  onToggle,
  candidates,
  selectedCandidateIds,
  onCandidateToggle,
  onSave,
  loading = false,
}: ScrutineerAssignmentProps) {
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-[#1c1b18]">
          Người nhập phiếu
        </legend>
        {scrutineers.map((s) => (
          <label key={s.id} className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={assignedIds.includes(s.id)}
              onChange={() => onToggle(s.id)}
              className="h-4 w-4 text-[#215e3d] border-[#e6e4dd] focus:ring-2 focus:ring-[#215e3d]/20"
            />
            {s.full_name}
          </label>
        ))}
      </fieldset>

      <details className="rounded-lg border border-[#e6e4dd] bg-[#f8f7f3] p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Ứng viên ({selectedCandidateIds.length})
        </summary>
        <div className="mt-2 space-y-1">
          {candidates.map((c) => (
            <label key={c.id} className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={selectedCandidateIds.includes(c.id)}
                onChange={() => onCandidateToggle(c.id)}
                className="h-4 w-4 text-[#215e3d] border-[#e6e4dd] focus:ring-2 focus:ring-[#215e3d]/20"
              />
              #{c.candidate_no} · {c.full_name}
            </label>
          ))}
        </div>
      </details>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="border-[#e6e4dd] bg-white text-[#1c1b18] hover:bg-[#f2f0e8] h-10 px-4 rounded-xl text-sm font-medium"
          onClick={onSave}
          disabled={loading}
        >
          Lưu phân công và ứng viên
        </button>
      </div>
    </div>
  );
}
