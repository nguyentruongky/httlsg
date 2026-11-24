import { createHash, createHmac, randomBytes } from "node:crypto";
import { HttpError } from "../http";
export const publicVoterCookie = () =>
  process.env.NODE_ENV === "production"
    ? "__Host-church-public-voter"
    : "church-public-voter";
export const publicVoterCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 365 * 86400,
};
export const publicNonce = () => randomBytes(32).toString("base64url");
export function publicCredentialHash(kind: string, value: string) {
  // The high-entropy browser credential stays stable across server-secret rotation.
  if (kind === "voter")
    return createHash("sha256").update(`public-voter:${value}`).digest("hex");
  const key = Buffer.from(process.env.SESSION_SECRET ?? "", "base64");
  if (key.length !== 32)
    throw new HttpError(
      503,
      "Máy chủ chưa được cấu hình bảo mật phiên bầu cử.",
      "PUBLIC_SESSION_SECRET_MISSING",
    );
  return createHmac("sha256", key).update(`${kind}:${value}`).digest("hex");
}
export function publicBrowserCredential(request: Request) {
  const value = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(publicVoterCookie() + "="))
    ?.slice(publicVoterCookie().length + 1);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : publicNonce();
}
