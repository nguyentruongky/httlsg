import { z } from "zod";
import {
  NotificationInput,
  type AuthUser,
  type CalendarEvent,
} from "@org/core";
import type { DB } from "../db";
import { HttpError } from "../http";
import { audit } from "../members";
import { requireCalendar, calendarId } from "./policy";
import { calendarEvent } from "./event-queries";

export async function queueEventNotification(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
  kind: "created" | "updated" = "updated",
  savedEvent?: CalendarEvent,
) {
  requireCalendar(actor, "calendar.notify");
  calendarId(id);
  const f = NotificationInput.parse(input);
  // Batch the independent reads; serial awaits on one connection add remote RTTs.
  const state = (
    await db.query(
      `SELECT
      (SELECT row_to_json(n) FROM (SELECT id,event_id FROM church.event_notifications WHERE request_id=$1) n) AS previous,
      (SELECT count(*)::int FROM church.event_notifications WHERE created_by=$2 AND created_at>now()-interval '15 minutes') AS recent_count,
      COALESCE((SELECT json_agg(g ORDER BY g.name) FROM (
        SELECT g.id,g.name FROM church.event_email_groups eg JOIN church.email_groups g ON g.id=eg.group_id
        WHERE eg.event_id=$3 AND g.deleted_at IS NULL
      ) g),'[]'::json) AS groups,
      ARRAY(SELECT DISTINCT m.email FROM church.email_group_members m
        JOIN church.event_email_groups eg ON eg.group_id=m.group_id
        JOIN church.email_groups g ON g.id=m.group_id
        WHERE eg.event_id=$3 AND g.deleted_at IS NULL ORDER BY m.email LIMIT 5001) AS emails`,
      [f.requestId, actor.id, id],
    )
  ).rows[0];
  if (state.previous) {
    if (state.previous.event_id !== id)
      throw new HttpError(409, "Mã gửi đã được sử dụng.");
    return { id: state.previous.id as string };
  }
  if (state.recent_count >= 20)
    throw new HttpError(429, "Tối đa 20 lần gửi trong 15 phút.");
  const event = savedEvent ?? (await calendarEvent(db, actor, id));
  const groups = state.groups as { id: string; name: string }[];
  if (!groups.length)
    throw new HttpError(400, "Chọn ít nhất một nhóm email trước khi gửi.");
  if (state.emails.length > 5000)
    throw new HttpError(400, "Mỗi lần gửi tối đa 5.000 địa chỉ.");
  const emails = (state.emails as string[]).map((email) =>
    z.email().max(254).parse(email),
  );
  const batch = (
    await db.query(
      `WITH batch AS (
      INSERT INTO church.event_notifications(event_id,request_id,kind,snapshot,group_names,created_by,group_ids)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id
    ), deliveries AS (
      INSERT INTO church.event_notification_deliveries(notification_id,email)
      SELECT batch.id,email FROM batch CROSS JOIN unnest($8::text[]) AS recipient(email)
    ), audit AS (
      INSERT INTO church.audit_log(actor_id,subject_id,action)
      SELECT $6,$6,'Xếp hàng thông báo '||batch.id::text||': '||cardinality($8::text[])::text||' người nhận' FROM batch
    ) SELECT id FROM batch`,
      [
        id,
        f.requestId,
        kind,
        JSON.stringify({
          eventDate: event.eventDate,
          title: event.title,
          timeText: event.timeText,
          details: event.details,
        }),
        groups.map((g) => g.name),
        actor.id,
        groups.map((g) => g.id),
        emails,
      ],
    )
  ).rows[0];
  return { id: batch.id as string, count: emails.length };
}

export async function notificationHistory(db: DB, actor: AuthUser, id: string) {
  requireCalendar(actor, "calendar.notify");
  calendarId(id);
  await calendarEvent(db, actor, id, true);
  const batches = (
    await db.query(
      `SELECT n.id,n.kind,n.created_at "createdAt",n.group_names "groupNames",COALESCE((SELECT jsonb_object_agg(status,n) FROM (SELECT status,count(*)::int n FROM church.event_notification_deliveries WHERE notification_id=n.id GROUP BY status) counts),'{}') counts FROM church.event_notifications n WHERE event_id=$1 ORDER BY n.created_at DESC,n.id`,
      [id],
    )
  ).rows;
  return { items: batches };
}

