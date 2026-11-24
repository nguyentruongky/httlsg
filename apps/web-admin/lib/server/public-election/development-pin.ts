import type { DB } from "../db";
import { HttpError } from "../http";

export const DEVELOPMENT_ELECTION_PIN = "123456";

export function isDevelopmentElectionPin(pin: string) {
  return (
    process.env.NODE_ENV === "development" && pin === DEVELOPMENT_ELECTION_PIN
  );
}

export async function developmentElectionSession(db: DB) {
  const configuredId = process.env.PUBLIC_ELECTION_DEV_ID;
  if (configuredId && !/^[1-9]\d*$/.test(configuredId))
    throw new HttpError(
      503,
      "PUBLIC_ELECTION_DEV_ID phải là ID cuộc bầu cử hợp lệ.",
      "DEV_SESSION_CONFIG_INVALID",
    );
  const sessions = (
    await db.query(
      `SELECT s.id FROM church.election_public_sessions s
     JOIN church.election_contests e ON e.id=s.election_id
     WHERE e.deleted_at IS NULL AND s.enabled AND e.online_voting_enabled AND e.status<>'archived'
       AND ($1::integer IS NULL OR e.id=$1)
     ORDER BY s.election_id LIMIT 2`,
      [configuredId ?? null],
    )
  ).rows;
  if (!sessions.length)
    throw new HttpError(
      503,
      "Mã OTP development 123456 hợp lệ, nhưng chưa bật bầu cử trực tuyến. Quản trị viên cần mở Bầu cử → Settings để bật và lưu địa điểm.",
      "DEV_SESSION_NOT_CONFIGURED",
    );
  if (sessions.length > 1)
    throw new HttpError(
      503,
      "Có nhiều phiên bầu cử công khai. Đặt PUBLIC_ELECTION_DEV_ID trong cấu hình máy chủ để chọn cuộc bầu cử dùng mã 123456.",
      "DEV_SESSION_AMBIGUOUS",
    );
  return sessions[0];
}
