import { createHmac } from "node:crypto";
export function otpSecret(label: string) {
  const master = Buffer.from(process.env.OTP_SECRET ?? "", "base64");
  if (master.length !== 32)
    throw new Error("OTP_SECRET must contain 32 random bytes");
  return createHmac("sha256", master).update(label).digest();
}
