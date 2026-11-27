import { useElectionUIStore } from "../store";
import type { ElectionCandidate } from "../domain/types";
import { searchElectionCandidates } from "../domain";

interface CandidateListProps {
  candidates: ElectionCandidate[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  maxSelections?: number;
  showCheckboxes?: boolean;
}

export function CandidateList({
  candidates,
  selectedIds,
  onToggle,
  searchQuery,
  onSearchChange,
  maxSelections = 10,
  showCheckboxes = true,
}: CandidateListProps) {
  const { candidateSearchQuery, setCandidateSearchQuery } =
    useElectionUIStore();

  const query = searchQuery ?? candidateSearchQuery;
  const handleSearchChange = onSearchChange ?? setCandidateSearchQuery;

  const filtered = searchElectionCandidates(candidates, query);

  return (
    <div className="space-y-2">
      <input
        type="search"
        placeholder="Tìm ứng viên..."
        value={query}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="min-h-10 rounded-lg border border-[#e2e0d8] bg-[#f8f7f3] px-3 py-1.5 text-sm text-[#1c1b18] focus:border-[#215e3d] focus:outline-none w-full"
      />
      <p className="text-xs text-[#6b6963]">
        {filtered.length} ứng viên
        {selectedIds.length > 0 ? ` · Đã chọn ${selectedIds.length}` : ""}
      </p>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {filtered.map((c) => (
          <label
            key={c.id}
            className={`flex min-h-11 items-center gap-2 cursor-pointer ${
              selectedIds.includes(c.id) ? "bg-[#edf4ed]" : ""
            }`}
            onClick={() => onToggle(c.id)}
          >
            {showCheckboxes && (
              <input
                type="checkbox"
                checked={selectedIds.includes(c.id)}
                onChange={() => onToggle(c.id)}
                className="h-4 w-4 text-[#215e3d] border-[#e6e4dd] focus:ring-2 focus:ring-[#215e3d]/20"
              />
            )}
            <span className="flex-1 min-w-0 text-sm font-medium text-[#1c1b18] truncate">
              #{c.candidate_no} {c.full_name}
            </span>
            {selectedIds.length >= 10 && !selectedIds.includes(c.id) && (
              <span className="text-xs text-[#6b6963]">Tối đa</span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
