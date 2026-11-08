import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { z } from "zod";
export function pushConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? "",
    privateKey = process.env.VAPID_PRIVATE_KEY ?? "",
    subject = process.env.VAPID_SUBJECT ?? "";
  if (
    !/^[A-Za-z0-9_-]{87}$/.test(publicKey) ||
    !/^[A-Za-z0-9_-]{43}$/.test(privateKey) ||
    !z
      .string()
      .regex(/^(mailto:[^\s@]+@[^\s@]+\.[^\s@]+|https:\/\/[^\s]+)$/)
      .safeParse(subject).success
  )
    return null;
  return { publicKey, privateKey, subject };
}
function key() {
  const raw = Buffer.from(process.env.SESSION_SECRET ?? "", "base64");
  if (raw.length !== 32) throw new Error("Push storage is not configured");
  return createHash("sha256")
    .update(raw)
    .update("church-push-storage-v1")
    .digest();
}
export const endpointHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function encryptSubscription(value: unknown) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), data]
    .map((item) => item.toString("base64url"))
    .join(".");
}
export function decryptSubscription(value: string) {
  const [iv, tag, data] = value
    .split(".")
    .map((item) => Buffer.from(item, "base64url"));
  const cipher = createDecipheriv("aes-256-gcm", key(), iv);
  cipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8"),
  );
}
