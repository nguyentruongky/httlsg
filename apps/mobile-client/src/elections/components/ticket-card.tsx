import type { ElectionTicket } from "../domain/types";

interface TicketCardProps {
  ticket: ElectionTicket;
  admin: boolean;
  onAction: (requestOnly: boolean, reason: string) => void;
}

export function TicketCard({ ticket, admin, onAction }: TicketCardProps) {
  const candidateNames = ticket.candidates
    .map((c) => `#${c.candidate_no} ${c.full_name}`)
    .join(", ");

  const isOnline = ticket.source === "online";

  return (
    <div className="rounded-xl border border-[#e6e4dd] bg-white p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-[#1c1b18]">
          Phiếu #{ticket.team_ticket_no ?? ticket.seq_no}
        </span>
        <span className="text-xs text-[#6b6963]">
          {ticket.sync_state === "synced"
            ? "Đồng bộ"
            : ticket.sync_state === "pending"
              ? "Chờ đồng bộ"
              : "Lỗi"}
        </span>
      </div>
      <div className="space-y-1">
        {ticket.candidates.map((c, i) => (
          <div key={i} className="text-sm">
            #{c.candidate_no} {c.full_name}
          </div>
        ))}
      </div>
      <p className="text-xs text-[#6b6963]">
        {new Date(ticket.created_at).toLocaleString("vi-VN")}
      </p>
      {admin && (
        <button
          type="button"
          onClick={() => onAction(false, "")}
          className="text-red-600 hover:text-red-700 text-sm font-medium w-full text-left"
        >
          Hủy phiếu
        </button>
      )}
    </div>
  );
}
