import { createHash } from "node:crypto";
import { z } from "zod";
import {
  composeWorshipInformationRequest,
  createWorshipViberDraftLink,
  isWorshipProgramText,
  type AuthUser,
} from "@org/core";
import { calendarEvent, calendarId, requireCalendar } from "./calendar";
import { type DB, pool, transaction } from "./db";
import { HttpError } from "./http";
import { isAdministrativeRead } from "./session";
import { audit } from "./members";
import { deliverMail } from "./mail";
import { escapeEventHtml, definiteFailure } from "./calendar-delivery";
import { worshipDraftOrigin, worshipViberEmail } from "./worship-viber-email";
export type WorshipNotificationType =
  "worship_information_request" | "worship_viber_draft";
import { WORSHIP_INFORMATION_RECIPIENT } from "./worship-constants";
export { WORSHIP_INFORMATION_RECIPIENT } from "./worship-constants";
function authorize(actor: AuthUser) {
  if (
    !["admin", "secretary"].includes(actor.role) &&
    !isAdministrativeRead(actor)
  )
    throw new HttpError(403, "Chỉ Admin được gửi yêu cầu bổ sung thông tin.");
  requireCalendar(actor, "calendar.notify");
}
export async function worshipInformationPreview(
  db: DB,
  actor: AuthUser,
  id: string,
) {
  authorize(actor);
  calendarId(id);
  const event = await calendarEvent(db, actor, id);
  if (
    event.presetId !== "worship-program" &&
    !isWorshipProgramText(event.originalText)
  )
    throw new HttpError(
      400,
      "Chương trình không phải chương trình thờ phượng.",
    );
  const information = composeWorshipInformationRequest(event.originalText);
  return {
    ...information,
    eventId: id,
    version: event.version,
    recipient: WORSHIP_INFORMATION_RECIPIENT,
    previewHash: createHash("sha256")
      .update(JSON.stringify([id, event.version, information.message]))
      .digest("hex"),
  };
}
const RequestInput = z
  .object({
    requestId: z.uuid(),
    version: z.number().int().nonnegative(),
    previewHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export async function prepareWorshipInformationRequest(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
  kind: WorshipNotificationType = "worship_information_request",
) {
  authorize(actor);
  calendarId(id);
  const f = RequestInput.parse(input);
  const previous = (
    await db.query(
      "SELECT * FROM church.notification_history WHERE request_id=$1",
      [f.requestId],
    )
  ).rows[0];
  if (previous) {
    if (
      previous.created_by !== actor.id ||
      previous.event_id !== id ||
      previous.event_version !== f.version ||
      previous.preview_hash !== f.previewHash ||
      previous.type !== kind
    )
      throw new HttpError(409, "Mã yêu cầu đã được sử dụng cho nội dung khác.");
    return { id: previous.id };
  }
  const preview = await worshipInformationPreview(db, actor, id);
  if (f.version !== preview.version || f.previewHash !== preview.previewHash)
    throw new HttpError(
      409,
      "Chương trình đã thay đổi. Hãy mở lại bản xem trước.",
    );
  if (!preview.missingFields.length)
    throw new HttpError(
      400,
      "Chương trình thờ phượng đã có đầy đủ thông tin. Không cần gửi yêu cầu bổ sung.",
    );
  if (kind === "worship_viber_draft") worshipDraftOrigin();
  const existing = (
    await db.query(
      "SELECT id FROM church.notification_history WHERE event_id=$1 AND event_version=$2 AND preview_hash=$3 AND type=$4 AND status IN('pending','sending','sent','uncertain') ORDER BY created_at DESC LIMIT 1",
      [id, preview.version, preview.previewHash, kind],
    )
  ).rows[0];
  if (existing) return { id: existing.id };
  if (
    (
      await db.query(
        "SELECT count(*)::int n FROM church.notification_history WHERE created_by=$1 AND created_at>now()-interval '15 minutes'",
        [actor.id],
      )
    ).rows[0].n >= 20
  )
    throw new HttpError(429, "Bạn đã gửi nhiều yêu cầu. Vui lòng thử lại sau.");
  const row = (
    await db.query(
      "INSERT INTO church.notification_history(request_id,event_id,event_version,created_by,type,recipient,preview_hash,message,missing_fields) VALUES($1,$2,$3,$4,$9,$5,$6,$7,$8) RETURNING id",
      [
        f.requestId,
        id,
        preview.version,
        actor.id,
        WORSHIP_INFORMATION_RECIPIENT,
        preview.previewHash,
        preview.message,
        JSON.stringify(preview.missingFields),
        kind,
      ],
    )
  ).rows[0];
  await audit(
    db,
    actor,
    actor.id,
    `${kind === "worship_viber_draft" ? "Gửi email bản nháp Viber" : "Yêu cầu bổ sung thông tin"} chương trình ${id}`,
  );
  return { id: row.id };
}
/** SMTP is outside the event/audit transaction. Only one sender can claim a request. */
export async function sendWorshipInformationRequest({ id }: { id: string }) {
  try {
    await pool().query(
      "UPDATE church.notification_history SET status='uncertain',safe_error='Tiến trình gián đoạn; kiểm tra máy chủ email trước khi gửi lại.' WHERE id=$1 AND status='sending' AND claimed_at<now()-interval '5 minutes'",
      [id],
    );
    const row = await transaction(async (db) => {
      const item = (
        await db.query(
          "SELECT h.*,e.deleted_at FROM church.notification_history h JOIN church.events e ON e.id=h.event_id WHERE h.id=$1 FOR UPDATE OF h",
          [id],
        )
      ).rows[0];
      if (!item) throw new HttpError(404, "Không tìm thấy yêu cầu.");
      if (item.status !== "pending") return null;
      if (item.deleted_at) {
        await db.query(
          "UPDATE church.notification_history SET status='failed',safe_error='Chương trình đã xóa; không gửi.' WHERE id=$1",
          [id],
        );
        return null;
      }
      await db.query(
        "UPDATE church.notification_history SET status='sending',claimed_at=now() WHERE id=$1",
        [id],
      );
      return item;
    });
    if (row) {
      let status = "sent",
        error: string | null = null;
      try {
        await deliverMail({
          to: WORSHIP_INFORMATION_RECIPIENT,
          from:
            process.env.SMTP_FROM ??
            process.env.SMTP_USER ??
            "local@church.test",
          ...(row.type === "worship_viber_draft"
            ? worshipViberEmail(row.message, id)
            : {
                subject: "Yêu cầu bổ sung thông tin chương trình thờ phượng",
                text: row.message,
                html: `<div style="white-space:pre-wrap">${escapeEventHtml(row.message)}</div>`,
              }),
          messageId: `<worship-information-${id}@church.local>`,
        });
      } catch (reason) {
        status = definiteFailure(reason) ? "failed" : "uncertain";
        error =
          status === "failed"
            ? "Chưa gửi được email. Bạn có thể mở lại và xác nhận gửi yêu cầu mới."
            : "Chưa xác định máy chủ đã nhận email hay chưa. Kiểm tra trước khi gửi lại.";
      }
      await pool().query(
        "UPDATE church.notification_history SET status=$2,safe_error=$3,sent_at=CASE WHEN $2='sent' THEN now() ELSE NULL END WHERE id=$1 AND status='sending'",
        [id, status, error],
      );
    }
    const record = (
      await pool().query(
        "SELECT status,recipient,message,event_version,missing_fields FROM church.notification_history WHERE id=$1",
        [id],
      )
    ).rows[0];
    return {
      id,
      success: record.status === "sent",
      status: record.status,
      recipient: record.recipient,
      version: record.event_version,
      missingFields: record.missing_fields,
      messagePreview: record.message,
    };
  } catch {
    // A lost DB write after SMTP must never invite an automatic duplicate send.
    return {
      id,
      success: false,
      status: "uncertain",
      recipient: WORSHIP_INFORMATION_RECIPIENT,
      message:
        "Chưa xác nhận được kết quả email. Kiểm tra máy chủ trước khi gửi lại.",
    };
  }
}

export async function savedWorshipViberDraft(
  db: DB,
  actor: AuthUser,
  id: string,
  latest = false,
) {
  authorize(actor);
  calendarId(id);
  const row = (
    await db.query(
      "SELECT event_id,event_version,message,missing_fields,status FROM church.notification_history WHERE id=$1 AND type='worship_viber_draft'",
      [id],
    )
  ).rows[0];
  if (!row) throw new HttpError(404, "Không tìm thấy bản nháp Viber.");
  const event = await calendarEvent(db, actor, row.event_id);
  if (latest) {
    const info = composeWorshipInformationRequest(event.originalText);
    return {
      ...info,
      eventId: event.id,
      version: event.version,
      status: row.status,
      viberLink: createWorshipViberDraftLink(info.message),
    };
  }
  return {
    eventId: row.event_id,
    version: row.event_version,
    message: row.message,
    missingFields: row.missing_fields,
    status: row.status,
    viberLink: createWorshipViberDraftLink(row.message),
  };
}

/** Explicit failure-bell retry; all content comes from the failed saved snapshot. */
export async function prepareWorshipViberRetry(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
) {
  authorize(actor);
  calendarId(id);
  const { requestId } = z.object({ requestId: z.uuid() }).strict().parse(input);
  const original = (
    await db.query(
      "SELECT * FROM church.notification_history WHERE id=$1 AND type='worship_viber_draft'",
      [id],
    )
  ).rows[0];
  if (!original) throw new HttpError(404, "Không tìm thấy email bản nháp.");
  await calendarEvent(db, actor, original.event_id);
  const previous = (
    await db.query(
      "SELECT * FROM church.notification_history WHERE request_id=$1",
      [requestId],
    )
  ).rows[0];
  if (previous) {
    if (
      previous.created_by !== actor.id ||
      previous.event_id !== original.event_id ||
      previous.event_version !== original.event_version ||
      previous.preview_hash !== original.preview_hash ||
      previous.type !== original.type
    )
      throw new HttpError(409, "Mã thử lại đã được sử dụng.");
    return { id: previous.id };
  }
  const active = (
    await db.query(
      "SELECT id FROM church.notification_history WHERE event_id=$1 AND event_version=$2 AND type='worship_viber_draft' AND status IN('pending','sending','sent','uncertain') LIMIT 1",
      [original.event_id, original.event_version],
    )
  ).rows[0];
  if (active) return { id: active.id };
  if (original.status !== "failed")
    throw new HttpError(400, "Chỉ có thể thử lại email thất bại rõ ràng.");
  const attempts = (
    await db.query(
      "SELECT count(*)::int n FROM church.notification_history WHERE event_id=$1 AND event_version=$2 AND type='worship_viber_draft'",
      [original.event_id, original.event_version],
    )
  ).rows[0].n;
  if (attempts >= 5) throw new HttpError(400, "Đã đạt giới hạn thử lại.");
  const recent = (
    await db.query(
      "SELECT count(*)::int n FROM church.notification_history WHERE created_by=$1 AND created_at>now()-interval '15 minutes'",
      [actor.id],
    )
  ).rows[0].n;
  if (recent >= 20)
    throw new HttpError(429, "Bạn đã gửi nhiều yêu cầu. Vui lòng thử lại sau.");
  const row = (
    await db.query(
      "INSERT INTO church.notification_history(request_id,event_id,event_version,created_by,type,recipient,preview_hash,message,missing_fields) VALUES($1,$2,$3,$4,'worship_viber_draft',$5,$6,$7,$8) RETURNING id",
      [
        requestId,
        original.event_id,
        original.event_version,
        actor.id,
        WORSHIP_INFORMATION_RECIPIENT,
        original.preview_hash,
        original.message,
        JSON.stringify(original.missing_fields),
      ],
    )
  ).rows[0];
  await audit(db, actor, actor.id, `Thử lại email bản nháp Viber ${id}`);
  return { id: row.id };
}
export async function sendWorshipViberRetry(result: { id: string }) {
  const sent = await sendWorshipInformationRequest(result);
  return {
    count: 1,
    delivery: {
      sent: sent.status === "sent" ? 1 : 0,
      failed: sent.status === "failed" ? 1 : 0,
      uncertain: sent.status === "uncertain" ? 1 : 0,
      sending: sent.status === "sending" ? 1 : 0,
    },
  };
}