export async function notificationDeliveries(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
) {
  requireCalendar(actor, "calendar.notify");
  calendarId(id);
  const { page } = z
    .object({ page: z.coerce.number().int().min(1).max(1000).default(1) })
    .strict()
    .parse(input);
  const batch = (
    await db.query("SELECT id FROM church.event_notifications WHERE id=$1", [
      id,
    ])
  ).rows[0];
  if (!batch) throw new HttpError(404, "Không tìm thấy thông báo.");
  const total = (
    await db.query(
      "SELECT count(*)::int n FROM church.event_notification_deliveries WHERE notification_id=$1",
      [id],
    )
  ).rows[0].n;
  const items = (
    await db.query(
      'SELECT id,email,status,attempts,safe_error error,sent_at "sentAt" FROM church.event_notification_deliveries WHERE notification_id=$1 ORDER BY created_at,id LIMIT 50 OFFSET $2',
      [id, (page - 1) * 50],
    )
  ).rows;
  return { items, total, page };
}

export async function retryNotification(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
) {
  requireCalendar(actor, "calendar.notify");
  calendarId(id);
  const f = NotificationInput.parse(input);
  const old = (
    await db.query(
      "SELECT notification_id,count FROM church.event_notification_retries WHERE request_id=$1",
      [f.requestId],
    )
  ).rows[0];
  if (old) {
    if (old.notification_id !== id)
      throw new HttpError(409, "Mã thử lại đã được sử dụng.");
    return { count: old.count, notificationId: id };
  }
  if (
    (
      await db.query(
        "SELECT count(*)::int n FROM church.event_notification_retries WHERE created_by=$1 AND created_at>now()-interval '15 minutes'",
        [actor.id],
      )
    ).rows[0].n >= 20
  )
    throw new HttpError(429, "Tối đa 20 lần thử lại trong 15 phút.");
  const batch = (
    await db.query(
      "SELECT n.id,e.deleted_at FROM church.event_notifications n JOIN church.events e ON e.id=n.event_id WHERE n.id=$1",
      [id],
    )
  ).rows[0];
  if (!batch) throw new HttpError(404, "Không tìm thấy thông báo.");
  if (batch.deleted_at)
    throw new HttpError(409, "Không gửi lại chương trình đã xóa.");
  const queued = await db.query(
    "UPDATE church.event_notification_deliveries SET status='pending',safe_error=NULL WHERE notification_id=$1 AND status='failed' AND attempts<5 RETURNING id",
    [id],
  );
  await db.query(
    "INSERT INTO church.event_notification_retries(request_id,notification_id,count,created_by) VALUES($1,$2,$3,$4)",
    [f.requestId, id, queued.rowCount, actor.id],
  );
  await audit(
    db,
    actor,
    actor.id,
    `Thử lại thông báo ${id}: ${queued.rowCount} người nhận`,
  );
  return { count: queued.rowCount, notificationId: id };
}

export async function resolveDelivery(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
) {
  requireCalendar(actor, "calendar.notify");
  calendarId(id);
  const f = z
    .object({
      status: z.enum(["sent", "failed"]),
      attempt: z.number().int().positive(),
    })
    .strict()
    .parse(input);
  const result = await db.query(
    "UPDATE church.event_notification_deliveries SET status=$2,safe_error='Admin đã xác minh kết quả gửi.',sent_at=CASE WHEN $2='sent' THEN now() ELSE NULL END WHERE id=$1 AND status='uncertain' AND attempts=$3 RETURNING id",
    [id, f.status, f.attempt],
  );
  if (!result.rowCount)
    throw new HttpError(409, "Kết quả gửi đã thay đổi. Vui lòng tải lại.");
  await audit(db, actor, actor.id, `Xác minh kết quả gửi ${id}: ${f.status}`);
  return { ok: true };
}

