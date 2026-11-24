import {
  PUBLIC_LOCATION_CHALLENGE_MS,
  PUBLIC_LOCATION_MAX_AGE_MS,
  type PublicElectionSession,
  electionSearch,
} from "@org/core";
import type { DB } from "../db";
import { HttpError } from "../http";
import { publicCredentialHash, publicNonce } from "./credentials";
import { publicConnectionAccess } from "./connection-access";
export async function publicSession(db: DB, id: string, claim = false) {
  const found = (
    await db.query(
      "SELECT election_id FROM church.election_public_sessions WHERE id=$1",
      [id],
    )
  ).rows[0];
  if (!found)
    throw new HttpError(
      404,
      "Không tìm thấy phiên bầu cử.",
      "SESSION_NOT_FOUND",
    );
  const available = await db.query(
    "SELECT id FROM church.election_contests WHERE id=$1 AND deleted_at IS NULL FOR SHARE",
    [found.election_id],
  );
  if (!available.rowCount)
    throw new HttpError(
      404,
      "Không tìm thấy phiên bầu cử.",
      "SESSION_NOT_FOUND",
    );
  return (
    await db.query(
      `SELECT s.*,e.name title,e.status election_status,e.online_voting_enabled,r.status ballot_status,r.phase ballot_phase FROM church.election_public_sessions s JOIN church.election_contests e ON e.id=s.election_id LEFT JOIN church.election_rounds r ON r.election_id=e.id WHERE s.id=$1 FOR ${claim ? "UPDATE" : "SHARE"} OF s`,
      [id],
    )
  ).rows[0];
}
export function publicPhase(session: any): PublicElectionSession["status"] {
  if (
    !session.enabled ||
    !session.online_voting_enabled ||
    session.election_status === "archived"
  )
    return "cancelled";
  return session.ballot_status === "open"
    ? session.ballot_phase === "online"
      ? "open"
      : "checking"
    : session.ballot_status === "closed"
      ? "closed"
      : "waiting";
}
export function requirePublicAvailable(session: any) {
  const phase = publicPhase(session);
  if (phase === "cancelled")
    throw new HttpError(
      410,
      "Phiên bầu cử không còn khả dụng.",
      "SESSION_CANCELLED",
    );
  if (phase === "checking")
    throw new HttpError(
      409,
      "Đã kết thúc nhận phiếu trực tuyến. Cuộc bầu cử đang kiểm phiếu thủ công.",
      "SESSION_CHECKING",
    );
  if (phase === "closed")
    throw new HttpError(409, "Cuộc bầu cử đã kết thúc.", "SESSION_CLOSED");
}
export async function publicAdmission(
  db: DB,
  session: any,
  browser: string,
  allowStale = false,
) {
  const row = (
    await db.query(
      "SELECT * FROM church.election_public_admissions WHERE session_id=$1 AND browser_hash=$2 FOR UPDATE",
      [session.id, publicCredentialHash("voter", browser)],
    )
  ).rows[0];
  if (!row)
    throw new HttpError(
      401,
      "Vui lòng nhập mã OTP để tham gia.",
      "ADMISSION_REQUIRED",
    );
  if (row.joined_version !== session.version && !allowStale)
    throw new HttpError(
      401,
      "Mã phiên đã thay đổi. Vui lòng tham gia lại.",
      "SESSION_CHANGED",
    );
  return row;
}
export function locationIsVerified(session: any, admission: any) {
  return (
    admission.verified_version === session.version &&
    admission.verified_at &&
    new Date(admission.verified_at).getTime() + PUBLIC_LOCATION_MAX_AGE_MS >
      Date.now()
  );
}
async function publicCandidates(db: DB, electionId: number) {
  const rows = (
    await db.query(
      `SELECT n.id,n.candidate_no,n.full_name,n.extra,COALESCE((SELECT string_agg(d.name,', ' ORDER BY d.name) FROM church.department_members dm JOIN church.departments d ON d.id=dm.department_id WHERE dm.user_id=n.member_id),'') description FROM church.election_rounds r JOIN church.election_round_candidates rc ON rc.round_id=r.id JOIN church.election_nominees n ON n.id=rc.candidate_id WHERE r.election_id=$1 ORDER BY n.candidate_no,n.id`,
      [electionId],
    )
  ).rows;
  return rows.map((row, index) => {
    const imported = Object.entries(row.extra ?? {})
      .filter(
        ([key, value]) =>
          typeof value === "string" &&
          /^(ban nganh|ban hat le|ban nganh ?\/ ?ban hat le|departments?|choir)$/.test(
            electionSearch(key),
          ),
      )
      .map(([, value]) => String(value).trim())
      .filter(Boolean);
    return {
      id: row.id,
      order: index + 1,
      fullName: row.full_name,
      description:
        row.description ||
        imported.join(", ") ||
        "Chưa có thông tin ban ngành / ban hát lễ",
    };
  });
}
export async function publicSessionSnapshot(
  db: DB,
  session: any,
  admission: any,
): Promise<PublicElectionSession> {
  if (new Date(admission.nonce_expires_at).getTime() <= Date.now()) {
    const row = (
      await db.query(
        "UPDATE church.election_public_admissions SET location_nonce=$2,nonce_expires_at=$3 WHERE id=$1 RETURNING *",
        [
          admission.id,
          publicNonce(),
          new Date(Date.now() + PUBLIC_LOCATION_CHALLENGE_MS),
        ],
      )
    ).rows[0];
    admission = row;
  }
  const receipt = (
    await db.query(
      "SELECT id,submitted_at FROM church.election_public_votes WHERE admission_id=$1",
      [admission.id],
    )
  ).rows[0];
  const status = publicPhase(session);
  const verified = Boolean(locationIsVerified(session, admission));
  return {
    id: session.id,
    electionId: session.election_id,
    connection: publicConnectionAccess(session.id, admission.id),
    title: session.title,
    status,
    point: { latitude: session.latitude, longitude: session.longitude },
    radiusMeters: session.radius_meters,
    maximumAccuracyMeters: session.maximum_accuracy_meters,
    location: {
      verified,
      distanceMeters: admission.distance_meters,
      accuracyMeters: admission.accuracy_meters,
      verifiedUntil: admission.verified_at
        ? new Date(
            new Date(admission.verified_at).getTime() +
              PUBLIC_LOCATION_MAX_AGE_MS,
          ).toISOString()
        : null,
    },
    challenge: {
      nonce: admission.location_nonce,
      expiresAt: new Date(admission.nonce_expires_at).toISOString(),
    },
    candidates:
      status === "open" && verified && !receipt
        ? await publicCandidates(db, session.election_id)
        : [],
    receipt: receipt
      ? {
          id: receipt.id,
          submittedAt: new Date(receipt.submitted_at).toISOString(),
        }
      : null,
  };
}
