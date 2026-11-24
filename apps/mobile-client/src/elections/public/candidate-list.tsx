import type { PublicElectionCandidate } from "@org/core";
import { Check } from "lucide-react";
export function PublicCandidateList({
  candidates,
  selected,
  busy,
  atLimit,
  onToggle,
  selectedOnly,
}: {
  candidates: PublicElectionCandidate[];
  selected: number[];
  busy: boolean;
  atLimit: boolean;
  onToggle: (id: number) => void;
  selectedOnly: boolean;
}) {
  if (!candidates.length)
    return (
      <p className="px-5 py-12 text-center text-sm text-[#777368]">
        {selectedOnly
          ? "Bạn chưa chọn ứng viên nào. Chuyển sang tab Ứng viên để chọn."
          : "Không tìm thấy ứng viên phù hợp."}
      </p>
    );
  return (
    <ul className="divide-y divide-[#eeece5]">
      {candidates.map((candidate) => {
        const checked = selected.includes(candidate.id);
        return (
          <li
            key={candidate.id}
            className={`flex min-h-20 items-center gap-3 px-4 py-3 sm:gap-4 ${checked ? "bg-[#f0f6f0]" : "bg-white"}`}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#e6e4dd] bg-[#f8f7f3] text-sm font-semibold tabular-nums text-[#777368]">
              {candidate.order}
            </span>
            <div className="min-w-0 flex-1">
              <p className="wrap-break-word font-semibold leading-snug">
                {candidate.fullName}
              </p>
              <p className="mt-1 wrap-break-word text-xs leading-relaxed text-[#777368] sm:text-sm">
                {candidate.description}
              </p>
            </div>
            <button
              type="button"
              aria-pressed={checked}
              aria-label={`${checked ? "Bỏ chọn" : "Chọn"} ${candidate.fullName}`}
              disabled={busy || (!checked && atLimit)}
              onClick={() => onToggle(candidate.id)}
              className={`flex size-11 shrink-0 items-center justify-center rounded-full border-2 disabled:opacity-40 ${checked ? "border-[#215e3d] bg-[#215e3d] text-white" : "border-[#dddcd3] bg-white text-transparent"}`}
            >
              <Check size={22} aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
