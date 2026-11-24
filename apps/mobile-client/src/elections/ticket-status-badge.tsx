import { Badge } from "@org/ui";
import { ticketStatusLabel } from "./ticket-status-label";
export function TicketStatusBadge({
  ticket,
}: {
  ticket: { status: string; invalid_reason: string | null };
}) {
  const style =
    ticket.status === "void"
      ? "border-stone-200 bg-stone-100 text-stone-600"
      : ticket.status === "valid"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : ticket.invalid_reason === "blank"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-red-200 bg-red-50 text-red-800";
  return (
    <Badge className={`rounded-full px-2.5 py-1 ${style}`}>
      {ticketStatusLabel(ticket)}
      {ticket.status === "invalid" && ticket.invalid_reason === "over_limit"
        ? " (quá 10)"
        : ""}
    </Badge>
  );
}
