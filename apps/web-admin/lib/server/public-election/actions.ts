import { z } from "zod";
import {
  PublicLocationInput,
  PublicVoteInput,
  PUBLIC_LOCATION_CHALLENGE_MS,
} from "@org/core";
import type { DB } from "../db";
import { HttpError } from "../http";
import { publicCredentialHash, publicNonce } from "./credentials";
import {
  locationIsVerified,
  publicAdmission,
  publicPhase,
  publicSession,
  publicSessionSnapshot,
  requirePublicAvailable,
} from "./session";
import { recordPublicLocation } from "./location";
import {
  developmentElectionSession,
  isDevelopmentElectionPin,
} from "./development-pin";
export const JoinInput = z
  .object({ pin: z.string().regex(/^\d{6}$/, "Nhập đủ 6 chữ số OTP.") })
  .strict();
export async function joinPublicElection(
  db: DB,
  browser: string,
  input: unknown,
) {
  const data = JoinInput.parse(input);
  const developmentPin = isDevelopmentElectionPin(data.pin);
  const found = developmentPin
    ? await developmentElectionSession(db)
    : (
        await db.query(
          `SELECT session_id id,id otp_id FROM church.election_public_otps WHERE pin_hash=$1 UNION ALL SELECT id,NULL::uuid otp_id FROM church.election_public_sessions WHERE pin_hash=$1 LIMIT 1`,
          [publicCredentialHash("pin", data.pin)],
        )
      ).rows[0];
  if (!found)
    throw new HttpError(
      404,
      "Mã OTP không hợp lệ. Vui lòng kiểm tra và thử lại.",
      "SESSION_NOT_FOUND",
    );
  // Lock before checking consumption: concurrent OTP joins cannot both win.
  const session = await publicSession(db, found.id, true);
  const otp = found.otp_id
    ? (
        await db.query(
          "SELECT * FROM church.election_public_otps WHERE id=$1 AND session_id=$2 FOR UPDATE",
          [found.otp_id, session.id],
        )
      ).rows[0]
    : null;
  if (found.otp_id && !otp)
    throw new HttpError(409, "Mã OTP không còn khả dụng.", "SESSION_CHANGED");
  if (
    !developmentPin &&
    (otp?.pin_hash ?? session.pin_hash) !==
      publicCredentialHash("pin", data.pin)
  )
    throw new HttpError(
      409,
      "Mã phiên đã thay đổi. Vui lòng nhập mã mới.",
      "SESSION_CHANGED",
    );
  requirePublicAvailable(session);
  const browserHash = publicCredentialHash("voter", browser);
  const credential = otp ?? session;
  if (
    credential.consumed_browser_hash &&
    credential.consumed_browser_hash !== browserHash
  )
    throw new HttpError(
      409,
      "Mã OTP đã được sử dụng. Vui lòng xin mã mới.",
      "OTP_ALREADY_USED",
    );
  const entryHash = publicCredentialHash("pin", data.pin);
  const priorAdmission = (
    await db.query(
      "SELECT entry_credential_hash FROM church.election_public_admissions WHERE session_id=$1 AND browser_hash=$2 FOR UPDATE",
      [session.id, browserHash],
    )
  ).rows[0];
  if (priorAdmission && priorAdmission.entry_credential_hash !== entryHash)
    throw new HttpError(
      409,
      "Thiết bị này đã tham gia cuộc bầu cử. Vui lòng dùng mã OTP ban đầu để mở lại phiên.",
      "DEVICE_ALREADY_JOINED",
    );
  const admission = (
    await db.query(
      `INSERT INTO church.election_public_admissions(session_id,browser_hash,joined_version,location_nonce,nonce_expires_at,entry_credential_hash) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(session_id,browser_hash) DO UPDATE SET joined_version=EXCLUDED.joined_version,verified_version=CASE WHEN church.election_public_admissions.joined_version=EXCLUDED.joined_version THEN church.election_public_admissions.verified_version ELSE 0 END,verified_at=CASE WHEN church.election_public_admissions.joined_version=EXCLUDED.joined_version THEN church.election_public_admissions.verified_at ELSE NULL END,location_nonce=EXCLUDED.location_nonce,nonce_expires_at=EXCLUDED.nonce_expires_at RETURNING *`,
      [
        session.id,
        browserHash,
        session.version,
        publicNonce(),
        new Date(Date.now() + PUBLIC_LOCATION_CHALLENGE_MS),
        entryHash,
      ],
    )
  ).rows[0];
  await db.query(
    `UPDATE church.${otp ? "election_public_otps" : "election_public_sessions"} SET consumed_browser_hash=$2,consumed_at=COALESCE(consumed_at,now()) WHERE id=$1`,
    [otp?.id ?? session.id, browserHash],
  );
  return publicSessionSnapshot(db, session, admission);
}
export async function publicElectionAction(
  db: DB,
  browser: string,
  id: string,
  action: string,
  method: string,
  input: unknown,
) {
  const session = await publicSession(db, id);
  let admission = await publicAdmission(
    db,
    session,
    browser,
    method === "GET" &&
      ["checking", "closed", "cancelled"].includes(publicPhase(session)),
  );
  if (method === "GET" && !action)
    return publicSessionSnapshot(db, session, admission);
  if (method === "POST" && action === "location") {
    requirePublicAvailable(session);
    admission = await recordPublicLocation(
      db,
      session,
      admission,
      PublicLocationInput.parse(input),
    );
    return publicSessionSnapshot(db, session, admission);
  }
  if (method === "POST" && action === "votes") {
    // Gate every POST, including retries of a previously accepted ballot.
    // The existing receipt stays available through the session GET endpoint.
    requirePublicAvailable(session);
    if (publicPhase(session) !== "open")
      throw new HttpError(
        409,
        "Cuộc bầu cử chưa bắt đầu. Vui lòng chờ quản trị viên.",
        "SESSION_NOT_OPEN",
      );
    const data = PublicVoteInput.parse(input);
    const existing = (
      await db.query(
        "SELECT * FROM church.election_public_votes WHERE admission_id=$1",
        [admission.id],
      )
    ).rows[0];
    if (existing) {
      if (
        JSON.stringify(existing.candidate_ids) !==
        JSON.stringify([...data.candidateIds].sort((a, b) => a - b))
      )
        throw new HttpError(
          409,
          "Bạn đã gửi phiếu cho cuộc bầu cử này. Không thể gửi phiếu khác.",
          "ALREADY_VOTED",
        );
      return publicSessionSnapshot(db, session, admission);
    }
    if (!locationIsVerified(session, admission))
      throw new HttpError(
        403,
        "Vui lòng xác thực lại vị trí trước khi gửi phiếu.",
        "LOCATION_REQUIRED",
      );
    const allowed = (
      await db.query(
        "SELECT rc.candidate_id FROM church.election_round_candidates rc JOIN church.election_rounds r ON r.id=rc.round_id WHERE r.election_id=$1 AND rc.candidate_id=ANY($2::int[])",
        [session.election_id, data.candidateIds],
      )
    ).rows;
    if (allowed.length !== data.candidateIds.length)
      throw new HttpError(
        400,
        "Có ứng viên không thuộc cuộc bầu cử này.",
        "CANDIDATE_MISMATCH",
      );
    admission = await recordPublicLocation(
      db,
      session,
      admission,
      data.location,
    );
    await db.query(
      "INSERT INTO church.election_public_votes(admission_id,request_id,candidate_ids) VALUES($1,$2,$3)",
      [
        admission.id,
        data.requestId,
        [...data.candidateIds].sort((a, b) => a - b),
      ],
    );
    return publicSessionSnapshot(db, session, admission);
  }
  throw new HttpError(405, "Chức năng không được hỗ trợ.");
}
