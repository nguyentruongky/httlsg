import type { ReactNode } from "react";
import {
  ELECTION_PHASE_LABELS,
  electionPhase,
  type ElectionPhase,
} from "@org/core";
import { cn } from "@org/ui";

const phases = Object.keys(ELECTION_PHASE_LABELS) as ElectionPhase[];
const descriptions: Record<ElectionPhase, string> = {
  draft:
    "Chọn nhận phiếu trực tuyến hoặc bắt đầu kiểm phiếu thủ công nếu chỉ dùng phiếu giấy.",
  online:
    "Đang nhận phiếu trực tuyến. Chuyển sang kiểm phiếu thủ công để đóng cổng nhận phiếu trực tuyến.",
  checking:
    "Đã đóng cổng trực tuyến. Kiểm phiếu viên nhập phiếu giấy và đối chiếu kết quả trước khi đóng bầu cử.",
  closed: "Đã đóng bầu cử. Kết quả được giữ lại để xem và xuất báo cáo.",
};
export function ElectionResultsHeader({
  title,
  status,
  phase,
  children,
}: {
  title: string;
  status: string;
  phase?: string;
  children?: ReactNode;
}) {
  const current = electionPhase({ status, phase });
  const index = phases.indexOf(current);
  return (
    <header className="space-y-5 rounded-2xl border-2 border-[#cfd2c9] bg-white p-5 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-[#1e211c] sm:text-3xl">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-[#60635b]">
            {descriptions[current]}
          </p>
        </div>
        {children}
      </div>
      <ol
        aria-label="Trạng thái bầu cử"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {phases.map((value, position) => (
          <li
            key={value}
            aria-current={value === current ? "step" : undefined}
            className={cn(
              "flex min-h-14 items-center gap-2 rounded-xl border px-3 py-2 text-sm",
              value === current
                ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-900"
                : "border-border bg-muted/30 text-muted-foreground",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs",
                position === index
                  ? "bg-emerald-700 text-white"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {position + 1}
            </span>
            {ELECTION_PHASE_LABELS[value]}
          </li>
        ))}
      </ol>
    </header>
  );
}
