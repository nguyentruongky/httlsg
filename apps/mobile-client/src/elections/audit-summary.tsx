import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Globe,
  Users,
  Wifi,
} from "lucide-react";
import type { AuditData } from "./audit-types";
import { ElectionStatCard } from "./election-stat-card";
export function AuditSummary({
  data,
  onInvalid,
}: {
  data: AuditData;
  onInvalid: () => void;
}) {
  const connection = data.connections.summary;
  const submission = data.submissions.summary;
  const cards = [
    { label: "Thiết bị kết nối", value: connection.total, icon: Wifi },
    { label: "Kết nối hợp lệ", value: connection.valid, icon: CheckCircle2 },
    {
      label: "Kết nối không hợp lệ",
      value: connection.invalid,
      icon: AlertTriangle,
    },
    { label: "Tổng phiếu đã gửi", value: submission.total, icon: FileCheck2 },
    { label: "Phiếu từ các tổ", value: submission.paper, icon: Users },
    { label: "Phiếu trực tuyến", value: submission.online, icon: Globe },
  ];
  return (
    <>
      <dl className="grid grid-cols-3 gap-3 sm:gap-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <ElectionStatCard
            key={label}
            label={label}
            value={value}
            icon={Icon}
          />
        ))}
      </dl>
      <p className="text-sm text-stone-500">
        Kết nối tính theo thiết bị, lấy trạng thái mới nhất.{" "}
        {connection.pending} thiết bị đang kiểm tra. Số phiếu gồm cả phiếu đã
        hủy.
      </p>
      {connection.invalid > 0 && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-4 rounded-xl border-2 border-red-300 bg-red-50 p-5 text-red-950"
        >
          <AlertTriangle
            size={32}
            className="shrink-0 text-red-600"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold">
              {connection.invalid} thiết bị không đủ điều kiện kết nối
            </h2>
            <p className="mt-1 text-sm">
              {connection.invalid_recent} thiết bị trong 15 phút gần đây. Kiểm
              tra nguyên nhân để hỗ trợ người tham gia.
            </p>
          </div>
          <button
            type="button"
            onClick={onInvalid}
            className="min-h-11 rounded-lg border border-red-300 bg-white px-4 font-semibold text-red-800"
          >
            Xem kết nối lỗi
          </button>
        </div>
      )}
    </>
  );
}
