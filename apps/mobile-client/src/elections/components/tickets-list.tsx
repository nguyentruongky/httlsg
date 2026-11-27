import type { ElectionTicket } from "../domain/types";

interface TicketsListProps {
  tickets: ElectionTicket[];
  admin: boolean;
  onAction: (
    ticket: ElectionTicket,
    requestOnly: boolean,
    reason: string,
  ) => void;
  teams?: { id: string; name: string; order: number }[];
  teamFilter?: string;
  onTeamFilterChange?: (team: string) => void;
}

export function TicketsList({
  tickets,
  admin,
  onAction,
  teams,
  teamFilter,
  onTeamFilterChange,
}: TicketsListProps) {
  const teamKey = (ticket: ElectionTicket): string =>
    ticket.source === "online" ? "online" : (ticket.team_id ?? "unassigned");

  const visibleTickets = tickets
    .filter((ticket) => teamFilter === "all" || teamKey(ticket) === teamFilter)
    .sort(
      (a, b) =>
        Number(a.team_ticket_no ?? a.seq_no) -
          Number(b.team_ticket_no ?? b.seq_no) ||
        (a.team_name ?? "Trực tuyến").localeCompare(
          b.team_name ?? "Trực tuyến",
          "vi",
          { numeric: true },
        ) ||
        String(a.client_uuid).localeCompare(String(b.client_uuid)),
    );

  const teamOptions = [
    { id: "all", name: "Tất cả" },
    ...(teams?.map((t) => ({ id: t.id, name: t.name })) ?? []),
  ];

  const renderTicket = (ticket: ElectionTicket) => (
    <div
      key={ticket.client_uuid}
      className="rounded-xl border border-[#e6e4dd] bg-white p-3 space-y-2"
    >
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
          onClick={() => onAction(ticket, false, "")}
          className="text-red-600 hover:text-red-700 text-sm font-medium"
        >
          Hủy phiếu
        </button>
      )}
    </div>
  );

  if (!admin) {
    return (
      <div className="space-y-3">
        {visibleTickets.map(renderTicket)}
        {!visibleTickets.length && (
          <p className="rounded-xl border border-[#e6e4dd] bg-white p-8 text-center text-sm text-[#777368]">
            {tickets.length
              ? "Không có phiếu phù hợp. Hãy đổi tổ hoặc số thứ tự phiếu."
              : "Chưa có phiếu nào."}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {admin && teams && teams.length > 1 && (
        <select
          value={teamFilter}
          onChange={(e) => onTeamFilterChange?.(e.target.value)}
          className="min-h-10 rounded-lg border border-[#e2e0d8] bg-white px-3 text-sm text-[#1c1b18] focus:border-[#215e3d] focus:outline-none"
        >
          {teamOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}
      <p className="text-sm text-[#60635b]">
        Hiển thị {visibleTickets.length} / {tickets.length} phiếu
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {visibleTickets.map(renderTicket)}
        {!visibleTickets.length && (
          <p className="rounded-xl border border-[#e6e4dd] bg-white p-8 text-center text-sm text-[#777368]">
            {tickets.length
              ? "Không có phiếu phù hợp. Hãy đổi tổ hoặc số thứ tự phiếu."
              : "Chưa có phiếu nào."}
          </p>
        )}
      </div>
    </div>
  );
}
