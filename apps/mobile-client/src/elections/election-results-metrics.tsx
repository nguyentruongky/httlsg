import type { ReactNode } from "react";
import {
  Vote,
  Ban,
  CircleCheck,
  CircleX,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { ElectionStatCard } from "./election-stat-card";
import {
  electionSummaryMetrics,
  type ElectionMetricId,
} from "./domain/summary-metrics";
import type { ElectionSummary } from "./domain/types";

const icons: Record<ElectionMetricId, LucideIcon> = {
  received: Vote,
  void: Ban,
  valid: CircleCheck,
  invalid: CircleX,
  blank: FileText,
};

/** The caller owns saving the counted-ballot total; this panel only renders. */
export function ElectionResultsMetrics({
  summary,
  countedBallots,
}: {
  summary: Partial<ElectionSummary>;
  countedBallots?: ReactNode;
}) {
  return (
    <dl className="grid grid-cols-3 gap-3 sm:gap-4">
      {countedBallots}
      {electionSummaryMetrics(summary).map(({ id, ...metric }) => (
        <ElectionStatCard key={id} {...metric} icon={icons[id]} />
      ))}
    </dl>
  );
}
