import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { HttpError } from "./http";
export function emailDeliveryConfigured() {
  const smtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  const local =
    process.env.EMAIL_DELIVERY_MODE === "file" &&
    process.env.NODE_ENV !== "production";
  return smtp || local;
}
export async function sendOtpEmail(to: string, code: string) {
  await deliver({
    to,
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "local@church.test",
    subject: "Mã xác thực đăng nhập",
    text: `Mã xác thực của bạn: ${code}\n\nMã có hiệu lực trong 10 phút và chỉ sử dụng một lần. Không chia sẻ mã này với người khác. Nếu không yêu cầu đăng nhập, bạn có thể bỏ qua email này.`,
  });
}
export async function sendPhoneOtpAdminEmail(
  name: string,
  phone: string,
  code: string,
) {
  await deliver({
    to: "nguyentruongky33@gmail.com",
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "local@church.test",
    subject: "Yêu cầu OTP đăng nhập bằng số điện thoại",
    text: `Thành viên: ${name}\nSố điện thoại: ${phone}\nMã OTP: ${code}\n\nMã có hiệu lực trong 24 giờ và chỉ sử dụng một lần. Mã mới thay thế mã trước đó. Vui lòng xác minh danh tính thành viên trước khi cung cấp mã. Bạn cũng có thể xem mã còn hiệu lực trong danh sách Mã OTP.`,
  });
}
async function deliver(message: {
  to: string;
  from: string;
  subject: string;
  text: string;
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
      process.env.OTP_OUTBOX_DIR ??
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