export async function allNotificationHistory(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  requireCalendar(actor, "calendar.notify");
  const { page } = z
    .object({ page: z.coerce.number().int().min(1).max(100000).default(1) })
    .strict()
    .parse(input);
  const total = (
    await db.query("SELECT count(*)::int n FROM church.event_notifications")
  ).rows[0].n;
  const items = (
    await db.query(
      `SELECT n.id,n.event_id "eventId",n.snapshot->>'title' title,n.snapshot->>'eventDate' "eventDate",(e.deleted_at IS NOT NULL) "eventDeleted",n.kind,n.created_at "createdAt",n.group_names "groupNames",COALESCE((SELECT jsonb_object_agg(status,n) FROM (SELECT status,count(*)::int n FROM church.event_notification_deliveries WHERE notification_id=n.id GROUP BY status) counts),'{}') counts FROM church.event_notifications n JOIN church.events e ON e.id=n.event_id ORDER BY n.created_at DESC,n.id LIMIT 20 OFFSET $1`,
      [(page - 1) * 20],
    )
  ).rows;
  return { items, total, page };
}

// Failure notifications are derived from durable delivery outcomes. Successful
// retries automatically clear the alert without a separate mutable inbox flag.
export async function calendarFailureNotifications(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  requireCalendar(actor, "calendar.notify");
  const { page } = z
    .object({ page: z.coerce.number().int().min(1).max(100000).default(1) })
    .strict()
    .parse(input);
  const feed = `SELECT n.id,'calendar'::text kind,n.snapshot->>'title' title,n.snapshot->>'eventDate' "eventDate",n.created_at "createdAt",
    (SELECT count(*)::int FROM church.event_notification_deliveries d WHERE d.notification_id=n.id AND d.status='failed') failed,
    (SELECT count(*)::int FROM church.event_notification_deliveries d WHERE d.notification_id=n.id AND d.status='failed' AND d.attempts<5) retryable,
    (SELECT count(*)::int FROM church.event_notification_deliveries d WHERE d.notification_id=n.id AND (d.status='uncertain' OR (d.status='sending' AND d.claimed_at<now()-interval '5 minutes'))) uncertain
    FROM church.event_notifications n JOIN church.events e ON e.id=n.event_id WHERE e.deleted_at IS NULL AND EXISTS(SELECT 1 FROM church.event_notification_deliveries d WHERE d.notification_id=n.id AND (d.status IN ('failed','uncertain') OR (d.status='sending' AND d.claimed_at<now()-interval '5 minutes')))
    UNION ALL
    SELECT h.id,'worship_viber'::text kind,split_part(ltrim(h.message),E'\\n',1) title,e.event_date::text "eventDate",h.created_at "createdAt",
    CASE WHEN h.status='failed' THEN 1 ELSE 0 END failed,
    CASE WHEN h.status='failed' AND (SELECT count(*) FROM church.notification_history a WHERE a.event_id=h.event_id AND a.event_version=h.event_version AND a.type=h.type)<5 THEN 1 ELSE 0 END retryable,
    CASE WHEN h.status='uncertain' OR h.status='sending' THEN 1 ELSE 0 END uncertain
    FROM church.notification_history h JOIN church.events e ON e.id=h.event_id
    WHERE e.deleted_at IS NULL AND h.type='worship_viber_draft' AND (h.status IN('failed','uncertain') OR (h.status='sending' AND h.claimed_at<now()-interval '5 minutes'))
    AND NOT EXISTS(SELECT 1 FROM church.notification_history newer WHERE newer.event_id=h.event_id AND newer.event_version=h.event_version AND newer.type=h.type AND (newer.created_at,newer.id)>(h.created_at,h.id))`;
  const total = (await db.query(`SELECT count(*)::int n FROM (${feed}) alerts`))
    .rows[0].n;
  const items = (
    await db.query(
      `SELECT * FROM (${feed}) alerts ORDER BY "createdAt" DESC,id LIMIT 20 OFFSET $1`,
      [(page - 1) * 20],
    )
  ).rows;
  return { items, total, page };
}
