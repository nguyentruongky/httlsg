import { z } from "zod";
import type { AuthUser } from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { electionLog, getRound, requireElection } from "./elections";

export async function voidOnlineTicket(
  db: DB,
  actor: AuthUser,
  rawId: string,
  input: unknown,
  request: Request,
) {
  requireElection(actor, true);
  const voteId = z.uuid().parse(rawId);
  const { reason } = z
    .object({ reason: z.string().trim().min(1).max(2000) })
    .parse(input);
  const ticket = (
    await db.query(
      `SELECT r.id round_id FROM church.election_public_votes v
     JOIN church.election_public_admissions a ON a.id=v.admission_id
     JOIN church.election_public_sessions s ON s.id=a.session_id
     JOIN church.election_rounds r ON r.election_id=s.election_id WHERE v.id=$1`,
      [voteId],
    )
  ).rows[0];
  if (!ticket) throw new HttpError(404, "Không tìm thấy phiếu.");
  const round = await getRound(db, actor, ticket.round_id, true);
  const saved = await db.query(
    "INSERT INTO church.election_public_vote_voids(vote_id,voided_by,reason) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING vote_id",
    [voteId, actor.id, reason],
  );
  if (!saved.rowCount) throw new HttpError(409, "Phiếu đã hủy.");
  // The decision and audit entry commit together in the API transaction.
  await electionLog(
    db,
    actor,
    round.election_id,
    round.id,
    "ticket_voided",
    {
      ticketId: voteId,
      source: "online",
      reason,
    },
    request,
  );
  return { ok: true };
}
