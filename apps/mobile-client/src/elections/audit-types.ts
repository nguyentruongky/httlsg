import type { PUBLIC_CONNECTION_REASON_LABELS } from "@org/core";
export type ConnectionLog = {
  id: string;
  started_at: string;
  status: "success" | "invalid" | "pending";
  reason: keyof typeof PUBLIC_CONNECTION_REASON_LABELS | null;
  device_number: number;
};
export type SubmissionLog = {
  id: string;
  source: "paper" | "online";
  submitted_at: string;
  status: string;
  invalid_reason: string | null;
  selection_count: number;
  ticket_number: number;
  team_name: string | null;
  scrutineer_name: string | null;
};
export type ActivityLog = {
  id: number;
  created_at: string;
  full_name: string | null;
  action: string;
  payload: Record<string, unknown>;
};
export type AuditData = {
  items: ActivityLog[];
  connections: {
    summary: {
      total: number;
      valid: number;
      invalid: number;
      invalid_recent: number;
      pending: number;
    };
    items: ConnectionLog[];
  };
  submissions: {
    summary: { total: number; paper: number; online: number };
    items: SubmissionLog[];
  };
};
