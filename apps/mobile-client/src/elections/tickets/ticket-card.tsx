import { TicketNumber } from "./ticket-number";
import { Badge } from "@org/ui";
import { TicketStatusBadge } from "../ticket-status-badge";
import { TicketCandidates } from "./ticket-candidates";
import { TicketCardAction } from "./ticket-card-action";
import type { TicketCardData } from "./ticket-card-types";
export function TicketCard({
  ticket,
  admin,
  onAction,
}: {
  ticket: TicketCardData;
  admin: boolean;
  onAction: (requestOnly: boolean, reason: string) => Promise<void>;
}) {
  const synced = ticket.sync_state === "synced";
  const rejected = ticket.sync_state === "rejected";
  const timestamp = new Date(ticket.created_at).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return (
    <article
      aria-label={`Phiếu ${ticket.team_ticket_no ?? ticket.seq_no}`}
      className="flex h-full min-w-0 flex-col rounded-xl border border-[#e6e4dd] bg-white p-4 text-[#1c1b18] shadow-none"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3>
            <TicketNumber
              number={ticket.team_ticket_no ?? ticket.seq_no}
              code={ticket.ticket_code}
              voided={ticket.status === "void"}
            />
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TicketStatusBadge ticket={ticket} />
            {admin && ticket.source !== "online" && (
              <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800">
                {ticket.team_name ?? "Tổ kiểm phiếu"}
              </Badge>
            )}
            <Badge
              className={`rounded-full px-2.5 py-1 ${ticket.source === "online" ? "border-sky-200 bg-sky-50 text-sky-800" : "border-stone-200 bg-stone-100 text-stone-700"}`}
            >
              {ticket.source === "online" ? "Trực tuyến" : "Phiếu giấy"}
            </Badge>
            <Badge
              className={`rounded-full px-2.5 py-1 ${synced ? "border-[#dce7dc] bg-[#f1f6ef] text-[#215e3d]" : rejected ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}
            >
              {synced ? "Đã đồng bộ" : rejected ? "Bị từ chối" : "Chờ đồng bộ"}
            </Badge>
            <time dateTime={ticket.created_at}>{timestamp}</time>
          </div>
        </div>
        {ticket.id &&
          (admin || ticket.source !== "online") &&
          ticket.status !== "void" && (
            <TicketCardAction admin={admin} onAction={onAction} />
          )}
      </header>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-[#eeece5] pb-3 text-md leading-relaxed text-[#777368]">
        {ticket.candidates.length > 0 && (
          <span className="tabular-nums">
            {ticket.candidates.length} ứng viên
          </span>
        )}
      </div>
      <div className="flex-1 pt-4">
        <TicketCandidates ticket={ticket} />
      </div>
      {ticket.rejection && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700"
        >
          {ticket.rejection}
        </p>
      )}
      {(ticket.void_reason || ticket.void_requested_reason) && (
        <p className="mt-3 border-t border-[#eeece5] pt-3 text-xs leading-relaxed text-[#777368]">
          {ticket.void_reason
            ? `Lý do hủy: ${ticket.void_reason}`
            : `Yêu cầu hủy: ${ticket.void_requested_reason}`}
        </p>
      )}
    </article>
  );
}
