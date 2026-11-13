import type { AuthBootstrap } from "./auth-bootstrap";
import { clearLocalScheduleDrafts } from "./local-schedule-drafts";
export const REAUTHENTICATION_MESSAGE = "Xin đăng nhập lại để tiếp tục sử dụng";
let enabled = false;
let authEpoch = 0;
let accessToken: string | null = null;
let refreshFlight: Promise<AuthBootstrap | null> | null = null;
let bootstrap: AuthBootstrap | null = null;
export function currentAuthBootstrap() {
  return bootstrap;
}
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
function expire(message?: string) {
  clearLocalScheduleDrafts();
  accessToken = null;
  bootstrap = null;
  advanceAuthEpoch();
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent("church:session-expired", { detail: { message } }),
    );
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
export async function restoreAuthSession() {
  if (refreshFlight) return refreshFlight;
  const epoch = authEpoch;
  const run = async () => {
    if (epoch !== authEpoch) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let response: Response;
    let data: AuthBootstrap & { accessToken: string };
    try {
      response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "X-Church-CSRF": "1" },
        signal: controller.signal,
      });
      if (!response.ok)
        throw new ApiError(REAUTHENTICATION_MESSAGE, response.status);
      data = await response.json();
      if (
        typeof data?.accessToken !== "string" ||
        !data.accessToken ||
        !data.user?.id ||
        !Array.isArray(data.departments) ||
        typeof data.navigation?.hasAssignments !== "boolean"
      )
        throw new ApiError(REAUTHENTICATION_MESSAGE, 503);
    } finally {
      clearTimeout(timer);
    }
    if (epoch !== authEpoch) return null;
    accessToken = data.accessToken;
    bootstrap = {
      user: data.user,
      departments: data.departments,
      navigation: data.navigation,
    };
    return bootstrap;
  };
  // Serialize cookie rotation across tabs. Tokens never cross BroadcastChannel.
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  refreshFlight = (async () =>
    await (locks ? locks.request("church-refresh", run) : run()))()
    .catch(() => {
      if (epoch === authEpoch) expire(REAUTHENTICATION_MESSAGE);
      return null;
    })
    .finally(() => {
      refreshFlight = null;
    });
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
    if (await restoreAuthSession()) {
      if (typeof window !== "undefined")
        window.dispatchEvent(new Event("church:auth-refreshed"));
      response = await send();
      if (response.status === 401 && epoch === authEpoch)
        expire(REAUTHENTICATION_MESSAGE);
    }
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
  ) {
    accessToken = data.accessToken;
    if (data.user && data.departments && data.navigation)
      bootstrap = {
        user: data.user,
        departments: data.departments,
        navigation: data.navigation,
      };
  }
  return data as T;
}
