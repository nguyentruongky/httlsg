export type TicketCardData = {
  id?: number | string;
  source?: "paper" | "online";
  client_uuid: string;
  ticket_code: string;
  team_ticket_no?: number;
  team_name?: string | null;
  team_id?: string | null;
  seq_no: number;
  status: string;
  invalid_reason: string | null;
  sync_state: string;
  created_at: string;
  scrutineer_name: string;
  candidates: Array<{ id?: number; candidate_no: number; full_name: string }>;
  rejection?: string;
  void_reason?: string;
  void_requested_reason?: string;
};
