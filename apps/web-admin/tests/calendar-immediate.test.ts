import { before, after, afterEach, test, mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { pool, transaction } from "../lib/server/db";
import { hashPassword } from "../lib/server/password";
import { actorById, createSession } from "../lib/server/session";
import { queueEventNotification } from "../lib/server/calendar";
import { POST as createEvent } from "../app/api/events/route";
import {
  PATCH as editEvent,
  GET as getEvent,
} from "../app/api/events/[id]/route";
import { GET as failureAlerts } from "../app/api/notifications/failures/route";
import { POST as retry } from "../app/api/notifications/[id]/retry/route";
const actorId = randomUUID();
let token: string,
  groupIds: string[],
  original: any,
  created: any,
  transport: ReturnType<typeof mock.method>;
const messages: any[] = [],
  faults = new Map<string, "failed" | "uncertain">();
function req(path: string, method: string, data?: unknown) {
  return new Request("http://127.0.0.1:3000" + path, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      Origin: "http://127.0.0.1:3000",
      ...(data === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
async function body(response: Response, status = 200) {
  const data = await response.json();
  assert.equal(response.status, status, JSON.stringify(data));
  return data;
}
function draft(title: string) {
  return {
    eventDate: "2026-11-08",
    originalText: `${title}\n08:00 - 10:00\nChi tiết mới nhất 🙏`,
    groupIds,
    requestId: randomUUID(),
  };
}
const envBefore = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
before(async () => {
  const hash = await hashPassword("Calendar-immediate-test!");
  await pool().query(
    "INSERT INTO church.member_profiles(id,email,full_name,role_id) VALUES($1,$2,$3,$4)",
    [actorId, "immediate-calendar@example.test", "Quản trị gửi ngay", "admin"],
  );
  await pool().query(
    "INSERT INTO church.users(id,email,full_name,role_id,password_hash,is_password_set) VALUES($1,$2,$3,$4,$5,true)",
    [
      actorId,
      "immediate-calendar@example.test",
      "Quản trị gửi ngay",
      "admin",
      hash,
    ],
  );
  token = await transaction(async (db) =>
    createSession(db, (await actorById(db, actorId))!),
  );
  groupIds = [];
  for (const index of [1, 2])
    groupIds.push(
      (
        await pool().query(
          "INSERT INTO church.email_groups(name,created_by,updated_by) VALUES($1,$2,$2) RETURNING id",
          [`immediate-${actorId}-${index}`, actorId],
        )
      ).rows[0].id,
    );
  await pool().query(
    "INSERT INTO church.email_group_members(group_id,email) VALUES($1,'now-one@example.test'),($1,'now-two@example.test'),($2,'now-two@example.test'),($2,'now-three@example.test')",
    groupIds,
  );
  transport = mock.method(
    nodemailer,
    "createTransport",
    () =>
      ({
        sendMail: async (message: any) => {
          messages.push(message);
          await new Promise((resolve) => setTimeout(resolve, 5));
          if (faults.get(message.to) === "failed")
            throw Object.assign(new Error("private smtp rejection"), {
              code: "EENVELOPE",
            });
          if (faults.get(message.to) === "uncertain")
            throw Object.assign(new Error("private smtp timeout"), {
              code: "ETIMEDOUT",
              command: "DATA",
            });
        },
      }) as any,
  );
  process.env.SMTP_USER = "test@example.test";
  process.env.SMTP_PASS = "test-only";
});
afterEach(() => faults.clear());
after(async () => {
  transport.mock.restore();
  if (envBefore.user === undefined) delete process.env.SMTP_USER;
  else process.env.SMTP_USER = envBefore.user;
  if (envBefore.pass === undefined) delete process.env.SMTP_PASS;
  else process.env.SMTP_PASS = envBefore.pass;
  await pool().query(
    "UPDATE church.event_notification_deliveries SET status='cancelled' WHERE status IN ('pending','sending') AND notification_id IN(SELECT id FROM church.event_notifications WHERE created_by=$1)",
    [actorId],
  );
  await pool().query(
    "UPDATE church.events SET deleted_at=now() WHERE created_by=$1",
    [actorId],
  );
  await pool().query(
    "UPDATE church.email_groups SET deleted_at=now() WHERE created_by=$1",
    [actorId],
  );
  await pool().query(
    "UPDATE church.member_profiles SET enabled=false WHERE id=$1",
    [actorId],
  );
  await pool().end();
});
test("event creation delivers every unique recipient before returning, without invoking a scheduler", async () => {
  original = draft("Gửi ngay khi tạo");
  created = await body(await createEvent(req("/api/events", "POST", original)));
  assert.equal(created.delivery.sent, 3);
  assert.equal(created.delivery.pending, 0);
  assert.equal(created.delivery.sending, 0);
  assert.equal(messages.length, 3);
  assert.equal(new Set(messages.map((m) => m.to)).size, 3);
  assert.ok(messages.every((m) => m.text.includes("Gửi ngay khi tạo")));
  assert.ok(messages.every((m) => m.text.includes("Chúa nhật, 08/11/2026")));
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.event_notification_deliveries WHERE notification_id=$1 AND status=$2",
        [created.notificationId, "sent"],
      )
    ).rows[0].n,
    3,
  );
});
test("repeated and concurrent create requests do not send duplicate notifications", async () => {
  const before = messages.length;
  const replay = await body(
    await createEvent(req("/api/events", "POST", original)),
  );
  assert.equal(replay.id, created.id);
  assert.equal(messages.length, before);
  const input = draft("Tạo đồng thời");
  const responses = await Promise.all([
    createEvent(req("/api/events", "POST", input)),
    createEvent(req("/api/events", "POST", input)),
  ]);
  const a = await body(responses[0]),
    b = await body(responses[1]);
  assert.equal(a.id, b.id);
  assert.equal(messages.length - before, 3);
  assert.equal(new Set(messages.slice(before).map((m) => m.messageId)).size, 3);
});
test("edits send the updated snapshot immediately and a replay with the old version remains idempotent", async () => {
  const before = messages.length;
  const input = { ...draft("Thông tin đã sửa"), version: created.version };
  const updated = await body(
    await editEvent(
      req("/api/events/" + created.id, "PATCH", input),
      ctx(created.id),
    ),
  );
  assert.equal(updated.version, 1);
  assert.equal(updated.delivery.sent, 3);
  assert.equal(messages.length - before, 3);
  assert.ok(
    messages.slice(before).every((m) => m.text.includes("Thông tin đã sửa")),
  );
  const replay = await body(
    await editEvent(
      req("/api/events/" + created.id, "PATCH", input),
      ctx(created.id),
    ),
  );
  assert.equal(replay.notificationId, updated.notificationId);
  assert.equal(replay.version, 1);
  assert.equal(messages.length - before, 3);
  assert.equal(
    (
      await editEvent(
        req("/api/events/" + created.id, "PATCH", {
          ...input,
          originalText: "Đổi nội dung cùng mã",
        }),
        ctx(created.id),
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await editEvent(
        req("/api/events/" + created.id, "PATCH", {
          ...input,
          requestId: randomUUID(),
        }),
        ctx(created.id),
      )
    ).status,
    409,
  );
  assert.equal(messages.length - before, 3);
});
test("failure bell lists only unresolved email problems and clears successful retries", async () => {
  assert.equal(
    (
      await failureAlerts(
        new Request("http://127.0.0.1:3000/api/notifications/failures"),
      )
    ).status,
    401,
  );
  faults.set("now-two@example.test", "failed");
  const saved = await body(
    await createEvent(req("/api/events", "POST", draft("Thông báo lỗi"))),
  );
  const list = await body(
    await failureAlerts(req("/api/notifications/failures", "GET")),
  );
  const alert = list.items.find(
    (item: any) => item.id === saved.notificationId,
  );
  assert.equal(alert.failed, 1);
  assert.equal(alert.retryable, 1);
  assert.equal(alert.uncertain, 0);
  assert.equal(
    list.items.some((item: any) => item.id === created.notificationId),
    false,
  );
  faults.clear();
  await body(
    await retry(
      req(`/api/notifications/${saved.notificationId}/retry`, "POST", {
        requestId: randomUUID(),
      }),
      ctx(saved.notificationId),
    ),
  );
  const refreshed = await body(
    await failureAlerts(req("/api/notifications/failures", "GET")),
  );
  assert.equal(
    refreshed.items.some((item: any) => item.id === saved.notificationId),
    false,
  );
});
test("partial immediate failures preserve the saved event and failed-only retries send immediately", async () => {
  faults.set("now-two@example.test", "failed");
  faults.set("now-three@example.test", "uncertain");
  const input = draft("Kết quả một phần"),
    before = messages.length;
  const saved = await body(
    await createEvent(req("/api/events", "POST", input)),
  );
  assert.equal(saved.delivery.sent, 1);
  assert.equal(saved.delivery.failed, 1);
  assert.equal(saved.delivery.uncertain, 1);
  assert.equal(
    (
      await body(
        await getEvent(req("/api/events/" + saved.id, "GET"), ctx(saved.id)),
      )
    ).title,
    "Kết quả một phần",
  );
  await body(await createEvent(req("/api/events", "POST", input)));
  assert.equal(
    messages.length - before,
    3,
    "replaying a save does not retry failed or uncertain rows",
  );
  faults.clear();
  const requestId = randomUUID();
  const retried = await body(
    await retry(
      req("/api/notifications/" + saved.notificationId + "/retry", "POST", {
        requestId,
      }),
      ctx(saved.notificationId),
    ),
  );
  assert.equal(retried.count, 1);
  assert.equal(messages.length - before, 4);
  assert.equal(messages.at(-1).to, "now-two@example.test");
  assert.equal(retried.delivery.sent, 2);
  assert.equal(retried.delivery.uncertain, 1);
  await body(
    await retry(
      req("/api/notifications/" + saved.notificationId + "/retry", "POST", {
        requestId,
      }),
      ctx(saved.notificationId),
    ),
  );
  assert.equal(messages.length - before, 4);
});
test("immediate dispatch processes only the current save and leaves unrelated recovery jobs untouched", async () => {
  const pending = await transaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(74298331)");
    return queueEventNotification(
      db,
      (await actorById(db, actorId))!,
      created.id,
      { requestId: randomUUID() },
    );
  });
  const before = messages.length,
    saved = await body(
      await createEvent(
        req("/api/events", "POST", draft("Chỉ gửi lần lưu hiện tại")),
      ),
    );
  assert.equal(saved.delivery.sent, 3);
  assert.equal(messages.length - before, 3);
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.event_notification_deliveries WHERE notification_id=$1 AND status='pending'",
        [pending.id],
      )
    ).rows[0].n,
    3,
  );
});
test("database failure after SMTP acceptance cannot roll back the save or cause a duplicate send on retry", async () => {
  const target = pool(),
    originalQuery = target.query.bind(target);
  let failOnce = true;
  const fault = mock.method(target, "query", (...args: any[]) => {
    if (
      failOnce &&
      typeof args[0] === "string" &&
      args[0].includes("SET status=$2,sent_at") &&
      args[1]?.[1] === "sent"
    ) {
      failOnce = false;
      return Promise.reject(new Error("simulated status write failure"));
    }
    return (originalQuery as (...values: any[]) => any)(...args);
  });
  const input = draft("Đã lưu trước khi lỗi kết quả gửi"),
    before = messages.length;
  let saved: any;
  try {
    saved = await body(await createEvent(req("/api/events", "POST", input)));
    assert.ok(saved.delivery.error);
    assert.equal(messages.length - before, 3);
  } finally {
    fault.mock.restore();
  }
  assert.equal(
    (
      await body(
        await getEvent(req("/api/events/" + saved.id, "GET"), ctx(saved.id)),
      )
    ).id,
    saved.id,
  );
  const replay = await body(
    await createEvent(req("/api/events", "POST", input)),
  );
  assert.equal(replay.delivery.sending, 1);
  assert.equal(replay.delivery.sent, 2);
  assert.equal(messages.length - before, 3);
  await pool().query(
    "UPDATE church.event_notification_deliveries SET claimed_at=now()-interval '10 minutes' WHERE notification_id=$1 AND status='sending'",
    [saved.notificationId],
  );
  const recovered = await body(
    await createEvent(req("/api/events", "POST", input)),
  );
  assert.equal(recovered.delivery.uncertain, 1);
  assert.equal(messages.length - before, 3);
});
