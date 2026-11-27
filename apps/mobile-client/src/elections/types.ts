export interface Round {
  id: number;
  election_id: number;
  election_name: string;
  status: string;
  phase?: string | null;
  assignment?: { team_id?: string } | null;
  scrutineer_code?: string;
  code?: string;
  summary?: {
    received?: number;
    paper?: number;
    online?: number;
    void?: number;
    valid?: number;
    invalid?: number;
    blank?: number;
    counted_ballots?: number;
  };
  readiness?: {
    scrutineer_count?: number;
  };
  progress?: Array<{
    user_id: string;
    full_name: string;
    pending_count: number;
  }>;
}

export type ElectionPhase = "draft" | "online" | "checking" | "closed";
export type ElectionType = "church" | "department";
