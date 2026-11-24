import {
  electionDistanceMeters,
  PublicLocationInput,
  PUBLIC_LOCATION_CHALLENGE_MS,
} from "@org/core";
import type { z } from "zod";
import type { DB } from "../db";
import { HttpError } from "../http";
import { publicNonce } from "./credentials";
export function validatePublicLocation(
  session: any,
  admission: any,
  input: z.infer<typeof PublicLocationInput>,
) {
  if (
    admission.location_nonce !== input.nonce ||
    new Date(admission.nonce_expires_at).getTime() <= Date.now()
  )
    throw new HttpError(
      409,
      "Yêu cầu xác thực vị trí đã hết hạn. Vui lòng thử lại.",
      "LOCATION_CHALLENGE_EXPIRED",
    );
  const age = Date.now() - input.measuredAt;
  if (age > PUBLIC_LOCATION_CHALLENGE_MS || age < -30000)
    throw new HttpError(
      422,
      "Vị trí đã cũ hoặc đồng hồ thiết bị chưa chính xác. Vui lòng lấy lại vị trí.",
      "LOCATION_STALE",
    );
  const distance = electionDistanceMeters(
    { latitude: session.latitude, longitude: session.longitude },
    input,
  );
  if (distance > session.radius_meters)
    throw new HttpError(
      403,
      "Bạn ở quá xa địa điểm bầu cử và không đủ điều kiện tham gia cuộc bầu cử này.",
      "LOCATION_OUTSIDE",
    );
  if (
    input.accuracy > session.maximum_accuracy_meters ||
    distance + input.accuracy > session.radius_meters
  )
    throw new HttpError(
      422,
      "GPS chưa đủ chính xác để xác nhận bạn ở trong khu vực. Hãy đến gần địa điểm bầu cử và thử lại.",
      "LOCATION_INACCURATE",
    );
  return distance;
}
export async function recordPublicLocation(
  db: DB,
  session: any,
  admission: any,
  input: z.infer<typeof PublicLocationInput>,
) {
  const distance = validatePublicLocation(session, admission, input);
  return (
    await db.query(
      "UPDATE church.election_public_admissions SET verified_version=$2,verified_at=now(),distance_meters=$3,accuracy_meters=$4,location_nonce=$5,nonce_expires_at=$6 WHERE id=$1 RETURNING *",
      [
        admission.id,
        session.version,
        distance,
        input.accuracy,
        publicNonce(),
        new Date(Date.now() + PUBLIC_LOCATION_CHALLENGE_MS),
      ],
    )
  ).rows[0];
}
