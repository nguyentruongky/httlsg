import { electionSummaryMetrics } from "../domain/summary-metrics";
interface MetricCardProps {
  label: string;
  value: number;
  icon?: React.ReactNode;
  hint?: string;
  valid?: boolean;
}

export function MetricCard({
  label,
  value,
  icon,
  hint,
  valid,
}: MetricCardProps) {
  return (
    <div className="rounded-xl border-2 border-[#cfd2c9] bg-white p-4 shadow-none">
      {icon && <div className="text-[#215e3d] mb-2">{icon}</div>}
      <p className="text-sm text-[#5c5a54]">{label}</p>
      <strong
        className={`text-xl font-bold text-[#1e211c] ${valid ? "text-[#215e3d]" : ""}`}
      >
        {value}
      </strong>
      {hint && <p className="text-xs text-[#6b6963] mt-1">{hint}</p>}
    </div>
  );
}

interface MetricsPanelProps {
  summary: {
    received: number;
    valid: number;
    invalid: number;
    blank: number;
    void: number;
    over_limit: number;
    counted_ballots: number;
    paper: number;
    online: number;
    average: number;
  };
  countedBallots?: number;
  onCountedBallotsChange?: (count: number) => void;
  editable?: boolean;
}

export function MetricsPanel({
  summary,
  countedBallots,
  onCountedBallotsChange,
  editable = false,
}: MetricsPanelProps) {
  const metrics = electionSummaryMetrics(summary);

  return (
    <dl className="grid grid-cols-3 gap-3 sm:gap-4">
      {editable && (
        <div className="rounded-xl border-2 border-[#cfd2c9] bg-white p-4 shadow-none">
          <p className="text-sm text-[#5c5a54]">Phiếu đã kiểm</p>
          <input
            type="number"
            min={0}
            value={countedBallots ?? 0}
            onChange={(e) => onCountedBallotsChange?.(Number(e.target.value))}
            className="mt-1 w-full h-11 rounded-lg border border-[#e2e0d8] bg-white px-3 text-base text-[#1c1b18] focus:border-[#215e3d] focus:outline-none"
          />
        </div>
      )}
      {metrics.map((metric) => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </dl>
  );
}
