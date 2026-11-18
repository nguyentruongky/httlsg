import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { HttpError } from "./http";
export async function deliverMail(message: {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  messageId?: string;
}) {
  // SMTP credentials take precedence over the development outbox.
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      socketTimeout: 15000,
    });
    await transport.sendMail(message);
    return;
  }
  if (
    process.env.EMAIL_DELIVERY_MODE === "file" &&
    process.env.NODE_ENV !== "production"
  ) {
    const directory =
      process.env.MAIL_OUTBOX_DIR ??
      resolve(process.cwd(), "../../.local-data/mail-outbox");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(
      resolve(directory, `${randomUUID()}.json`),
      JSON.stringify(message),
      { mode: 0o600, flag: "wx" },
    );
    return;
  }
  throw new HttpError(
    503,
    "Gửi email chưa được cấu hình. Vui lòng liên hệ quản trị viên.",
  );
}
