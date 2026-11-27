import { createElectionPolling } from "./polling";
import { AdminTicketFilters } from "./tickets/admin-ticket-filters";
import { TicketCard } from "./tickets/ticket-card";
import { electionPhase } from "@org/core";
import { LoadingView } from "@org/ui";
import { useCallback, useEffect, useState } from "react";
import {
  apiRequest,
  authenticatedFetch,
  electionAdmin,
  electionAccess,
  useAuth,
  type ElectionCandidate,
} from "@org/core";
import { Button, Input, useToast } from "@org/ui";
import { FilePlus2, FileCheck2 } from "lucide-react";
import {
  downloadElectionFile,
  localMeta,
  localTickets,
  logElectionAction,
  syncElectionTickets,
  type LocalTicket,
} from "./local-election";

const post = (path: string, data: unknown = {}) =>
  apiRequest<any>(path, { method: "POST", body: JSON.stringify(data) });

const box =
  "rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]";

const selectClass =
  "min-h-10 rounded-lg border border-[#e2e0d8] bg-[#f8f7f3] px-3 py-1.5 text-sm text-[#1c1b18] focus:border-[#215e3d] focus:outline-none";

const primaryBtn =
  "bg-[#215e3d] text-white hover:bg-[#19492f] border-[#215e3d]";

const outlineBtn =
  "border-[#e6e4dd] bg-white text-[#1c1b18] hover:bg-[#f2f0e8]";

const labelStatus = (s: string) =>
  ({
    valid: "Hợp lệ",
    invalid: "Phiếu bất hợp lệ",
    void: "Đã hủy",
    open: "Đang mở",
    draft: "Bản nháp",
    closed: "Đã đóng",
    pending: "Chờ đồng bộ",
    synced: "Đã đồng bộ",
    rejected: "⚠ Bị từ chối",
  })[s] ?? s;

const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Không thể xử lý yêu cầu.";

async function download(path: string, filename: string) {
  const response = await authenticatedFetch(path);
  if (!response.ok) {
    let message = "Không thể xuất tệp.";
    try {
      message = (await response.json()).message ?? message;
    } catch {}
    throw new Error(message);
  }
  downloadElectionFile(await response.blob(), filename);
}

type Run = (fn: () => Promise<unknown>) => Promise<void>;

interface TicketsProps {
  round: any;
  user: any;
  run: Run;
}

export function Tickets({ round, user, run }: TicketsProps) {
  const [items, setItems] = useState<any[]>([]);
  const [local, setLocal] = useState<LocalTicket[]>([]);
  const [candidateList, setCandidateList] = useState<ElectionCandidate[]>([]);
  const [teamFilter, setTeamFilter] = useState("all");
  const admin = electionAdmin(user);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const tickets = await localTickets(user.id, round.id);
      const cached = await localMeta(`round:${user.id}:${round.id}`);
      if (signal?.aborted) return false;
      setLocal(tickets);
      setCandidateList(cached?.candidates ?? []);
      if (!navigator.onLine) return false;
      const response = await apiRequest<any>(
        `/api/rounds/${round.id}/tickets`,
        { signal },
      );
      if (signal?.aborted) return false;
      setItems(response.items);
      return response.polling === true;
    },
    [round.id, user.id],
  );

  useEffect(() => {
    const polling = createElectionPolling({
      initiallyPolling: round.status === "open",
      load,
      onError: (error) =>
        run(async () => {
          throw error;
        }),
    });
    return polling.stop;
  }, [load, run, round.status]);

  const seen = new Set(items.map((t) => t.client_uuid));
  const rows = [
    ...items.map((t) => ({ ...t, sync_state: "synced" })),
    ...local
      .filter((t) => !seen.has(t.client_uuid))
      .map((t) => ({
        ...t,
        scrutineer_name: user.name,
        candidates: t.candidate_ids.map(
          (id) =>
            candidateList.find((c) => c.id === id) ?? {
              candidate_no: id,
              full_name: "Ứng viên chưa có trong bộ nhớ",
            },
        ),
      })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // Group by persisted team ID, never by names or the operator's current team.
  const teamKey = (ticket: any): string =>
    ticket.source === "online" ? "online" : (ticket.team_id ?? "unassigned");
  const teams = [
    ...new Map<string, { name: string; order: number }>(
      rows.map((ticket) => [
        teamKey(ticket),
        {
          name:
            ticket.source === "online"
              ? "Trực tuyến"
              : (ticket.team_name ?? "Tổ chưa xác định"),
          order:
            ticket.source === "online"
              ? Number.MAX_SAFE_INTEGER
              : Number(ticket.team_sort_order ?? Number.MAX_SAFE_INTEGER),
        },
      ]),
    ).entries(),
  ]
    .map(([id, value]) => ({ id, name: value.name, order: value.order }))
    .sort(
      (a, b) =>
        a.order - b.order ||
        a.name.localeCompare(b.name, "vi", { numeric: true }),
    );
  const visibleRows = admin
    ? rows
        .filter(
          (ticket) => teamFilter === "all" || teamKey(ticket) === teamFilter,
        )
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
        )
    : rows;

  return (
    <section
      className="space-y-4 rounded-2xl bg-[#f8f7f3] p-3 sm:p-4"
      aria-label={admin ? "Tất cả phiếu" : "Phiếu của tôi"}
    >
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[#1c1b18]">
          {admin
            ? `Tất cả phiếu (${rows.length})`
            : `Phiếu của tôi (${rows.length})`}{" "}
        </h2>
      </header>
      {admin && (
        <>
          <AdminTicketFilters
            teams={teams}
            team={teamFilter}
            onTeam={setTeamFilter}
          />
          <p role="status" className="text-sm text-[#60635b]">
            Hiển thị {visibleRows.length} / {rows.length} phiếu
          </p>
        </>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {visibleRows.map((ticket) => (
          <TicketCard
            key={ticket.client_uuid}
            ticket={ticket}
            admin={admin}
            onAction={async (requestOnly, reason) => {
              await post(
                ticket.source === "online"
                  ? `/api/tickets/online/${ticket.id}/void`
                  : `/api/tickets/${ticket.id}/void`,
                requestOnly ? { reason, requestOnly: true } : { reason },
              );
              if (requestOnly)
                await logElectionAction(
                  user.id,
                  round.id,
                  "ticket_void_requested",
                  { ticketId: ticket.id, reason },
                );
              await load();
            }}
          />
        ))}
      </div>
      {!visibleRows.length && (
        <p className="rounded-xl border border-[#e6e4dd] bg-white p-8 text-center text-sm text-[#777368]">
          {rows.length
            ? "Không có phiếu phù hợp. Hãy đổi tổ hoặc số thứ tự phiếu."
            : "Chưa có phiếu nào."}
        </p>
      )}
    </section>
  );
}
