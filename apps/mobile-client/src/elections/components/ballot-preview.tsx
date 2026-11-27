import type { ElectionCandidate } from "../domain/types";

interface BallotPreviewProps {
  selectedCandidates: ElectionCandidate[];
  onRemove: (id: number) => void;
  disabled?: boolean;
}

export function BallotPreview({
  selectedCandidates,
  onRemove,
  disabled = false,
}: BallotPreviewProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-[#1c1b18]">
        Phiếu dự kiến ({selectedCandidates.length})
      </h3>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {selectedCandidates.length === 0 ? (
          <p className="text-sm text-[#6b6963] text-center py-4">
            Chưa chọn ứng viên nào
          </p>
        ) : (
          selectedCandidates.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 px-2 py-2 rounded-lg bg-[#f8f7f3] border border-[#e6e4dd]"
            >
              <span className="flex-1 min-w-0 text-sm font-medium text-[#1c1b18] truncate">
                #{c.candidate_no} {c.full_name}
              </span>
              <button
                type="button"
                onClick={() => onRemove(c.id)}
                disabled={disabled}
                className="text-red-600 hover:text-red-700 font-medium text-sm"
                aria-label={`Bỏ chọn ${c.full_name}`}
              >
                Bỏ chọn
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
