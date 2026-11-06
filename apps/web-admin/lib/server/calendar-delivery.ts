import { transaction, pool } from "./db";
import { deliverMail } from "./mail";
import { displayCalendarDate } from "@org/core";
export function escapeEventHtml(text: string) {
  return text.replace(
    /[&<>"']/g,
    (v) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        v
      ]!,
  );
}
export function eventEmail(snapshot: {
  title: string;
  eventDate: string;
  timeText: string | null;
  details: string;
}) {
  const text = [
    snapshot.title,
    displayCalendarDate(snapshot.eventDate, true),
    snapshot.timeText ?? "",
    snapshot.details,
    "",
    "Hội Thánh — Lịch chương trình",
    "Bạn nhận được thông báo này vì địa chỉ của bạn thuộc nhóm email được chọn khi gửi.",
  ]
    .filter((v, i) => v || i > 2)
    .join("\n");
  return {
    subject: `Lịch chương trình: ${snapshot.title}`,
    text,
    html: `<h1>${escapeEventHtml(snapshot.title)}</h1><p>${escapeEventHtml(displayCalendarDate(snapshot.eventDate, true))}${snapshot.timeText ? "<br>" + escapeEventHtml(snapshot.timeText) : ""}</p><div style="white-space:pre-wrap">${escapeEventHtml(snapshot.details)}</div><hr><p>Hội Thánh — Lịch chương trình</p><p>Bạn nhận được thông báo này vì địa chỉ của bạn thuộc nhóm email được chọn khi gửi.</p>`,
  };
}
export function definiteFailure(error: unknown) {
  const e = (error && typeof error === "object" ? error : {}) as {
    code?: string;
    responseCode?: number;
    command?: string;
    status?: number;
  };
  return (
    (e.responseCode !== undefined && e.responseCode >= 400) ||
    [
      "EAUTH",
      "EDNS",
      "ECONNECTION",
      "ETLS",
      "EENVELOPE",
      "ERECIPIENT",
    ].includes(e.code ?? "") ||
    [
      "CONN",
      "EHLO",
      "HELO",
      "STARTTLS",
      "AUTH",
      "MAIL FROM",
      "RCPT TO",
    ].includes(e.command ?? "") ||
    e.status === 503
  );
}
export async function processCalendarOutbox(limit = 25) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new Error("Invalid delivery limit");
  return deliverCalendarItems(limit, null, 1);
}
// Normal saves send their own batch immediately, never a different event's
// pending mail. Durable claims also coordinate with the optional recovery CLI.
export async function sendCalendarNotificationNow(notificationId: string) {
  await deliverCalendarItems(5000, notificationId, 4);
  const rows = (
    await pool().query(
      "SELECT status,count(*)::int n FROM church.event_notification_deliveries WHERE notification_id=$1 GROUP BY status",
      [notificationId],
    )
  ).rows;
  const result = {
    pending: 0,
    sending: 0,
    sent: 0,
    failed: 0,
    uncertain: 0,
    cancelled: 0,
  };
  for (const row of rows) result[row.status as keyof typeof result] = row.n;
  return result;
}
async function deliverCalendarItems(
  limit: number,
  notificationId: string | null,
  concurrency: number,
) {
  await pool().query(
    "UPDATE church.event_notification_deliveries SET status='uncertain',safe_error='Tiến trình bị gián đoạn. Kiểm tra máy chủ email trước khi gửi lại.' WHERE status='sending' AND claimed_at<now()-interval '5 minutes' AND ($1::uuid IS NULL OR notification_id=$1)",
    [notificationId],
  );
  const counts = { sent: 0, failed: 0, uncertain: 0 };
  let allocated = 0;
  async function deliverNext() {
    while (allocated++ < limit) {
      const job = await transaction(async (db) => {
        const row = (
          await db.query(
            "SELECT d.id FROM church.event_notification_deliveries d WHERE d.status='pending' AND ($1::uuid IS NULL OR d.notification_id=$1) ORDER BY d.created_at,d.id FOR UPDATE SKIP LOCKED LIMIT 1",
            [notificationId],
          )
        ).rows[0];
        if (!row) return null;
        return (
          await db.query(
            "UPDATE church.event_notification_deliveries SET status='sending',attempts=attempts+1,claimed_at=now(),last_attempted_at=now() WHERE id=$1 RETURNING id,email,notification_id,attempts",
            [row.id],
          )
        ).rows[0];
      });
      if (!job) return;
      const batch = (
        await pool().query(
          "SELECT snapshot FROM church.event_notifications WHERE id=$1",
          [job.notification_id],
        )
      ).rows[0];
      let status: "sent" | "failed" | "uncertain" = "sent",
        error: string | null = null;
      try {
        await deliverMail({
          to: job.email,
          from:
            process.env.SMTP_FROM ??
            process.env.SMTP_USER ??
            "local@church.test",
          ...eventEmail(batch.snapshot),
          messageId: `<calendar-${job.id}@church.local>`,
        });
      } catch (reason) {
        status = definiteFailure(reason) ? "failed" : "uncertain";
        error =
          status === "failed"
            ? "Máy chủ email từ chối hoặc chưa sẵn sàng. Có thể thử lại."
            : "Chưa xác định máy chủ đã nhận email hay chưa. Kiểm tra trước khi thử lại.";
      }
      // If recording SMTP acceptance fails, the durable sending lease becomes
      // uncertain. A retry must not assume that this message was never sent.
      const updated = await pool().query(
        "UPDATE church.event_notification_deliveries SET status=$2,sent_at=CASE WHEN $2='sent' THEN now() ELSE NULL END,safe_error=$3 WHERE id=$1 AND status='sending' AND attempts=$4",
        [job.id, status, error, job.attempts],
      );
      if (updated.rowCount) counts[status]++;
      else counts.uncertain++;
    }
  }
  // Await every already-started send even if another runner loses its DB
  // connection. Never leave untracked in-process SMTP work after a response.
  const finished = await Promise.allSettled(
    Array.from({ length: concurrency }, deliverNext),
  );
  const failed = finished.find((result) => result.status === "rejected");
  if (failed?.status === "rejected") throw failed.reason;
  return counts;
}
