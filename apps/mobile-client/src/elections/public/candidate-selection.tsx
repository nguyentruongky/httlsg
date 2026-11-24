import {
  MAX_ELECTION_SELECTIONS,
  matchesElectionName,
  type PublicElectionSession,
} from "@org/core";
import { Button, Input } from "@org/ui";
import { PublicCandidateList } from "./candidate-list";
import { PublicSelectionTabs } from "./selection-tabs";
export function PublicCandidateSelection({
  session,
  selected,
  tab,
  onTab,
  query,
  onQuery,
  busy,
  offline,
  onToggle,
  onSubmit,
}: {
  session: PublicElectionSession;
  selected: number[];
  tab: "candidates" | "selected";
  onTab: (value: "candidates" | "selected") => void;
  query: string;
  onQuery: (value: string) => void;
  busy: boolean;
  offline: boolean;
  onToggle: (id: number) => void;
  onSubmit: () => void;
}) {
  const candidates = session.candidates.filter((candidate) =>
    tab === "selected"
      ? selected.includes(candidate.id)
      : /^\d+$/.test(query.trim())
        ? candidate.order === Number(query.trim())
        : matchesElectionName(candidate.fullName, query),
  );
  return (
    <div className="space-y-4 pb-28">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-xl border border-[#d9e5d8] bg-[#f0f6ef] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[#215e3d]">
            Lựa chọn của bạn
          </p>
          <p className="text-xs text-[#777368]">
            Có thể chọn tối đa {MAX_ELECTION_SELECTIONS} ứng viên
          </p>
        </div>
        <strong className="text-xl tabular-nums text-[#215e3d]">
          {selected.length} / {MAX_ELECTION_SELECTIONS}
        </strong>
      </div>
      {selected.length >= MAX_ELECTION_SELECTIONS && (
        <p role="status" className="text-sm text-amber-800">
          Đã đủ {MAX_ELECTION_SELECTIONS} lựa chọn. Bỏ chọn một ứng viên nếu
          muốn thay đổi.
        </p>
      )}
      <PublicSelectionTabs tab={tab} onChange={onTab} count={selected.length}>
        {tab === "candidates" && (
          <div className="border-b border-[#eeece5] p-4">
            <Input
              aria-label="Tìm ứng viên"
              placeholder="Tìm theo tên hoặc số thứ tự…"
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              className="h-12 rounded-xl border-[#e6e4dd] bg-[#f8f7f3] shadow-none"
            />
          </div>
        )}
        <PublicCandidateList
          candidates={candidates}
          selected={selected}
          busy={busy}
          atLimit={selected.length >= MAX_ELECTION_SELECTIONS}
          onToggle={onToggle}
          selectedOnly={tab === "selected"}
        />
      </PublicSelectionTabs>
      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e6e4dd] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <span className="text-sm font-semibold tabular-nums">
            {selected.length} / {MAX_ELECTION_SELECTIONS}
          </span>
          {tab === "candidates" ? (
            <Button
              className="min-h-12 rounded-xl bg-[#215e3d] px-5 text-white hover:bg-[#19492f]"
              onClick={() => onTab("selected")}
            >
              Xem lại lựa chọn
            </Button>
          ) : (
            <Button
              disabled={busy || offline}
              className="min-h-12 rounded-xl bg-[#215e3d] px-5 text-white hover:bg-[#19492f]"
              onClick={onSubmit}
            >
              {busy
                ? "Đang xác thực và gửi…"
                : selected.length
                  ? "Gửi phiếu bầu"
                  : "Gửi phiếu trắng"}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
