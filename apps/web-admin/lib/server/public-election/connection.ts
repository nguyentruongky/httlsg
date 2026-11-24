import { timingSafeEqual } from "node:crypto";
import { PublicConnectionInput } from "@org/core";
import type { DB } from "../db";
import { HttpError } from "../http";
import { publicCredentialHash } from "./credentials";
import { publicSession, publicPhase, locationIsVerified } from "./session";
import { publicConnectionAccess } from "./connection-access";

export async function publicElectionConnection(
  db: DB,
  browser: string,
  sessionId: string,
  input: unknown,
) {
  const data = PublicConnectionInput.parse(input);
  const session = await publicSession(db, sessionId);
  const admission = (
    await db.query(
      "SELECT * FROM church.election_public_admissions WHERE id=$1 AND session_id=$2 FOR UPDATE",
      [data.admissionId, sessionId],
    )
  ).rows[0];
  const expected = publicConnectionAccess(sessionId, data.admissionId).token;
  if (
    !admission ||
    !timingSafeEqual(Buffer.from(data.token), Buffer.from(expected))
  )
    throw new HttpError(
      403,
      "Vui lòng xác thực OTP của cuộc bầu cử trước khi kiểm tra kết nối.",
    );
  await db.query(
    "INSERT INTO church.election_connection_checks(id,election_id,session_id,admission_id) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING",
    [data.checkId, session.election_id, sessionId, admission.id],
  );
  let check = (
    await db.query(
      "SELECT * FROM church.election_connection_checks WHERE id=$1 FOR UPDATE",
      [data.checkId],
    )
  ).rows[0];
  if (check.admission_id !== admission.id || check.session_id !== sessionId)
    throw new HttpError(409, "Lượt kiểm tra không thuộc cuộc bầu cử này.");
  const cookieAccepted =
    admission.browser_hash === publicCredentialHash("voter", browser);
  const phase = publicPhase(session);
  const available = phase === "open" || phase === "waiting";
  const currentVersion = admission.joined_version === session.version;
  if (data.stage === "probe") {
    if (check.status === "pending")
      await db.query(
        `UPDATE church.election_connection_checks SET
      ack_request_ids=CASE WHEN $2::uuid=ANY(ack_request_ids) OR cardinality(ack_request_ids)>=2 THEN ack_request_ids ELSE array_append(ack_request_ids,$2::uuid) END,
      cookie_accepted=cookie_accepted AND $3 WHERE id=$1`,
        [check.id, data.requestId, cookieAccepted],
      );
    return {
      ack: "ACK",
      requestId: data.requestId,
      receivedAt: new Date().toISOString(),
      cookieAccepted,
      votingStatus: available && currentVersion ? phase : "unavailable",
      locationRequired: true,
      sessionId,
      electionId: session.election_id,
    };
  }
  if (check.status === "pending") {
    const reason = !currentVersion
      ? "session_changed"
      : !available
        ? "session_unavailable"
        : !check.cookie_accepted || !cookieAccepted
          ? "cookies_blocked"
          : (data.reason ??
            (check.ack_request_ids.length < 2 || data.acknowledged < 2
              ? "no_ack"
              : !data.locationSupported
                ? "location_unsupported"
                : data.locationPermission === "denied"
                  ? "location_denied"
                  : !locationIsVerified(session, admission)
                    ? "location_unverified"
                    : null));
    check = (
      await db.query(
        `UPDATE church.election_connection_checks SET status=$2,reason=$3,finished_at=now(),latency_ms=$4,client_ack_count=$5,location_supported=$6,location_permission=$7,client_reason=$8,cookie_accepted=cookie_accepted AND $9 WHERE id=$1 RETURNING *`,
        [
          check.id,
          reason ? "invalid" : "success",
          reason,
          data.latencyMs,
          data.acknowledged,
          data.locationSupported,
          data.locationPermission,
          data.reason,
          cookieAccepted,
        ],
      )
    ).rows[0];
  }
  return {
    checkId: check.id,
    valid: check.status === "success",
    reason: check.reason,
  };
}
