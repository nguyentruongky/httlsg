import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { HttpError } from "../http";

function encryptionKey() {
  const key = Buffer.from(process.env.SESSION_SECRET ?? "", "base64");
  if (key.length !== 32)
    throw new HttpError(503, "Máy chủ chưa được cấu hình bảo mật OTP.");
  return key;
}
export function encryptElectionOtp(pin: string, sessionId: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  cipher.setAAD(Buffer.from(`election-otp:${sessionId}`));
  const ciphertext = Buffer.concat([
    cipher.update(pin, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString(
    "base64url",
  );
}
export function decryptElectionOtp(value: string, sessionId: string) {
  try {
    const bytes = Buffer.from(value, "base64url");
    const cipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      bytes.subarray(0, 12),
    );
    cipher.setAAD(Buffer.from(`election-otp:${sessionId}`));
    cipher.setAuthTag(bytes.subarray(12, 28));
    return Buffer.concat([
      cipher.update(bytes.subarray(28)),
      cipher.final(),
    ]).toString("utf8");
  } catch {
    throw new HttpError(
      503,
      "Không thể giải mã danh sách OTP. Kiểm tra SESSION_SECRET gốc của máy chủ.",
    );
  }
}
