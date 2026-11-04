import { resolve } from "node:path";
import nodemailer from "nodemailer";
async function main() {
  process.loadEnvFile(resolve("apps/web-admin/.env.local"));
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS)
    throw new Error("SMTP_USER or SMTP_PASS is missing.");
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });
  try {
    await transport.verify();
    console.log(
      "SMTP connection and authentication verified. No email was sent.",
    );
  } finally {
    transport.close();
  }
}
void main().catch((error) => {
  console.error(
    error instanceof Error &&
      error.message === "SMTP_USER or SMTP_PASS is missing."
      ? error.message
      : "SMTP verification failed. Check host, port, credentials, and provider app-password settings. No credentials were printed.",
  );
  process.exitCode = 1;
});
