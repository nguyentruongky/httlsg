import { pushProvider } from "./push-provider";
import { PushPayload, PushSubscribeInput, type PushMessage } from "@org/core";
import { pool, transaction, type DB } from "./db";
import { pushConfig, decryptSubscription } from "./push-config";
import { LIVE_PUSH } from "./push-subscriptions";
export const SELECTED_EVENT_MEMBER = `EXISTS(SELECT 1 FROM church.event_email_groups eg JOIN church.email_groups g ON g.id=eg.group_id AND g.deleted_at IS NULL JOIN church.email_group_members gm ON gm.group_id=eg.group_id WHERE eg.event_id=e.id AND gm.email=u.email)`;
export async function queueEventPush(db: DB, eventId: string) {
  if (!pushConfig()) return;
  // Push infrastructure failures cannot abort the event/email transaction.
  await db.query("SAVEPOINT event_push_queue");
  try {
    await db.query(
      `INSERT INTO church.push_event_deliveries(event_id,subscription_id) SELECT DISTINCT e.id,s.id FROM church.events e CROSS JOIN church.push_subscriptions s JOIN church.users u ON u.id=s.user_id WHERE e.id=$1 AND e.deleted_at IS NULL AND ${LIVE_PUSH} AND ${SELECTED_EVENT_MEMBER} ON CONFLICT DO NOTHING`,
      [eventId],
    );
    await db.query("RELEASE SAVEPOINT event_push_queue");
  } catch {
    await db.query("ROLLBACK TO SAVEPOINT event_push_queue");
    await db.query("RELEASE SAVEPOINT event_push_queue");
    console.warn("Event push queue unavailable");
  }
}
export async function sendPush(
  subscriptionCiphertext: string,
  payload: PushMessage,
): Promise<{
  status: "sent" | "failed" | "uncertain" | "revoked";
  error: string | null;
  retry: boolean;
  retryAfter?: number;
}> {
  PushPayload.parse(payload);
  const config = pushConfig();
  if (!config)
    return { status: "failed" as const, error: "not_configured", retry: false };
  try {
    const subscription = PushSubscribeInput.parse(
      decryptSubscription(subscriptionCiphertext),
    );
    await pushProvider.sendNotification(
      subscription,
      JSON.stringify(PushPayload.parse(payload)),
      { vapidDetails: config, TTL: 3600, urgency: "normal", timeout: 3500 },
    );
    return { status: "sent" as const, error: null, retry: false };
  } catch (error) {
    const code = (error as { statusCode?: number })?.statusCode;
    if (code === 404 || code === 410)
      return { status: "revoked" as const, error: "expired", retry: false };
    if (code === 429 || (code && code >= 500)) {
      const hint = (error as { headers?: Record<string, string> }).headers?.[
        "retry-after"
      ];
      const delay = hint
        ? /^\d+$/.test(hint)
          ? Number(hint)
          : Math.ceil((Date.parse(hint) - Date.now()) / 1000)
        : 300;
      return {
        status: "failed",
        error: "temporary",
        retry: true,
        retryAfter: Math.min(
          86400,
          Math.max(300, Number.isFinite(delay) ? delay : 300),
        ),
      };
    }
    if (code)
      return { status: "failed" as const, error: "rejected", retry: false };
    // Unknown transport outcome may already have reached a device: never auto-replay it.
    return { status: "uncertain" as const, error: "unconfirmed", retry: false };
  }
}
export async function recordOutcome(id: string, userId: string, status: string) {
  await pool().query(
    "UPDATE church.push_subscriptions SET last_used_at=CASE WHEN $2='sent' THEN now() ELSE last_used_at END,revoked_at=CASE WHEN $2='revoked' THEN now() ELSE revoked_at END WHERE id=$1",
    [id, status],
  );
  await pool().query(
    "INSERT INTO church.audit_log(actor_id,subject_id,action) VALUES($1,$1,$2)",
    [userId, "Thông báo trên thiết bị: " + status],
  );
}
export async function sendEventPushNow(eventId?: string) {
  if (!pushConfig()) return { sent: 0, failed: 0, processed: 0 };
  const rows = await transaction(async (db) => {
    await db.query(
      "UPDATE church.push_event_deliveries SET status='uncertain',safe_error='unconfirmed' WHERE status='sending' AND claimed_at<now()-interval '5 minutes'",
    );
    return (
      await db.query(
        `WITH ready AS (SELECT event_id,subscription_id FROM church.push_event_deliveries WHERE ($1::uuid IS NULL OR event_id=$1) AND status IN ('pending','failed') AND next_attempt_at<=now() AND attempts<3 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 30) UPDATE church.push_event_deliveries d SET status='sending',attempts=d.attempts+1,claimed_at=now() FROM ready WHERE d.event_id=ready.event_id AND d.subscription_id=ready.subscription_id RETURNING d.event_id,d.subscription_id,d.attempts`,
        [eventId ?? null],
      )
    ).rows;
  });
  let sent = 0,
    failed = 0;
  for (let index = 0; index < rows.length; index += 10)
    await Promise.allSettled(
      rows.slice(index, index + 10).map(async (row) => {
        const target = (
          await pool().query(
            `SELECT s.id,s.user_id,s.subscription_ciphertext FROM church.push_subscriptions s JOIN church.users u ON u.id=s.user_id JOIN church.events e ON e.id=$2 WHERE s.id=$1 AND e.deleted_at IS NULL AND ${LIVE_PUSH} AND ${SELECTED_EVENT_MEMBER}`,
            [row.subscription_id, row.event_id],
          )
        ).rows[0];
        if (!target) {
          await pool().query(
            "UPDATE church.push_event_deliveries SET status='cancelled',safe_error=NULL WHERE event_id=$1 AND subscription_id=$2",
            [row.event_id, row.subscription_id],
          );
          return;
        }
        const payload = PushPayload.parse({
          title: "Thông báo mới từ Hội Thánh",
          body: "Có chương trình mới dành cho bạn.",
          url: "/client#/events/" + row.event_id,
          tag: "event:" + row.event_id,
          type: "event",
          referenceId: row.event_id,
        });
        const result = await sendPush(target.subscription_ciphertext, payload);
        if (result.status === "sent") sent++;
        else failed++;
        await pool().query(
          "UPDATE church.push_event_deliveries SET status=$3,safe_error=$4,sent_at=CASE WHEN $3='sent' THEN now() ELSE NULL END,next_attempt_at=CASE WHEN $5 THEN now()+($6::int * interval '1 second') ELSE 'infinity'::timestamptz END WHERE event_id=$1 AND subscription_id=$2",
          [
            row.event_id,
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
export async function testOwnPush(userId: string) {
  const config = pushConfig();
  if (!config) return { configured: false, sent: 0, failed: 0 };
  const rows = (
    await pool().query(
      `SELECT s.id,s.user_id,s.subscription_ciphertext FROM church.push_subscriptions s JOIN church.users u ON u.id=s.user_id WHERE s.user_id=$1 AND ${LIVE_PUSH} LIMIT 20`,
      [userId],
    )
  ).rows;
  let sent = 0,
    failed = 0;
  await Promise.allSettled(
    rows.map(async (row) => {
      const result = await sendPush(row.subscription_ciphertext, {
        title: "Thông báo thử",
        body: "Thông báo trên thiết bị đã hoạt động.",
        url: "/client#/profile",
        tag: "church-test",
        type: "test",
      });
      if (result.status === "sent") sent++;
      else failed++;
      await recordOutcome(row.id, row.user_id, result.status);
    }),
  );
  return { configured: true, sent, failed };
}
