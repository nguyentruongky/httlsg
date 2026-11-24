import { useRef } from "react";
import type { ReactNode } from "react";
import { MAX_ELECTION_SELECTIONS } from "@org/core";
export function PublicSelectionTabs({
  tab,
  onChange,
  count,
  children,
}: {
  tab: "candidates" | "selected";
  onChange: (tab: "candidates" | "selected") => void;
  count: number;
  children: ReactNode;
}) {
  const start = useRef<{ x: number; y: number; time: number } | null>(null);
  return (
    <section className="overflow-hidden rounded-2xl border border-[#e6e4dd] bg-white">
      <div
        role="tablist"
        aria-label="Danh sách ứng viên"
        className="grid grid-cols-2 border-b border-[#e6e4dd]"
      >
        {(
          [
            ["candidates", "Ứng viên"],
            ["selected", `Đã chọn (${count}/${MAX_ELECTION_SELECTIONS})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            id={`public-tab-${value}`}
            type="button"
            role="tab"
            aria-selected={tab === value}
            aria-controls="public-candidate-panel"
            tabIndex={tab === value ? 0 : -1}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const target =
                event.key === "Home" || event.key === "ArrowLeft"
                  ? "candidates"
                  : "selected";
              onChange(target);
              document
                .getElementById(`public-tab-${target}`)
                ?.focus({ preventScroll: true });
            }}
            onClick={() => onChange(value)}
            className={`min-h-14 border-b-2 px-3 text-sm font-semibold ${tab === value ? "border-[#215e3d] text-[#215e3d]" : "border-transparent text-[#777368]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id="public-candidate-panel"
        role="tabpanel"
        aria-labelledby={`public-tab-${tab}`}
        className="touch-pan-y"
        onTouchStart={(event) => {
          if (event.touches.length !== 1) {
            start.current = null;
            return;
          }
          const touch = event.touches[0];
          start.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now(),
          };
        }}
        onTouchCancel={() => {
          start.current = null;
        }}
        onTouchEnd={(event) => {
          const origin = start.current;
          start.current = null;
          if (!origin || !event.changedTouches[0]) return;
          const touch = event.changedTouches[0];
          const x = touch.clientX - origin.x;
          const y = touch.clientY - origin.y;
          if (
            Date.now() - origin.time < 900 &&
            Math.abs(x) > 60 &&
            Math.abs(x) > Math.abs(y) * 1.5
          )
            onChange(x < 0 ? "selected" : "candidates");
        }}
      >
        {children}
      </div>
    </section>
  );
}
