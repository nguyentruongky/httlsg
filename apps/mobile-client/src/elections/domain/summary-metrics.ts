import type { ElectionSummary } from "./types";

export type ElectionMetricId =
  "received" | "void" | "valid" | "invalid" | "blank";

/** Shared display values; blank ballots remain separate from other invalid ballots. */
export function electionSummaryMetrics(summary: Partial<ElectionSummary>) {
  return [
    {
      id: "received",
      label: "Tổng số phiếu (đã nhập)",
      value: summary.received ?? 0,
      hint: `${summary.paper ?? 0} phiếu giấy · ${summary.online ?? 0} trực tuyến`,
    },
    {
      id: "void",
      label: "Phiếu đã hủy",
      value: summary.void ?? 0,
      hint: "Không tính vào kết quả",
    },
    { id: "valid", label: "Hợp lệ", value: summary.valid ?? 0, valid: true },
    {
      id: "invalid",
      label: "Phiếu bất hợp lệ",
      value: Math.max(
        0,
        Number(summary.invalid ?? 0) - Number(summary.blank ?? 0),
      ),
      hint: "",
    },
    { id: "blank", label: "Phiếu trắng", value: summary.blank ?? 0 },
  ] satisfies Array<{
    id: ElectionMetricId;
    label: string;
    value: number;
    hint?: string;
    valid?: boolean;
  }>;
}
