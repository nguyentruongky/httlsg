export class PublicElectionError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
async function performPublicElectionRequest<T>(
  path: string,
  input?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 15000);
  try {
    const response = await fetch(`/api/public/elections/${path}`, {
      method: input === undefined ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
      headers:
        input === undefined
          ? path === "device"
            ? { "X-Church-CSRF": "1" }
            : undefined
          : { "Content-Type": "application/json", "X-Church-CSRF": "1" },
      body: input === undefined ? undefined : JSON.stringify(input),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok)
      throw new PublicElectionError(
        data?.message ?? "Không thể kết nối phiên bầu cử. Vui lòng thử lại.",
        response.status,
        data?.code,
      );
    if (!data)
      throw new PublicElectionError(
        "Phản hồi phiên bầu cử không hợp lệ. Vui lòng thử lại.",
        503,
        "INVALID_RESPONSE",
      );
    return data;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timedOut)
      throw new PublicElectionError(
        "Kết nối quá lâu. Vui lòng kiểm tra mạng và tải lại trạng thái phiếu trước khi gửi lại.",
        408,
        "NETWORK_TIMEOUT",
      );
    if (error instanceof PublicElectionError) throw error;
    throw new PublicElectionError(
      "Không thể kết nối máy chủ. Lựa chọn của bạn vẫn được giữ; vui lòng kiểm tra mạng.",
      0,
      "NETWORK_FAILURE",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
/** Establish the HttpOnly device cookie before OTP validation, shared across tabs. */
export async function publicElectionRequest<T>(
  path: string,
  input?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  if (path !== "join")
    return performPublicElectionRequest<T>(path, input, signal);
  const join = async () => {
    await performPublicElectionRequest<{ ready: boolean }>(
      "device",
      undefined,
      signal,
    );
    return performPublicElectionRequest<T>(path, input, signal);
  };
  // Serialize first entry across tabs so concurrent joins use the same cookie.
  if (navigator.locks?.request)
    return navigator.locks.request("church-public-election-join", join);
  return join();
}

export const publicErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Không thể xử lý yêu cầu. Vui lòng thử lại.";
