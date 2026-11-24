import { createElectionPolling } from "../polling";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_ELECTION_SELECTIONS,
  PUBLIC_ELECTION_POLL_MS,
  electionDistanceMeters,
  type PublicElectionJoin,
  type PublicElectionSession,
} from "@org/core";
import {
  publicElectionRequest,
  PublicElectionError,
  publicErrorMessage,
} from "./api";
import { currentElectionLocation, positionInput } from "./location";
import {
  publicVoteRequestId,
  readPublicDraft,
  storePublicDraft,
} from "./draft";
const initialId = () =>
  /^\/vote\/([a-f0-9-]{36})\/?$/i.exec(window.location.pathname)?.[1] ?? "";
export function usePublicElection() {
  const [sessionId, setSessionId] = useState(initialId);
  const [session, setSession] = useState<PublicElectionSession | null>(null);
  const [selected, setSelected] = useState<number[]>(() =>
    readPublicDraft(initialId()),
  );
  const [tab, setTab] = useState<"candidates" | "selected">("candidates");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [networkError, setNetworkError] = useState("");
  const [busy, setBusy] = useState(false);
  const [connectionApproved, setConnectionApproved] = useState(false);
  const [loading, setLoading] = useState(Boolean(initialId()));
  const [attempt, setAttempt] = useState<{
    distance: number;
    accuracy: number;
  } | null>(null);
  const busyRef = useRef(false);
  const snapshot = useRef(session);
  snapshot.current = session;
  const currentId = useRef(sessionId);
  currentId.current = sessionId;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const leave = useCallback(() => {
    setConnectionApproved(false);
    setError("");
    setNetworkError("");
    setSessionId("");
    setSession(null);
    setQuery("");
    setSelected([]);
    setAttempt(null);
    window.history.replaceState({}, "", "/vote");
  }, []);
  const accept = useCallback((value: PublicElectionSession) => {
    if (!mounted.current) return;
    if (!value.location.verified) setConnectionApproved(false);
    setSession((previous) =>
      previous?.id === value.id && previous.receipt && !value.receipt
        ? previous
        : value,
    );
    setNetworkError("");
  }, []);
  const refresh = useCallback(async () => {
    if (!sessionId) throw new Error("Vui lòng tham gia phiên bầu cử.");
    const value = await publicElectionRequest<PublicElectionSession>(sessionId);
    if (currentId.current === sessionId) accept(value);
    return value;
  }, [sessionId, accept]);
  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    const known = snapshot.current?.id === sessionId ? snapshot.current : null;
    const polling = createElectionPolling({
      intervalMs: PUBLIC_ELECTION_POLL_MS,
      initialRead: !known,
      initiallyPolling: known?.status === "open" && !known.receipt,
      load: async (signal) => {
        const value = await publicElectionRequest<PublicElectionSession>(
          sessionId,
          undefined,
          signal,
        );
        if (signal.aborted || currentId.current !== sessionId) return false;
        accept(value);
        setLoading(false);
        return value.status === "open" && !value.receipt;
      },
      onError: (error) => {
        setLoading(false);
        if (
          error instanceof PublicElectionError &&
          [401, 403, 404, 409, 410].includes(error.status)
        ) {
          leave();
          setError(error.message);
        } else
          setNetworkError(
            "Mất kết nối phiên bầu cử. Lựa chọn được giữ trên thiết bị; vui lòng kết nối lại trước khi gửi.",
          );
      },
    });
    return polling.stop;
  }, [sessionId, session?.status, Boolean(session?.receipt), accept, leave]);

  useEffect(() => {
    if (sessionId) storePublicDraft(sessionId, selected);
  }, [selected, sessionId]);
  const join = useCallback(
    async (credentials: PublicElectionJoin) => {
      if (busyRef.current) return false;
      busyRef.current = true;
      setBusy(true);
      setError("");
      try {
        const value = await publicElectionRequest<PublicElectionSession>(
          "join",
          credentials,
        );
        if (!mounted.current) return false;
        setConnectionApproved(false);
        setSelected(readPublicDraft(value.id));
        setSessionId(value.id);
        currentId.current = value.id;
        accept(value);
        setAttempt(null);
        setTab("candidates");
        window.history.replaceState({}, "", `/vote/${value.id}`);
        return true;
      } catch (error) {
        if (mounted.current) setError(publicErrorMessage(error));
        return false;
      } finally {
        busyRef.current = false;
        if (mounted.current) setBusy(false);
      }
    },
    [accept],
  );
  const initialInvite = useRef(false);
  useEffect(() => {
    if (initialInvite.current) return;
    initialInvite.current = true;
    if (!window.location.hash && !window.location.search) return;
    const url = new URL(window.location.href);
    const hasQrToken =
      new URLSearchParams(url.hash.slice(1)).has("join") ||
      url.searchParams.has("token");
    window.history.replaceState({}, "", window.location.pathname);
    if (hasQrToken)
      setError(
        "Hiện chỉ hỗ trợ tham gia bằng mã OTP. Vui lòng nhập mã gồm 6 chữ số.",
      );
  }, []);
  const verify = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const fresh = await refresh();
      const point = await currentElectionLocation();
      setAttempt({
        distance: electionDistanceMeters(fresh.point, point.coords),
        accuracy: point.coords.accuracy,
      });
      accept(
        await publicElectionRequest<PublicElectionSession>(
          `${sessionId}/location`,
          positionInput(point, fresh.challenge.nonce),
        ),
      );
    } catch (error) {
      setError(publicErrorMessage(error));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const toggle = (id: number) => {
    if (
      busyRef.current ||
      session?.status !== "open" ||
      !session.location.verified
    )
      return;
    if (!session.candidates.some((candidate) => candidate.id === id)) return;
    setError("");
    setSelected((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= MAX_ELECTION_SELECTIONS) return current;
      return [...current, id];
    });
    if (!selected.includes(id) && selected.length >= MAX_ELECTION_SELECTIONS)
      setError(
        `Bạn đã chọn tối đa ${MAX_ELECTION_SELECTIONS} ứng viên. Bỏ chọn một người để chọn người khác.`,
      );
  };
  const submit = async () => {
    if (busyRef.current || !sessionId) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const fresh = await refresh();
      if (fresh.receipt) return;
      if (fresh.status !== "open")
        throw new Error("Cuộc bầu cử chưa mở hoặc đã kết thúc.");
      if (!fresh.location.verified)
        throw new Error("Vui lòng xác thực lại vị trí trước khi gửi phiếu.");
      const location = positionInput(
        await currentElectionLocation(),
        fresh.challenge.nonce,
      );
      const value = await publicElectionRequest<PublicElectionSession>(
        `${sessionId}/votes`,
        {
          requestId: publicVoteRequestId(sessionId, selected),
          candidateIds: selected,
          location,
        },
      );
      accept(value);
      setSelected([]);
      storePublicDraft(sessionId, []);
    } catch (error) {
      setError(publicErrorMessage(error));
      if (
        error instanceof PublicElectionError &&
        [
          "ALREADY_VOTED",
          "LOCATION_REQUIRED",
          "SESSION_CLOSED",
          "LOCATION_CHALLENGE_EXPIRED",
        ].includes(error.code ?? "")
      )
        await refresh().catch(() => {});
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  return {
    session,
    connectionApproved,
    approveConnection: (verified: PublicElectionSession | null) => {
      if (verified) accept(verified);
      setConnectionApproved(true);
    },
    selected,
    tab,
    setTab,
    query,
    setQuery,
    error,
    setError,
    networkError,
    busy,
    loading,
    attempt,
    join,
    verify,
    toggle,
    submit,
    leave,
    refresh,
  };
}
