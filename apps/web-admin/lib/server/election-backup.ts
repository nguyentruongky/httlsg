import { z } from "zod";
import {
  electionDispatch,
  requireElection,
  electionLog,
  fileHash,
} from "./elections";
import type { DB } from "./db";
import { ticketOutcome, canCheckElection, type AuthUser } from "@org/core";
import { HttpError } from "./http";
const localTicket = z
  .object({
    client_uuid: z.uuid(),
    ticket_code: z.string(),
    round_id: z.number().int().positive(),
    election_id: z.number().int().positive().optional(),
    team_id: z.uuid().optional(),
    team_ticket_no: z.number().int().positive().optional(),
    user_id: z.uuid(),
    seq_no: z.number().int().positive(),
    candidate_ids: z.array(z.number().int().positive()).max(5000),
    entry_kind: z.enum(["normal", "blank", "invalid"]).default("normal"),
    created_at: z.string(),
    sync_state: z.enum(["pending", "synced", "rejected"]),
  })
  .passthrough();
export async function reconcileElectionBackup(
  db: DB,
  actor: AuthUser,
  electionId: number,
  input: unknown,
  request: Request,
) {
  requireElection(actor, true);
  const visible = await db.query(
    "SELECT id FROM church.election_contests WHERE id=$1 AND deleted_at IS NULL FOR UPDATE",
    [electionId],
  );
  if (!visible.rowCount)
    throw new HttpError(404, "Không tìm thấy cuộc bầu cử.");

  const data = z
    .object({
      backup: z.object({
        tickets: z.array(localTicket).max(20000),
        actions: z.array(z.any()).max(200000),
      }),
      dryRun: z.boolean().default(true),
      expectedHash: z.string().optional(),
    })
    .parse(input);
  const hash = fileHash(JSON.stringify(data.backup));
  let previous = "";
  const chainErrors: string[] = [];
  for (const action of data.backup.actions) {
    const { id, hash: actual, ...record } = action;
    if (
      record.prev_hash !== previous ||
      fileHash(previous + JSON.stringify(record)) !== actual
    ) {
      chainErrors.push("Chuỗi nhật ký không toàn vẹn.");
      break;
    }
    previous = actual;
  }
  const rows: any[] = [];
  for (const ticket of data.backup.tickets) {
    const {
      rows: [round],
    } = await db.query(
      "SELECT * FROM church.election_rounds WHERE id=$1 AND election_id=$2",
      [ticket.round_id, electionId],
    );
    const {
      rows: [old],
    } = await db.query(
      "SELECT * FROM church.election_tickets WHERE client_uuid=$1",
      [ticket.client_uuid],
    );
    const {
      rows: [assignment],
    } = await db.query(
      "SELECT * FROM church.election_scrutineers WHERE round_id=$1 AND user_id=$2",
      [ticket.round_id, ticket.user_id],
    );
    let state = old
      ? "duplicate"
      : !round || !assignment
        ? "rejected"
        : !canCheckElection(round)
          ? "closed"
          : "missing";
    if (old) {
      const ids = old.candidate_ids;
      if (
        old.round_id !== ticket.round_id ||
        old.scrutineer_id !== ticket.user_id ||
        old.seq_no !== ticket.seq_no ||
        old.invalid_reason !==
          ticketOutcome(ticket.candidate_ids, ticket.entry_kind)
            .invalid_reason ||
        JSON.stringify(ids) !==
          JSON.stringify([...ticket.candidate_ids].sort((a, b) => a - b))
      )
        state = "conflict";
    }
    // UUID, identity, selections, and classification determine recovery matches.
    // Ticket codes may be legacy IDs, offline UUIDs, or canonical team numbers.
    if (ticket.election_id !== undefined && ticket.election_id !== electionId)
      state = "conflict";
    if (assignment && ticket.team_id && ticket.team_id !== assignment.team_id)
      state = "conflict";
    rows.push({ ticket, state });
  }
  if (data.dryRun) return { hash, chainErrors, rows };
  if (data.expectedHash !== hash || chainErrors.length)
    throw new HttpError(
      400,
      "Cần bản xem trước hợp lệ và chuỗi nhật ký toàn vẹn.",
    );
  await db.query(
    "SELECT id FROM church.election_contests WHERE id=$1 FOR UPDATE",
    [electionId],
  );
  const imported: any[] = [];
  for (const row of rows.filter((r) => r.state === "missing")) {
    // Recovery retains the original operator identity and normal open-round validation.
    const operator = {
      ...actor,
      id: row.ticket.user_id,
      role: "election_scrutineer" as const,
      roles: ["election_scrutineer" as const],
    };
    imported.push(
      await electionDispatch(
        db,
        operator,
        ["rounds", String(row.ticket.round_id), "tickets"],
        "POST",
        row.ticket,
        request,
      ),
    );
  }
  await electionLog(
    db,
    actor,
    electionId,
    null,
    "backup_reconciled",
    {
      hash,
      imported: imported.length,
      states: rows.map((r) => ({ uuid: r.ticket.client_uuid, state: r.state })),
    },
    request,
  );
  return { ok: true, imported, rows };
}
