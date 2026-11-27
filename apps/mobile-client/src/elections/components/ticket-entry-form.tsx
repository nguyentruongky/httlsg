import { useElectionUIStore } from "../store";
import type { ElectionCandidate } from "../domain/types";
import { searchElectionCandidates } from "../domain";
import { electionCommand } from "../domain/types";

interface TicketEntryFormProps {
  candidates: ElectionCandidate[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onSearchChange?: (query: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  onCommand?: (command: { type: string; position?: number }) => void;
  saving?: boolean;
  ready?: boolean;
  hint?: string;
  maxSelections?: number;
}

export function TicketEntryForm({
  candidates,
  selectedIds,
  onToggle,
  onSearchChange,
  onSubmit,
  onClear,
  onCommand,
  saving = false,
  ready = false,
  hint,
  maxSelections = 10,
}: TicketEntryFormProps) {
  const { candidateSearchQuery, setCandidateSearchQuery } =
    useElectionUIStore();

  const query = candidateSearchQuery;
  const handleSearchChange = onSearchChange ?? setCandidateSearchQuery;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const cmd = electionCommand(query);
      if (cmd.type === "submit") {
        onSubmit();
      } else if (cmd.type === "clear") {
        onClear();
      } else if (cmd.type === "toggle" && cmd.position !== undefined) {
        // Toggle by position in filtered list
      } else if (onCommand) {
        onCommand(cmd);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="search"
          placeholder="Nhập số thứ tự, tên hoặc -s để gửi, -clear để xóa"
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving || !ready}
          className="min-h-10 rounded-lg border border-[#e2e0d8] bg-white px-3 py-2 text-sm text-[#1c1b18] placeholder:text-[#9a9891] focus:border-[#215e3d] focus:outline-none w-full pr-10"
        />
        {query && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6963] hover:text-[#1c1b18]"
            aria-label="Xóa tìm kiếm"
          >
            ✕
          </button>
        )}
      </div>

      {hint && <p className="text-xs text-[#6b6963]">{hint}</p>}

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {candidates
          .filter((c) => searchElectionCandidates([c], query).length > 0)
          .slice(0, 5)
          .map((c) => (
            <label
              key={c.id}
              className={`flex min-h-11 items-center gap-2 cursor-pointer ${
                selectedIds.includes(c.id) ? "bg-[#edf4ed]" : ""
              }`}
              onClick={() => onToggle(c.id)}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(c.id)}
                onChange={() => onToggle(c.id)}
                className="h-4 w-4 text-[#215e3d] border-[#e6e4dd] focus:ring-2 focus:ring-[#215e3d]/20"
              />
              <span className="flex-1 min-w-0 text-sm font-medium text-[#1c1b18] truncate">
                #{c.candidate_no} {c.full_name}
              </span>
              {selectedIds.length >= 10 && !selectedIds.includes(c.id) && (
                <span className="text-xs text-[#6b6963]">Tối đa</span>
              )}
            </label>
          ))}
        {!query && candidates.length > 0 && (
          <p className="text-xs text-[#6b6963] text-center py-2">
            Nhập từ khóa để lọc ứng viên
          </p>
        )}
        {query && candidates.length > 0 && (
          <p className="text-xs text-[#6b6963] text-center py-2">
            Không tìm thấy ứng viên phù hợp
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving || !ready || selectedIds.length === 0}
          className="flex-1 bg-[#215e3d] text-white hover:bg-[#19492f] border-[#215e3d] h-10 px-4 rounded-xl text-sm font-medium"
        >
          {saving ? "Đang gửi…" : "Gửi phiếu"}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={saving || selectedIds.length === 0}
          className="flex-1 border-[#e6e4dd] bg-white text-[#1c1b18] hover:bg-[#f2f0e8] h-10 px-4 rounded-xl text-sm font-medium"
        >
          Xóa lựa chọn
        </button>
      </div>
    </div>
  );
}
