import { createHash } from "node:crypto";
import { z } from "zod";
import { ExportInput, displayCalendarDate, type AuthUser } from "@org/core";
import { type DB, transaction, pool } from "./db";
import { requireCalendar } from "./calendar";
import { HttpError } from "./http";
import { audit } from "./members";
import { deliverMail } from "./mail";
import { escapeEventHtml, definiteFailure } from "./calendar-delivery";
const recipients = ["btt.httlsaigon@gmail.com", "nguyentruongky33@gmail.com"];
const Input = z.object({ requestId: z.uuid(), preview: ExportInput }).strict();

export async function queueCalendarExportEmail(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  requireCalendar(actor, "calendar.export");
  requireCalendar(actor, "calendar.notify");
  const f = Input.parse(input);
  const hash = createHash("sha256")
    .update(JSON.stringify(f.preview))
    .digest("hex");
  await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    "calendar-export-email:" + f.requestId,
  ]);
  const previous = (
    await db.query(
      "SELECT created_by,request_hash FROM church.calendar_export_emails WHERE request_id=$1 LIMIT 1",
      [f.requestId],
    )
  ).rows[0];
  if (previous) {
    if (previous.created_by !== actor.id || previous.request_hash !== hash)
      throw new HttpError(
        409,
        "Mã gửi email đã được sử dụng cho nội dung khác.",
      );
    return { requestId: f.requestId };
  }
  const count = (
    await db.query(
      "SELECT count(DISTINCT request_id)::int n FROM church.calendar_export_emails WHERE created_by=$1 AND created_at>now()-interval '15 minutes'",
      [actor.id],
    )
  ).rows[0].n;
  if (count >= 20)
    throw new HttpError(
      429,
      "Đã gửi quá nhiều email. Vui lòng thử lại sau 15 phút.",
    );
  await db.query(
    "INSERT INTO church.calendar_export_emails(request_id,created_by,recipient,request_hash,from_date,to_date,preview_text) SELECT $1,$2,unnest($3::text[]),$4,$5,$6,$7",
    [
      f.requestId,
      actor.id,
      recipients,
      hash,
      f.preview.from,
      f.preview.to,
      f.preview.text,
    ],
  );
  await audit(
    db,
    actor,
    actor.id,
    `Gửi lịch ${f.preview.from} – ${f.preview.to} đến Ban Trình chiếu`,
  );
  return { requestId: f.requestId };
}
/** After commit, claim each address once. Never retry ambiguous SMTP acceptance. */
export async function sendCalendarExportEmail({
  requestId,
}: {
  requestId: string;
}) {
  await pool().query(
    "UPDATE church.calendar_export_emails SET status='uncertain' WHERE request_id=$1 AND status='sending' AND claimed_at<now()-interval '5 minutes'",
    [requestId],
  );
  await Promise.all(
    recipients.map(async (recipient) => {
      const row = await transaction(
        async (db) =>
          (
            await db.query(
              "UPDATE church.calendar_export_emails SET status='sending',attempts=attempts+1,claimed_at=now() WHERE request_id=$1 AND recipient=$2 AND status IN('pending','failed') AND attempts<5 RETURNING *",
              [requestId, recipient],
            )
          ).rows[0],
      );
      if (!row) return;
      let status = "sent";
      try {
        await deliverMail({
          to: recipient,
          from:
            process.env.SMTP_FROM ??
            process.env.SMTP_USER ??
            "local@church.test",
          subject: `Lịch chương trình — Ban Trình chiếu — ${displayCalendarDate(row.from_date)} – ${displayCalendarDate(row.to_date)}`,
          text: row.preview_text,
          html: `<div style="white-space:pre-wrap">${escapeEventHtml(row.preview_text)}</div>`,
          messageId: `<calendar-export-${row.id}@church.local>`,
        });
      } catch (error) {
        status = definiteFailure(error) ? "failed" : "uncertain";
      }
      // If this write fails, leave the sending lease for manual review, not resend.
      await pool().query(
        "UPDATE church.calendar_export_emails SET status=$2,sent_at=CASE WHEN $2='sent' THEN now() ELSE NULL END WHERE id=$1 AND status='sending'",
        [row.id, status],
      );
    }),
  );
  const rows = (
    await pool().query(
      "SELECT status,attempts FROM church.calendar_export_emails WHERE request_id=$1",
      [requestId],
    )
  ).rows;
  return {
    requestId,
    sent: rows.filter((row) => row.status === "sent").length,
    failed: rows.filter((row) => row.status === "failed").length,
    uncertain: rows.filter((row) => row.status === "uncertain").length,
    sending: rows.filter((row) => ["pending", "sending"].includes(row.status))
      .length,
    exhausted: rows.some((row) => row.status === "failed" && row.attempts >= 5),
  };
}
