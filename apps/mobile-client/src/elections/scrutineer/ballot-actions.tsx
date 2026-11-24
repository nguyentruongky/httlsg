import { MAX_ELECTION_SELECTIONS } from "@org/core";
import { Button } from "@org/ui";
import { entryPanel, entryPrimary } from "./styles";
export function BallotActions({
  count,
  disabled,
  saving,
  onBlank,
  onInvalid,
  onSave,
}: {
  count: number;
  disabled: boolean;
  saving: boolean;
  onBlank: () => void;
  onInvalid: () => void;
  onSave: () => void;
}) {
  return (
    <footer
      className={`${entryPanel} sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 flex shrink-0 flex-wrap items-center justify-between gap-4 p-4 sm:p-6 lg:static`}
    >
      <p role="status" className="text-base text-[#60605a]">
        <strong className="text-[#20211d]">
          {count} / {MAX_ELECTION_SELECTIONS}
        </strong>
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={disabled}
          onClick={onBlank}
          className="min-h-12 rounded-xl border-[#e4e2da] bg-white px-5 text-base shadow-none"
        >
          Phiếu trắng (-pt)
        </Button>
        <Button
          variant="outline"
          disabled={disabled}
          onClick={onInvalid}
          className="min-h-12 rounded-xl border-[#e4e2da] bg-white px-5 text-base shadow-none"
        >
          Phiếu bất hợp lệ (-bhl)
        </Button>
        <Button
          disabled={disabled || count === 0}
          onClick={onSave}
          className={entryPrimary}
        >
          {saving ? "Đang lưu…" : "Lưu phiếu (-s)"}
        </Button>
      </div>
    </footer>
  );
}
