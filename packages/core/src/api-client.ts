import { clearLocalScheduleDrafts } from "./local-schedule-drafts";
let enabled = false;
let authEpoch = 0;
let accessToken: string | null = null;
let refreshFlight: Promise<boolean> | null = null;
let channel: BroadcastChannel | null = null;
export function advanceAuthEpoch() {
  authEpoch++;
}
export function enableApiMode() {
  enabled = true;
}
export function isApiMode() {
  return enabled;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
function expire() {
  clearLocalScheduleDrafts();
  accessToken = null;
  advanceAuthEpoch();
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("church:session-expired"));
}
export function startAuthSync() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined")
    return () => {};
  channel ??= new BroadcastChannel("church-auth");
  const handler = () => expire();
  channel.addEventListener("message", handler);
  return () => {
    channel?.removeEventListener("message", handler);
    channel?.close();
    channel = null;
  };
}
export function clearBrowserAuth() {
  expire();
  channel?.postMessage("logout");
}
async function rotate() {
  if (refreshFlight) return refreshFlight;
  const epoch = authEpoch;
  const run = async () => {
    if (epoch !== authEpoch) return false;
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "X-Church-CSRF": "1" },
    });
    if (epoch !== authEpoch) return false;
    if (response.status === 401) {
      expire();
      return false;
    }
    if (!response.ok)
      throw new ApiError(
        "Không thể gia hạn phiên đăng nhập. Vui lòng thử lại.",
        response.status,
      );
    const data = await response.json();
    if (epoch !== authEpoch) return false;
    if (!data.accessToken)
      throw new ApiError("Phiên đăng nhập không hợp lệ.", 503);
    accessToken = data.accessToken;
    return true;
  };
  // Serialize cookie rotation across tabs. Tokens never cross BroadcastChannel.
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  refreshFlight = (async () =>
    await (locks ? locks.request("church-refresh", run) : run()))().finally(
    () => {
      refreshFlight = null;
    },
  );
  return refreshFlight;
}
export async function authenticatedFetch(path: string, init: RequestInit = {}) {
  if (!path.startsWith("/api/") || path.startsWith("//"))
    throw new Error("Only same-origin API paths are allowed");
  const epoch = authEpoch;
  const publicAuth =
    path.startsWith("/api/auth/") &&
    !["/api/auth/me", "/api/auth/set-password"].includes(path);
  const send = () => {
    const headers = new Headers(init.headers);
    if (init.body) headers.set("Content-Type", "application/json");
    headers.set("X-Church-CSRF", "1");
    if (accessToken && !publicAuth)
      headers.set("Authorization", "Bearer " + accessToken);
    return fetch(path, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers,
    });
  };
  let response = await send();
  if (response.status === 401 && !publicAuth && epoch === authEpoch) {
    if (await rotate()) response = await send();
  }
  return response;
}
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const epoch = authEpoch;
  const response = await authenticatedFetch(path, init);
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      data?.message ?? "Không thể xử lý yêu cầu.",
      response.status,
    );
  if (
    epoch === authEpoch &&
    data?.accessToken &&
    [
      "/api/auth/login",
      "/api/auth/verify-otp",
      "/api/auth/set-password",
    ].includes(path)
  )
    accessToken = data.accessToken;
  return data as T;
}
