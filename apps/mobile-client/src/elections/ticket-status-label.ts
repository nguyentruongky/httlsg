export function ticketStatusLabel(ticket: {
  status: string;
  invalid_reason: string | null;
}) {
  if (ticket.status === "void") return "Đã hủy";
  if (ticket.status === "valid") return "Hợp lệ";
  return ticket.invalid_reason === "blank" ? "Phiếu trắng" : "Phiếu bất hợp lệ";
}
