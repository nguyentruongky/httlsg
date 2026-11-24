import { z } from "zod";
import { electionSearch, MAX_ELECTION_SELECTIONS } from "./elections";

export const PUBLIC_ELECTION_POLL_MS = 5000;
export const PUBLIC_LOCATION_MAX_AGE_MS = 15 * 60 * 1000;
export const PUBLIC_LOCATION_CHALLENGE_MS = 2 * 60 * 1000;
export const PUBLIC_DEFAULT_RADIUS_METERS = 150;
export const PUBLIC_DEFAULT_ACCURACY_METERS = 50;
export const PUBLIC_OTP_CARD_HEADER =
  "Hội Thánh Tin Lành Việt Nam - Chi hội Sài Gòn";
export const PUBLIC_OTP_CARD_INSTRUCTIONS =
  "Nhập mã này tại trang bầu cử trực tuyến để đăng nhập. Mỗi mã chỉ dùng một lần.";
export type ElectionPoint = { latitude: number; longitude: number };
export function electionDistanceMeters(from: ElectionPoint, to: ElectionPoint) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitude = radians(to.latitude - from.latitude);
  const longitude = radians(to.longitude - from.longitude);
  const a =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitude / 2) ** 2;
  return (
    6371000 *
    2 *
    Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)))
  );
}
export function matchesElectionName(name: string, query: string) {
  const words = electionSearch(name)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  return electionSearch(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .every((token) => words.some((word) => word.startsWith(token)));
}
export const PublicLocationInput = z.object({
  nonce: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().positive().max(100000),
  measuredAt: z.number().finite().positive(),
});
export const PublicVoteInput = z
  .object({
    requestId: z.uuid(),
    candidateIds: z
      .array(z.number().int().positive())
      .max(
        MAX_ELECTION_SELECTIONS,
        `Chỉ được chọn tối đa ${MAX_ELECTION_SELECTIONS} ứng viên.`,
      ),
    location: PublicLocationInput,
  })
  .refine(
    (value) => new Set(value.candidateIds).size === value.candidateIds.length,
    "Không chọn trùng ứng viên.",
  );
export type PublicElectionCandidate = {
  id: number;
  order: number;
  fullName: string;
  description: string;
};
export type PublicElectionSession = {
  id: string;
  electionId: number;
  connection: { admissionId: string; token: string };
  title: string;
  status: "waiting" | "open" | "closed" | "cancelled";
  point: ElectionPoint;
  radiusMeters: number;
  maximumAccuracyMeters: number;
  location: {
    verified: boolean;
    distanceMeters: number | null;
    accuracyMeters: number | null;
    verifiedUntil: string | null;
  };
  challenge: { nonce: string; expiresAt: string };
  candidates: PublicElectionCandidate[];
  receipt: { id: string; submittedAt: string } | null;
};
export type PublicElectionJoin = { pin: string };
export const PublicElectionConnectionAck = z.object({
  ack: z.literal("ACK"),
  requestId: z.uuid(),
  receivedAt: z.iso.datetime(),
  cookieAccepted: z.boolean(),
  votingStatus: z.enum(["open", "waiting", "unavailable"]),
  locationRequired: z.boolean(),
  sessionId: z.uuid(),
  electionId: z.number().int().positive(),
});
export const PublicConnectionReason = z.enum([
  "network",
  "timeout",
  "ack_mismatch",
  "cookies_blocked",
  "location_unsupported",
  "location_denied",
  "location_outside",
  "location_inaccurate",
  "location_failed",
  "location_unverified",
  "session_changed",
  "session_unavailable",
  "aborted",
  "no_ack",
]);
export const PUBLIC_CONNECTION_REASON_LABELS: Record<
  z.infer<typeof PublicConnectionReason>,
  string
> = {
  network: "Mất kết nối với máy chủ",
  timeout: "Hết thời gian chờ phản hồi",
  ack_mismatch: "Phản hồi xác nhận không khớp",
  cookies_blocked: "Trình duyệt chặn cookie",
  location_unsupported: "Thiết bị chưa hỗ trợ định vị",
  location_denied: "Quyền vị trí bị chặn",
  location_outside: "Ở ngoài khu vực bầu cử",
  location_inaccurate: "Vị trí chưa đủ chính xác",
  location_failed: "Không lấy được vị trí",
  location_unverified: "Vị trí chưa được xác minh",
  session_changed: "Cấu hình bầu cử đã thay đổi",
  session_unavailable: "Bầu cử đang đóng hoặc đã tắt",
  aborted: "Kiểm tra bị gián đoạn",
  no_ack: "Chưa nhận đủ phản hồi xác nhận",
};
export const PublicConnectionAccess = z.object({
  admissionId: z.uuid(),
  token: z.string().regex(/^[a-f0-9]{64}$/),
  checkId: z.uuid(),
});
export const PublicConnectionInput = z.discriminatedUnion("stage", [
  PublicConnectionAccess.extend({
    stage: z.literal("probe"),
    requestId: z.uuid(),
  }).strict(),
  PublicConnectionAccess.extend({
    stage: z.literal("result"),
    reason: PublicConnectionReason.nullable(),
    latencyMs: z.number().int().min(0).max(120000),
    acknowledged: z.number().int().min(0).max(2),
    locationSupported: z.boolean(),
    locationPermission: z.enum(["granted", "prompt", "denied", "unknown"]),
  }).strict(),
]);
export const PublicConnectionResult = z.object({
  checkId: z.uuid(),
  valid: z.boolean(),
  reason: PublicConnectionReason.nullable(),
});
