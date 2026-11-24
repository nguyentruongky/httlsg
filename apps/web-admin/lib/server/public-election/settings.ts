import { randomInt } from "node:crypto";
import { z } from "zod";
import type { AuthUser } from "@org/core";
import type { DB } from "../db";
import { HttpError } from "../http";
import { electionLog, requireElection } from "../elections";
import { publicCredentialHash, publicNonce } from "./credentials";
import { DEVELOPMENT_ELECTION_PIN } from "./development-pin";
const Config = z
  .object({
    enabled: z.boolean(),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    radiusMeters: z.number().int().min(20).max(10000),
    maximumAccuracyMeters: z.number().int().min(1).max(1000),
    version: z.number().int().nonnegative(),
  })
  .refine(
    (value) => value.maximumAccuracyMeters <= value.radiusMeters,
    "Độ sai số GPS tối đa phải nhỏ hơn bán kính.",
  );
async function currentSettings(db: DB, electionId: number) {
  const row = (
    await db.query(
      `SELECT e.online_voting_enabled,s.id,s.enabled,s.latitude,s.longitude,s.radius_meters,s.maximum_accuracy_meters,s.version,(SELECT count(*)::int FROM church.election_public_votes v JOIN church.election_public_admissions a ON a.id=v.admission_id WHERE a.session_id=s.id) vote_count FROM church.election_contests e LEFT JOIN church.election_public_sessions s ON s.election_id=e.id WHERE e.id=$1`,
      [electionId],
    )
  ).rows[0];
  return {
    onlineVotingEnabled: Boolean(row?.online_voting_enabled),
    session: row?.id
      ? {
          id: row.id,
          enabled: row.enabled,
          latitude: row.latitude,
          longitude: row.longitude,
          radiusMeters: row.radius_meters,
          maximumAccuracyMeters: row.maximum_accuracy_meters,
          version: row.version,
          voteCount: row.vote_count,
        }
      : null,
  };
}
export async function publicElectionSettings(
  db: DB,
  actor: AuthUser,
  election: any,
  input: unknown,
  method: string,
  request: Request,
) {
  requireElection(actor, true);
  if (method === "GET") return currentSettings(db, election.id);
  if (election.status === "archived")
    throw new HttpError(409, "Cuộc bầu cử đã lưu trữ.");
  const toggle = z
    .object({
      action: z.literal("toggle"),
      enabled: z.boolean(),
      previous: z.boolean(),
    })
    .strict()
    .safeParse(input);
  if (toggle.success) {
    const data = toggle.data;
    if (election.online_voting_enabled !== data.previous)
      throw new HttpError(
        409,
        "Cài đặt vừa được thay đổi. Tải lại trang để xem trạng thái mới.",
      );
    await db.query(
      "UPDATE church.election_contests SET online_voting_enabled=$2 WHERE id=$1",
      [election.id, data.enabled],
    );
    await db.query(
      "UPDATE church.election_public_sessions SET enabled=$2,updated_at=now() WHERE election_id=$1",
      [election.id, data.enabled],
    );
    await electionLog(
      db,
      actor,
      election.id,
      null,
      "online_voting_toggled",
      { enabled: data.enabled },
      request,
    );
    return currentSettings(db, election.id);
  }
  const config = Config.parse(input);
  if (config.enabled && !election.online_voting_enabled)
    throw new HttpError(
      409,
      "Bật Cho phép bầu cử trực tuyến trước khi lưu địa điểm.",
    );
  const current = (await currentSettings(db, election.id)).session;
  if (config.version !== (current?.version ?? 0))
    throw new HttpError(
      409,
      "Cấu hình vừa thay đổi. Mở lại hộp thoại để tải dữ liệu mới.",
    );
  // Rare administrative operation: reserve PINs globally without collision races.
  await db.query("SELECT pg_advisory_xact_lock(74298355)");
  let pin = "";
  let pinHash = "";
  for (let attempt = 0; attempt < 20; attempt++) {
    pin =
      process.env.NODE_ENV === "development" && attempt === 0
        ? DEVELOPMENT_ELECTION_PIN
        : String(randomInt(1000000)).padStart(6, "0");
    pinHash = publicCredentialHash("pin", pin);
    if (
      !(
        await db.query(
          "SELECT 1 FROM church.election_public_sessions WHERE pin_hash=$1 AND election_id<>$2 UNION ALL SELECT 1 FROM church.election_public_otps WHERE pin_hash=$1 LIMIT 1",
          [pinHash, election.id],
        )
      ).rowCount
    )
      break;
    pin = "";
  }
  if (!pin)
    throw new HttpError(503, "Không thể tạo mã PIN mới. Vui lòng thử lại.");
  const token = publicNonce();
  await db.query(
    `INSERT INTO church.election_public_sessions(election_id,pin_hash,qr_token_hash,enabled,latitude,longitude,radius_meters,maximum_accuracy_meters,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(election_id) DO UPDATE SET pin_hash=EXCLUDED.pin_hash,qr_token_hash=EXCLUDED.qr_token_hash,enabled=EXCLUDED.enabled,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,radius_meters=EXCLUDED.radius_meters,maximum_accuracy_meters=EXCLUDED.maximum_accuracy_meters,version=church.election_public_sessions.version+1,consumed_browser_hash=NULL,consumed_at=NULL,updated_at=now()`,
    [
      election.id,
      pinHash,
      publicCredentialHash("qr", token),
      config.enabled,
      config.latitude,
      config.longitude,
      config.radiusMeters,
      config.maximumAccuracyMeters,
      actor.id,
    ],
  );
  await electionLog(
    db,
    actor,
    election.id,
    null,
    "public_session_configured",
    {
      enabled: config.enabled,
      radiusMeters: config.radiusMeters,
    },
    request,
  );
  return {
    ...(await currentSettings(db, election.id)),
    pin,
  };
}
