import { PUBLIC_CONNECTION_REASON_LABELS } from "@org/core";
import { TicketStatusBadge } from "./ticket-status-badge";
import type { ActivityLog, ConnectionLog, SubmissionLog } from "./audit-types";

const time = (value: string) => new Date(value).toLocaleString("vi-VN");
const row =
  "flex flex-wrap items-start justify-between gap-3 border-b border-[#e6e4dd] p-4 last:border-0";
const muted = "mt-1 text-sm text-stone-500";
export function ConnectionLogs({ items }: { items: ConnectionLog[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} className={row}>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Thiết bị {item.device_number}</p>
            {item.reason && (
              <p
                className={`mt-1 text-sm ${item.status === "invalid" ? "text-red-700" : "text-stone-600"}`}
              >
                {PUBLIC_CONNECTION_REASON_LABELS[item.reason] ??
                  "Chưa xác nhận được điều kiện tham gia"}
              </p>
            )}
            <p className={muted}>{time(item.started_at)}</p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${item.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : item.status === "invalid" ? "border-red-200 bg-red-50 text-red-800" : "border-stone-200 bg-stone-50 text-stone-600"}`}
          >
            {item.status === "success"
              ? "Hợp lệ"
              : item.status === "invalid"
                ? "Không hợp lệ"
                : "Đang kiểm tra"}
          </span>
        </li>
      ))}
    </ul>
  );
}
export function SubmissionLogs({ items }: { items: SubmissionLog[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} className={row}>
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {item.source === "online" ? "Trực tuyến" : item.team_name} · Phiếu{" "}
              {item.ticket_number}
            </p>
            <p className="mt-1 text-sm text-stone-600">
              {item.scrutineer_name ? `${item.scrutineer_name} · ` : ""}
              {item.selection_count} lựa chọn
            </p>
            <p className={muted}>{time(item.submitted_at)}</p>
          </div>
          <TicketStatusBadge ticket={item} />
        </li>
      ))}
    </ul>
  );
}
const actions: Record<string, string> = {
  election_created: "Tạo cuộc bầu cử",
  election_archived: "Lưu trữ cuộc bầu cử",
  round_prepared: "Chuẩn bị bầu cử",
  round_configured: "Cập nhật cấu hình",
  round_opened: "Bắt đầu bầu cử",
  round_closed: "Kết thúc bầu cử",
  round_started: "Bắt đầu bầu cử",
  round_stopped: "Kết thúc bầu cử",
  round_reopened: "Mở lại bầu cử",
  ticket_void_requested: "Yêu cầu hủy phiếu",
  ticket_voided: "Hủy phiếu",
  counted_ballots_updated: "Cập nhật số phiếu đếm được",
  online_voting_toggled: "Thay đổi cho phép bỏ phiếu trực tuyến",
  public_session_configured: "Cập nhật địa điểm bầu cử",
  scrutineer_team_created: "Thêm tổ kiểm phiếu",
  scrutineer_team_reordered: "Sắp xếp tổ kiểm phiếu",
  scrutineer_team_member_added: "Thêm kiểm phiếu viên",
  scrutineer_team_member_removed: "Xóa kiểm phiếu viên",
  login: "Đăng nhập",
  logout: "Đăng xuất",
};
export function ActivityLogs({ items }: { items: ActivityLog[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} className={row}>
          <div>
            <p className="font-medium">
              {actions[item.action] ?? item.action.replaceAll("_", " ")}
            </p>
            <p className={muted}>
              {item.full_name ?? "Hệ thống"} · {time(item.created_at)}
            </p>
            {item.action === "ticket_voided" && (
              <p className="mt-1 text-sm text-stone-600">
                {item.payload.source === "online"
                  ? "Phiếu trực tuyến"
                  : "Phiếu giấy"}{" "}
                · Đã loại khỏi kết quả
              </p>
            )}
            {typeof item.payload.reason === "string" && (
              <p className="mt-2 text-sm text-stone-600">
                Lý do: {item.payload.reason}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
