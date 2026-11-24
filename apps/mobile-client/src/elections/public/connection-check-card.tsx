import { useEffect, useRef, useState } from "react";
import type { PublicElectionSession } from "@org/core";
import { checkPublicElectionConnection } from "./connection-check";
import { ElectionEligibilityError } from "./eligibility-error";
type CheckResult = NonNullable<
  Awaited<ReturnType<typeof checkPublicElectionConnection>>
>;
export function PublicConnectionCheck({
  session,
  onContinue,
  onRestart,
  onFailure,
}: {
  session: PublicElectionSession;
  onContinue: (verified: PublicElectionSession | null) => void;
  onRestart: () => void;
  onFailure: () => void;
}) {
  const [failure, setFailure] = useState<CheckResult | null>(null);
  const [unexpectedError, setUnexpectedError] = useState(false);
  const callbacks = useRef({ onContinue, onFailure });
  callbacks.current = { onContinue, onFailure };
  const latest = useRef(session);
  latest.current = session;
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const result = await checkPublicElectionConnection(
          latest.current,
          controller.signal,
        );
        if (controller.signal.aborted || !result) return;
        if (result.valid) callbacks.current.onContinue(result.verifiedSession);
        else {
          setFailure(result);
          callbacks.current.onFailure();
        }
      } catch {
        if (!controller.signal.aborted) {
          setUnexpectedError(true);
          callbacks.current.onFailure();
        }
      }
    };
    const timer = setTimeout(() => void run(), 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [session.id, session.connection.admissionId]);
  if (!failure && !unexpectedError) return null;
  return (
    <ElectionEligibilityError
      session={session}
      reason={failure?.reason ?? null}
      distanceMeters={failure?.distanceMeters}
      accuracyMeters={failure?.accuracyMeters}
      radiusMeters={failure?.radiusMeters}
      maximumAccuracyMeters={failure?.maximumAccuracyMeters}
      onBack={onRestart}
    />
  );
}
