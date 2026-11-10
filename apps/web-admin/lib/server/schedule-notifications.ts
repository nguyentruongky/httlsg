import type { ScheduleRecord } from "@org/core";
import { PushPayload } from "@org/core";
import { pool, transaction, type DB } from "./db";
import { pushConfig } from "./push-config";
import { LIVE_PUSH } from "./push-subscriptions";
import { sendPush, recordOutcome } from "./push-delivery";
export async function queueScheduleNotifications(
  db: DB,
  schedule: ScheduleRecord,
  changes: { memberId: string; kind: string }[],
) {
  await db.query("SAVEPOINT schedule_notifications");
  try {
    for (const change of changes) {
      const result = await db.query(
        "INSERT INTO church.schedule_notifications(schedule_id,schedule_version,member_id,kind,schedule_title) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id",
        [
          schedule.id,
          schedule.version,
          change.memberId,
          change.kind,
          schedule.title,
        ],
      );
      if (!result.rowCount || !pushConfig()) continue;
      await db.query(
        `INSERT INTO church.schedule_push_deliveries(notification_id,subscription_id) SELECT $1,s.id FROM church.push_subscriptions s JOIN church.users u ON u.id=s.user_id WHERE s.user_id=$2 AND ${LIVE_PUSH} ON CONFLICT DO NOTHING`,
        [result.rows[0].id, change.memberId],
      );
    }
    await db.query("RELEASE SAVEPOINT schedule_notifications");
  } catch {
    await db.query("ROLLBACK TO SAVEPOINT schedule_notifications");
    await db.query("RELEASE SAVEPOINT schedule_notifications");
    console.warn("Schedule notification queue unavailable");
  }
}
export async function sendSchedulePushNow(scheduleId?: string) {
  if (!pushConfig()) return { sent: 0, failed: 0, processed: 0 };
  const rows = await transaction(async (db) => {
    await db.query(
      "UPDATE church.schedule_push_deliveries SET status='uncertain',safe_error='unconfirmed' WHERE status='sending' AND claimed_at<now()-interval '5 minutes'",
    );
    return (
      await db.query(
        `WITH ready AS (SELECT d.notification_id,d.subscription_id FROM church.schedule_push_deliveries d JOIN church.schedule_notifications n ON n.id=d.notification_id WHERE ($1::uuid IS NULL OR n.schedule_id=$1) AND d.status IN ('pending','failed') AND d.attempts<3 AND d.next_attempt_at<=now() ORDER BY d.created_at FOR UPDATE OF d SKIP LOCKED LIMIT 30) UPDATE church.schedule_push_deliveries d SET status='sending',attempts=d.attempts+1,claimed_at=now() FROM ready WHERE d.notification_id=ready.notification_id AND d.subscription_id=ready.subscription_id RETURNING d.notification_id,d.subscription_id`,
        [scheduleId ?? null],
      )
    ).rows;
  });
  let sent = 0,
    failed = 0;
  for (let i = 0; i < rows.length; i += 10)
    await Promise.allSettled(
      rows.slice(i, i + 10).map(async (row) => {
        const target = (
          await pool().query(
            `SELECT s.id,s.user_id,s.subscription_ciphertext,n.kind,n.schedule_id FROM church.push_subscriptions s JOIN church.users u ON u.id=s.user_id JOIN church.schedule_notifications n ON n.id=$2 WHERE s.id=$1 AND n.member_id=s.user_id AND ${LIVE_PUSH}`,
            [row.subscription_id, row.notification_id],
          )
        ).rows[0];
        if (!target) {
          await pool().query(
            "UPDATE church.schedule_push_deliveries SET status='cancelled' WHERE notification_id=$1 AND subscription_id=$2",
            [row.notification_id, row.subscription_id],
          );
          return;
        }
        const payload = PushPayload.parse({
          title:
            target.kind === "assigned"
              ? "Lịch phân công mới"
              : "Cập nhật lịch phân công",
          body:
            target.kind === "cancelled"
              ? "Một lịch phục vụ của bạn đã được hủy."
              : target.kind === "removed"
                ? "Phân công phục vụ của bạn đã thay đổi."
                : "Bạn có cập nhật trong lịch phục vụ. Mở ứng dụng để xem.",
          url: "/client/assignments",
          tag: "schedule:" + row.notification_id,
          type: "schedule",
          referenceId: target.schedule_id,
        });
        const result = await sendPush(target.subscription_ciphertext, payload);
        if (result.status === "sent") sent++;
        else failed++;
        await pool().query(
          "UPDATE church.schedule_push_deliveries SET status=$3,safe_error=$4,sent_at=CASE WHEN $3='sent' THEN now() ELSE NULL END,next_attempt_at=CASE WHEN $5 THEN now()+($6::int*interval '1 second') ELSE 'infinity'::timestamptz END WHERE notification_id=$1 AND subscription_id=$2",
          [
            row.notification_id,
            row.subscription_id,
            result.status,
            result.error,
            result.retry,
            result.retryAfter ?? 300,
          ],
        );
        await recordOutcome(target.id, target.user_id, result.status);
      }),
    );
  return { sent, failed, processed: rows.length };
}
