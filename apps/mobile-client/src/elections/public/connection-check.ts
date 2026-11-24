import {
  createRequestId,
  electionDistanceMeters,
  PublicElectionConnectionAck,
  PublicConnectionInput,
  PublicConnectionResult,
  type PublicElectionSession,
} from "@org/core";
import type { z } from "zod";
import { publicElectionRequest, PublicElectionError } from "./api";
import { currentElectionLocation, positionInput } from "./location";
type Report = Extract<
  z.infer<typeof PublicConnectionInput>,
  { stage: "result" }
>;
const activeChecks = new Set<string>();
const key = (sessionId: string) => `public-connection-reports:${sessionId}`;
function readQueue(sessionId: string): Report[] {
  try {
    const values = JSON.parse(sessionStorage.getItem(key(sessionId)) ?? "[]");
    return Array.isArray(values)
      ? values
          .flatMap((value) => {
            const result = PublicConnectionInput.safeParse(value);
            return result.success && result.data.stage === "result"
              ? [result.data]
              : [];
          })
          .slice(-20)
      : [];
  } catch {
    return [];
  }
}
function queue(sessionId: string, report: Report) {
  try {
    const values = readQueue(sessionId).filter(
      (value) => value.checkId !== report.checkId,
    );
    sessionStorage.setItem(
      key(sessionId),
      JSON.stringify([...values, report].slice(-20)),
    );
    return true;
  } catch {
    return false;
  }
}
function remove(sessionId: string, checkId: string) {
  try {
    sessionStorage.setItem(
      key(sessionId),
      JSON.stringify(
        readQueue(sessionId).filter((value) => value.checkId !== checkId),
      ),
    );
  } catch {}
}
async function sendReport(
  sessionId: string,
  report: Report,
  signal: AbortSignal,
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) controller.abort();
  const timer = setTimeout(abort, 5000);
  try {
    return PublicConnectionResult.parse(
      await publicElectionRequest(
        `${sessionId}/connection`,
        report,
        controller.signal,
      ),
    );
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
export async function flushPublicConnectionReports(
  sessionId: string,
  signal: AbortSignal,
) {
  for (const report of readQueue(sessionId)) {
    if (signal.aborted) return false;
    if (activeChecks.has(report.checkId)) continue;
    try {
      await sendReport(sessionId, report, signal);
      remove(sessionId, report.checkId);
    } catch (error) {
      if (
        error instanceof PublicElectionError &&
        [403, 404].includes(error.status)
      )
        remove(sessionId, report.checkId);
      else return false;
    }
  }
  return true;
}
let flushingAll = false;
export async function flushAllPublicConnectionReports(signal: AbortSignal) {
  if (!navigator.onLine || flushingAll) return;
  flushingAll = true;
  try {
    let sessionIds: string[] = [];
    try {
      sessionIds = Object.keys(sessionStorage)
        .filter((value) =>
          /^public-connection-reports:[a-f0-9-]{36}$/i.test(value),
        )
        .map((value) => value.slice("public-connection-reports:".length));
    } catch {
      return;
    }
    for (const sessionId of sessionIds)
      if (!(await flushPublicConnectionReports(sessionId, signal))) return;
  } finally {
    flushingAll = false;
  }
}
const errorReason = (error: unknown): Report["reason"] => {
  if (error instanceof PublicElectionError) {
    const reasons: Record<string, Report["reason"]> = {
      LOCATION_OUTSIDE: "location_outside",
      LOCATION_INACCURATE: "location_inaccurate",
      LOCATION_REQUIRED: "location_unverified",
      LOCATION_STALE: "location_failed",
      LOCATION_CHALLENGE_EXPIRED: "location_failed",
      SESSION_CHANGED: "session_changed",
      NETWORK_TIMEOUT: "timeout",
    };
    return (
      reasons[error.code ?? ""] ??
      ([401, 403].includes(error.status) ? "session_changed" : "network")
    );
  }
  return error instanceof Error && error.message === "ACK_MISMATCH"
    ? "ack_mismatch"
    : error instanceof Error && error.name === "ZodError"
      ? "ack_mismatch"
      : error instanceof Error &&
          (error.cause as { code?: number } | undefined)?.code === 1
        ? "location_denied"
        : error instanceof Error && error.name === "AbortError"
          ? "aborted"
          : "location_failed";
};
export async function checkPublicElectionConnection(
  session: PublicElectionSession,
  signal: AbortSignal,
) {
  const started = performance.now();
  const checkId = createRequestId();
  activeChecks.add(checkId);
  let acknowledged = 0;
  let lastAck: z.infer<typeof PublicElectionConnectionAck> | null = null;
  let verifiedSession: PublicElectionSession | null = null;
  let distanceMeters: number | null = null;
  let accuracyMeters: number | null = null;
  let radiusMeters = session.radiusMeters;
  let maximumAccuracyMeters = session.maximumAccuracyMeters;
  const simulatedLocation = Boolean(import.meta.env?.DEV);
  const locationSupported =
    simulatedLocation ||
    (window.isSecureContext && Boolean(navigator.geolocation));
  let locationPermission: Report["locationPermission"] = "unknown";
  let reason: Report["reason"] = null;
  let errorMessage = "";
  let roundTrip = 0;
  const base = {
    ...session.connection,
    checkId,
    stage: "result" as const,
    acknowledged: 0,
    latencyMs: 0,
    locationSupported,
    locationPermission,
    reason: "aborted" as const,
  };
  queue(session.id, base);
  try {
    for (let packet = 0; packet < 2; packet++) {
      const requestId = createRequestId(),
        packetStart = performance.now();
      const ack = PublicElectionConnectionAck.parse(
        await publicElectionRequest(
          `${session.id}/connection`,
          { ...session.connection, checkId, stage: "probe", requestId },
          signal,
        ),
      );
      if (
        ack.requestId !== requestId ||
        ack.sessionId !== session.id ||
        ack.electionId !== session.electionId
      )
        throw new Error("ACK_MISMATCH");
      lastAck = ack;
      acknowledged++;
      roundTrip += performance.now() - packetStart;
    }
    if (!lastAck!.cookieAccepted) reason = "cookies_blocked";
    else if (lastAck!.votingStatus === "unavailable")
      reason = "session_unavailable";
    else if (lastAck!.locationRequired) {
      if (!locationSupported) reason = "location_unsupported";
      else {
        try {
          locationPermission = simulatedLocation
            ? "granted"
            : ((await navigator.permissions?.query({ name: "geolocation" }))
                ?.state ?? "unknown");
        } catch {}
        if (locationPermission === "denied") reason = "location_denied";
        else {
          try {
            const fresh = await publicElectionRequest<PublicElectionSession>(
              session.id,
              undefined,
              signal,
            );
            if (
              fresh.electionId !== session.electionId ||
              fresh.id !== session.id
            )
              throw new Error("ACK_MISMATCH");
            const point = await currentElectionLocation();
            distanceMeters = electionDistanceMeters(fresh.point, point.coords);
            accuracyMeters = point.coords.accuracy;
            radiusMeters = fresh.radiusMeters;
            maximumAccuracyMeters = fresh.maximumAccuracyMeters;
            locationPermission = "granted";
            verifiedSession =
              await publicElectionRequest<PublicElectionSession>(
                `${session.id}/location`,
                positionInput(point, fresh.challenge.nonce),
                signal,
              );
          } catch (error) {
            reason = errorReason(error);
            errorMessage =
              error instanceof Error
                ? error.message
                : "Không thể xác thực vị trí.";
          }
        }
      }
    }
  } catch (error) {
    reason = errorReason(error);
    if (reason === "location_failed") reason = "network";
    errorMessage =
      reason === "ack_mismatch"
        ? "Phản hồi không khớp cuộc bầu cử này. Vui lòng kiểm tra lại."
        : error instanceof Error
          ? error.message
          : "Không thể kết nối máy chủ.";
  }
  if (signal.aborted) {
    activeChecks.delete(checkId);
    return null;
  }
  const report: Report = {
    ...base,
    reason,
    acknowledged,
    locationPermission,
    locationSupported,
    latencyMs: Math.min(
      120000,
      Math.max(0, Math.round(performance.now() - started)),
    ),
  };
  const queued = queue(session.id, report);
  let logged = false,
    valid = false;
  try {
    const result = await sendReport(session.id, report, signal);
    remove(session.id, checkId);
    logged = true;
    valid = result.valid;
    reason = result.reason;
  } catch {
    if (!reason) reason = "network";
  }
  activeChecks.delete(checkId);
  return {
    valid,
    reason,
    errorMessage,
    logged,
    queued,
    acknowledged,
    latencyMs: acknowledged
      ? Math.max(1, Math.round(roundTrip / acknowledged))
      : null,
    verifiedSession,
    distanceMeters,
    accuracyMeters,
    radiusMeters,
    maximumAccuracyMeters,
    locationPermission,
    locationSupported,
  };
}
