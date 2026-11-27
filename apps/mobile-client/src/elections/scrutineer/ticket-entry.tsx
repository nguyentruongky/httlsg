import { canCheckElection } from "@org/core";
import { useTicketEntry, type EntryProps } from "./use-ticket-entry";
import { EntrySearch } from "./entry-search";
import { CandidateResults } from "./candidate-results";
import { BallotPreview } from "./ballot-preview";
import { BallotActions } from "./ballot-actions";
export function TicketEntry(props: EntryProps) {
  const { electionType } = props;
  const entry = useTicketEntry(props);
  const needsTeam = electionType !== "department";
  const disabled =
    entry.saving ||
    !entry.ready ||
    (needsTeam && !entry.round.assignment?.team_id) ||
    !canCheckElection(entry.round);
  const selected = entry.selected.flatMap((id) => {
    const candidate = entry.candidates.find((item) => item.id === id);
    return candidate ? [candidate] : [];
  });
  return (
    <section
      className="flex min-h-0 flex-col gap-5 sm:gap-6 lg:flex-1"
      aria-label="Nhập phiếu kiểm phiếu"
    >
      {needsTeam && !entry.round.assignment?.team_id && (
        <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-900">
          Cần được phân công đúng tổ kiểm phiếu trước khi lưu phiếu.
        </p>
      )}
      {!canCheckElection(entry.round) && (
        <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-900">
          Chưa đến giai đoạn kiểm phiếu thủ công hoặc bầu cử đã đóng. Phiếu đã
          lưu trên thiết bị được giữ nguyên.
        </p>
      )}
      <EntrySearch
        value={entry.query}
        onChange={entry.changeQuery}
        onCommand={entry.command}
        inputRef={entry.input}
        disabled={entry.saving || !canCheckElection(entry.round)}
        hint={entry.hint}
      />
      <div className="grid min-h-0 items-stretch gap-5 lg:flex-1 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:gap-6">
        <CandidateResults
          candidates={entry.found}
          scrollResetKey={entry.scrollResetKey}
          selected={entry.selected}
          disabled={disabled}
          onToggle={entry.toggle}
        />
        <BallotPreview
          candidates={selected}
          disabled={disabled}
          onRemove={entry.toggle}
        />
      </div>
      <BallotActions
        count={entry.selected.length}
        disabled={disabled}
        saving={entry.saving}
        onBlank={entry.requestBlank}
        onInvalid={entry.requestInvalid}
        onSave={entry.save}
      />
    </section>
  );
}
