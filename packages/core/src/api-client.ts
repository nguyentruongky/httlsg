let enabled = false;
let authEpoch = 0;
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
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const requestEpoch = authEpoch;
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (
      response.status === 401 &&
      requestEpoch === authEpoch &&
      !["/api/auth/login", "/api/auth/verify-otp"].includes(path) &&
      typeof window !== "undefined"
    )
      window.dispatchEvent(new Event("church:session-expired"));
    throw new ApiError(
      data?.message ?? "Không thể xử lý yêu cầu.",
      response.status,
    );
  }
  return data as T;
}
