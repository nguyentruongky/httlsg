import type { ElectionCandidate } from "@org/core";
import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { entryPanel } from "./styles";
export function CandidateResults({
  candidates,
  selected,
  disabled,
  onToggle,
  scrollResetKey,
}: {
  candidates: ElectionCandidate[];
  selected: number[];
  disabled: boolean;
  onToggle: (id: number) => void;
  scrollResetKey: number;
}) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (list.current) list.current.scrollTop = 0;
  }, [scrollResetKey]);
  return (
    <section
      className={`${entryPanel} flex h-[clamp(20rem,45dvh,32rem)] min-h-0 min-w-0 flex-col overflow-hidden p-4 sm:p-6 lg:h-full`}
      aria-labelledby="found-candidates"
    >
      <header className="shrink-0 mb-2 flex items-center justify-between gap-3 border-b border-[#e4e2da] pb-5">
        <h2 id="found-candidates" className="text-xl font-bold">
          Ứng viên tìm thấy
        </h2>
        <span className="text-sm text-[#60605a]">
          {candidates.length} ứng viên
        </span>
      </header>
      <div
        ref={list}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {candidates.map((candidate, index) => {
          const checked = selected.includes(candidate.id);
          return (
            <button
              key={candidate.id}
              type="button"
              aria-pressed={checked}
              disabled={disabled}
              onClick={() => onToggle(candidate.id)}
              className="flex min-h-17 w-full items-center gap-4 border-b border-[#eeece5] px-2 py-3 text-left last:border-b-0 hover:bg-[#f8f7f3] hover:rounded-2xl disabled:cursor-wait"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#e4e2da] bg-[#f8f7f3] text-base font-semibold tabular-nums text-[#60605a]">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 text-base font-medium sm:text-lg">
                {candidate.full_name}
              </span>
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${checked ? "border-[#21633f] bg-[#21633f] text-white" : "border-[#deddd5]"}`}
                aria-hidden="true"
              >
                {checked && <Check size={17} />}
              </span>
            </button>
          );
        })}
        {!candidates.length && (
          <p className="py-12 text-center text-[#77756d]">
            Không tìm thấy ứng viên phù hợp.
          </p>
        )}
      </div>
    </section>
  );
}
