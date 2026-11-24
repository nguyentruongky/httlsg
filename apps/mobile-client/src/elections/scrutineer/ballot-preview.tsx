import { MAX_ELECTION_SELECTIONS, type ElectionCandidate } from "@org/core";
import { X } from "lucide-react";
import { entryPanel } from "./styles";
export function BallotPreview({
  candidates,
  disabled,
  onRemove,
}: {
  candidates: ElectionCandidate[];
  disabled: boolean;
  onRemove: (id: number) => void;
}) {
  const over = candidates.length > MAX_ELECTION_SELECTIONS;
  return (
    <section
      className={`${entryPanel} flex h-[clamp(20rem,45dvh,32rem)] min-h-0 min-w-0 flex-col overflow-hidden p-4 sm:p-6 lg:h-full`}
      aria-labelledby="ballot-preview"
    >
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e2da] pb-5">
        <h2
          id="ballot-preview"
          className="break-all font-mono text-sm font-bold sm:text-base"
        >
          Phiếu tiếp theo
        </h2>
        <strong className={`tabular-nums ${over ? "text-red-700" : ""}`}>
          {candidates.length} / {MAX_ELECTION_SELECTIONS}
        </strong>
      </header>
      <p className="mt-2 shrink-0 text-xs text-[#929087]">
        Số phiếu được cấp sau khi lưu và đồng bộ.
      </p>
      {over && (
        <p
          role="alert"
          className="mt-4 shrink-0 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          Phiếu sẽ được lưu không hợp lệ vì chọn quá {MAX_ELECTION_SELECTIONS}{" "}
          ứng viên.
        </p>
      )}
      {!candidates.length ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-2 py-6 text-center">
          <p className="text-lg font-medium text-[#60605a]">
            Chưa chọn ứng viên nào cho phiếu này
          </p>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#929087] sm:text-base">
            Nhấp vào tên bên trái, gõ -vị trí + Enter, hoặc bấm{" "}
            <strong>Phiếu trắng</strong> bên dưới.
          </p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-[#eeece5] overflow-y-auto overscroll-contain">
          {candidates.map((candidate) => (
            <li
              key={candidate.id}
              className="flex min-h-16 items-center gap-3 py-3"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#e4e2da] bg-[#f8f7f3] text-base font-semibold tabular-nums text-[#60605a]">
                {candidate.candidate_no}
              </span>
              <span className="min-w-0 flex-1 font-medium">
                {candidate.full_name}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemove(candidate.id)}
                aria-label={`Bỏ chọn ${candidate.full_name}`}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-[#77756d] hover:bg-[#f8f7f3]"
              >
                <X size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
