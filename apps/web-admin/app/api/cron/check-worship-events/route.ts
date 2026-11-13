import { timingSafeEqual } from "node:crypto";
import { failure, json } from "../../../../lib/server/http";
import { pool } from "../../../../lib/server/db";
import { pushConfig } from "../../../../lib/server/push-config";
import { pushProvider } from "../../../../lib/server/push-provider";
import { PushPayload, PushSubscribeInput } from "@org/core";
import { decryptSubscription } from "../../../../lib/server/push-config";
import { deliverMail } from "../../../../lib/server/mail";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret || !authorization.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function comingWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  const from = new Date(now);
  from.setDate(now.getDate() + daysUntilSaturday);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET)
    return json({ message: "CRON_SECRET is not configured." }, 503);
  if (!authorized(request)) return json({ message: "Unauthorized." }, 401);
  try {
    const { from, to } = comingWeekRange();
    const countResult = await pool().query(
      `SELECT count(*)::int n FROM church.events
       WHERE deleted_at IS NULL
         AND title ILIKE $1
         AND event_date BETWEEN $2 AND $3`,
      [`%Chương trình thờ phượng%`, from, to],
    );
    const eventCount = countResult.rows[0].n;
    if (eventCount >= 2)
      return json({ checked: true, eventCount, notified: false });

    const subject = `Thiếu chương trình thờ phượng tuần ${from} đến ${to}`;
    const body = `Tuần từ ${from} đến ${to} chỉ có ${eventCount} chương trình "Chương trình thờ phượng" trên lịch. Vui lòng thêm đủ 2 chương trình.`;

    const users = await pool().query(
      `SELECT u.id FROM church.users u
       WHERE u.role_id IN ('admin', 'secretary')
         AND u.enabled AND u.deleted_at IS NULL`
    );

    const config = pushConfig();
    let pushSent = 0,
      pushFailed = 0;
    if (config && users.rows.length) {
      for (const user of users.rows) {
        const subs = await pool().query(
          `SELECT s.subscription_ciphertext FROM church.push_subscriptions s
           WHERE s.user_id=$1 AND revoked_at IS NULL`,
          [user.id],
        );
        for (const sub of subs.rows) {
          try {
            const subscription = PushSubscribeInput.parse(
              decryptSubscription(sub.subscription_ciphertext),
            );
            await pushProvider.sendNotification(
              subscription,
              JSON.stringify(
                PushPayload.parse({
                  title: "Thiếu chương trình thờ phượng",
                  body,
                  url: "/dashboard/calendar",
                  tag: "worship-events-missing",
                  type: "alert",
                }),
              ),
              {
                vapidDetails: config,
                TTL: 3600,
                urgency: "normal",
                timeout: 3500,
              },
            );
            pushSent++;
          } catch {
            pushFailed++;
          }
        }
      }
    }

    let emailSent = false;
    try {
      await deliverMail({
        to: "nguyentruongky33@gmail.com",
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "local@church.test",
        subject,
        text: body,
      });
      emailSent = true;
    } catch {
      emailSent = false;
    }

    return json({
      checked: true,
      eventCount,
      notified: true,
      pushSent,
      pushFailed,
      emailSent,
      usersNotified: users.rows.length,
    });
  } catch (error) {
    return failure(error);
  }
}
