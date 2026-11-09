import { before, after, afterEach, test, mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createECDH } from "node:crypto";
import { generateVAPIDKeys } from "web-push";
import { pushProvider } from "../lib/server/push-provider";
import { pool, transaction } from "../lib/server/db";
import { actorById, createSession, tokenHash } from "../lib/server/session";
import {
  newRefresh,
  refreshCookieName,
} from "../lib/server/persistent-session";
import { hashPassword } from "../lib/server/password";
import { endpointHash, decryptSubscription } from "../lib/server/push-config";
import {
  queueEventPush,
  sendEventPushNow,
  sendPush,
} from "../lib/server/push-delivery";
import { POST as subscribe } from "../app/api/push/subscribe/route";
import { POST as unsubscribe } from "../app/api/push/unsubscribe/route";
import { POST as tryPush } from "../app/api/push/test/route";
import { GET as status } from "../app/api/push/status/route";
import { POST as createEvent } from "../app/api/events/route";
import { PATCH as editEvent } from "../app/api/events/[id]/route";
import { GET as memberEvent } from "../app/api/push/events/[id]/route";
import { POST as logout } from "../app/api/auth/logout/route";
let password: string;
const originalKeys = {
  public: process.env.VAPID_PUBLIC_KEY,
  private: process.env.VAPID_PRIVATE_KEY,
  subject: process.env.VAPID_SUBJECT,
};
before(async () => {
  const pair = generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = pair.publicKey;
  process.env.VAPID_PRIVATE_KEY = pair.privateKey;
  process.env.VAPID_SUBJECT = "mailto:test@example.test";
  password = await hashPassword("Push-tests!12345");
});
afterEach(() => mock.restoreAll());
after(async () => {
  for (const [key, value] of Object.entries({
    VAPID_PUBLIC_KEY: originalKeys.public,
    VAPID_PRIVATE_KEY: originalKeys.private,
    VAPID_SUBJECT: originalKeys.subject,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await pool().end();
});
async function account(role = "user") {
  const id = randomUUID(),
    email = "push-" + id + "@example.test";
  await pool().query(
    "INSERT INTO church.member_profiles(id,email,full_name,role_id) VALUES($1,$2,'Push test',$3)",
    [id, email, role],
  );
  await pool().query(
    "INSERT INTO church.users(id,email,full_name,role_id,password_hash,is_password_set) VALUES($1,$2,'Push test',$3,$4,true)",
    [id, email, role, password],
  );
  return transaction(async (db) => {
    const actor = (await actorById(db, id))!,
      token = await createSession(db, actor),
      refresh = await newRefresh(
        db,
        actor,
        new Request("http://127.0.0.1:3000/client"),
      );
    await db.query(
      "UPDATE church.sessions SET refresh_family=$2 WHERE token_hash=$1",
      [tokenHash(token), refresh.family],
    );
    return { id, email, token, refresh: refresh.token, family: refresh.family };
  });
}
function request(
  path: string,
  who?: { token: string },
  input?: unknown,
  method = input === undefined ? "GET" : "POST",
) {
  return new Request("http://127.0.0.1:3000" + path, {
    method,
    headers: {
      Origin: "http://127.0.0.1:3000",
      "Content-Type": "application/json",
      ...(who ? { Authorization: "Bearer " + who.token } : {}),
    },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  });
}
async function result(response: Response, code = 200) {
  const value = await response.json();
  assert.equal(response.status, code, JSON.stringify(value));
  return value;
}
function subscription() {
  const curve = createECDH("prime256v1");
  curve.generateKeys();
  return {
    endpoint: "https://fcm.googleapis.com/fcm/send/" + randomUUID(),
    keys: {
      p256dh: curve.getPublicKey().toString("base64url"),
      auth: Buffer.alloc(16, 1).toString("base64url"),
    },
    deviceLabel: "Test phone",
  };
}
async function register(
  who: Awaited<ReturnType<typeof account>>,
  value = subscription(),
) {
  await result(await subscribe(request("/api/push/subscribe", who, value)));
  return value;
}
async function groups(emails: string[]) {
  const id = randomUUID();
  await pool().query("INSERT INTO church.email_groups(id,name) VALUES($1,$2)", [
    id,
    "Push " + id,
  ]);
  for (const email of emails)
    await pool().query(
      "INSERT INTO church.email_group_members(group_id,email) VALUES($1,$2)",
      [id, email],
    );
  return id;
}
async function event(
  admin: Awaited<ReturnType<typeof account>>,
  ids: string[],
) {
  return result(
    await createEvent(
      request("/api/events", admin, {
        eventDate: "2026-11-08",
        originalText: "Chương trình thử\n08:00\nChi tiết riêng tư",
        groupIds: ids,
        requestId: randomUUID(),
      }),
    ),
  );
}
test("authenticated subscription upsert is private, encrypted and ownership-scoped", async () => {
  const first = await account(),
    second = await account(),
    value = subscription();
  await result(
    await subscribe(request("/api/push/subscribe", undefined, value)),
    401,
  );
  await result(
    await subscribe(
      request("/api/push/subscribe", first, { ...value, userId: second.id }),
    ),
    400,
  );
  await result(
    await subscribe(
      request("/api/push/subscribe", first, {
        ...value,
        endpoint: "https://127.0.0.1/secret",
      }),
    ),
    400,
  );
  const hostile = request("/api/push/subscribe", first, value);
  hostile.headers.set("Origin", "https://evil.example");
  await result(await subscribe(hostile), 403);
  await register(first, value);
  await register(first, value);
  const rows = (
    await pool().query(
      "SELECT * FROM church.push_subscriptions WHERE endpoint_hash=$1",
      [endpointHash(value.endpoint)],
    )
  ).rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].user_id, first.id);
  assert.ok(!rows[0].subscription_ciphertext.includes(value.endpoint));
  assert.deepEqual(decryptSubscription(rows[0].subscription_ciphertext), {
    endpoint: value.endpoint,
    keys: value.keys,
  });
  await result(
    await subscribe(request("/api/push/subscribe", second, value)),
    409,
  );
  await result(
    await unsubscribe(
      request("/api/push/unsubscribe", second, { endpoint: value.endpoint }),
    ),
  );
  const info = await result(
    await status(
      request(
        "/api/push/status?fingerprint=" + endpointHash(value.endpoint),
        first,
      ),
    ),
  );
  assert.equal(info.active, true);
  assert.equal(info.activeCount, 1);
  assert.deepEqual(Object.keys(info).sort(), [
    "active",
    "activeCount",
    "configured",
    "publicKey",
  ]);
  const other = await result(
    await status(
      request(
        "/api/push/status?fingerprint=" + endpointHash(value.endpoint),
        second,
      ),
    ),
  );
  assert.equal(other.active, false);
  await result(
    await unsubscribe(
      request("/api/push/unsubscribe", first, { endpoint: value.endpoint }),
    ),
  );
  assert.equal(
    (await result(await status(request("/api/push/status", first))))
      .activeCount,
    0,
  );
  await register(first, value);
  assert.equal(
    (await result(await status(request("/api/push/status", first))))
      .activeCount,
    1,
  );
});
test("own push tests isolate recipients, revoke expired subscriptions, and rate limit requests", async () => {
  const first = await account(),
    second = await account();
  await register(first);
  await register(first);
  await register(second);
  let count = 0;
  mock.method(pushProvider, "sendNotification", async () => {
    count++;
    if (count === 1)
      throw Object.assign(new Error("secret endpoint must never leak"), {
        statusCode: 410,
      });
    return {} as any;
  });
  const sent = await result(
    await tryPush(request("/api/push/test", first, {}, "POST")),
  );
  assert.equal(count, 2);
  assert.equal(sent.sent, 1);
  assert.equal(sent.failed, 1);
  assert.equal(
    (await result(await status(request("/api/push/status", first))))
      .activeCount,
    1,
  );
  for (let i = 0; i < 4; i++)
    await result(await tryPush(request("/api/push/test", first, {}, "POST")));
  await result(
    await tryPush(request("/api/push/test", first, {}, "POST")),
    429,
  );
});
test("event push reaches only selected account emails, deduplicates and never resends edits", async () => {
  const admin = await account("admin"),
    selected = await account(),
    other = await account();
  await register(selected);
  await register(selected);
  await register(other);
  const a = await groups([selected.email]),
    b = await groups([selected.email]),
    c = await groups([other.email]);
  const revoked = await register(selected);
  await result(
    await unsubscribe(
      request("/api/push/unsubscribe", selected, {
        endpoint: revoked.endpoint,
      }),
    ),
  );
  const payloads: any[] = [];
  mock.method(
    pushProvider,
    "sendNotification",
    async (_sub: unknown, payload: string | Buffer | null | undefined) => {
      payloads.push(JSON.parse(String(payload)));
      return {} as any;
    },
  );
  const saved = await event(admin, [a, b]);
  assert.equal(payloads.length, 2, "one attempt per selected device");
  await result(
    await memberEvent(request("/api/push/events/" + saved.id, other), {
      params: Promise.resolve({ id: saved.id }),
    }),
    404,
  );
  assert.ok(!JSON.stringify(payloads).includes("Chi tiết riêng tư"));
  assert.ok(!JSON.stringify(payloads).includes(selected.email));
  for (const payload of payloads) {
    assert.equal(payload.url, "/client#/events/" + saved.id);
    assert.equal(payload.type, "event");
  }
  await sendEventPushNow(saved.id);
  assert.equal(payloads.length, 2);
  await result(
    await editEvent(
      request(
        "/api/events/" + saved.id,
        admin,
        {
          eventDate: "2026-11-08",
          originalText: "Đã sửa chương trình",
          groupIds: [a, b, c],
          version: saved.version,
          requestId: randomUUID(),
        },
        "PATCH",
      ),
      { params: Promise.resolve({ id: saved.id }) },
    ),
  );
  assert.equal(payloads.length, 2, "edits do not auto-push");
  const view = await result(
    await memberEvent(request("/api/push/events/" + saved.id, selected), {
      params: Promise.resolve({ id: saved.id }),
    }),
  );
  assert.equal(view.originalText, "Đã sửa chương trình");
  await pool().query("DELETE FROM church.email_group_members WHERE email=$1", [
    selected.email,
  ]);
  await result(
    await memberEvent(request("/api/push/events/" + saved.id, selected), {
      params: Promise.resolve({ id: saved.id }),
    }),
    404,
  );
});
test("push provider failures never roll back events or email, and failed devices do not stop others", async () => {
  const admin = await account("admin"),
    member = await account();
  await register(member);
  await register(member);
  const group = await groups([member.email]);
  let attempts = 0;
  mock.method(pushProvider, "sendNotification", async () => {
    attempts++;
    if (attempts === 1)
      throw Object.assign(new Error("temporary private response"), {
        statusCode: 503,
      });
    return {} as any;
  });
  const saved = await event(admin, [group]);
  assert.equal(attempts, 2);
  assert.ok(saved.id);
  const emails = (
    await pool().query(
      "SELECT d.status FROM church.event_notification_deliveries d JOIN church.event_notifications n ON n.id=d.notification_id WHERE n.event_id=$1",
      [saved.id],
    )
  ).rows;
  assert.equal(emails[0].status, "sent");
  const deliveries = (
    await pool().query(
      "SELECT status,safe_error FROM church.push_event_deliveries WHERE event_id=$1 ORDER BY status",
      [saved.id],
    )
  ).rows;
  assert.deepEqual(
    deliveries.map((row) => row.status),
    ["failed", "sent"],
  );
  assert.equal(deliveries[0].safe_error, "temporary");
  await pool().query(
    "UPDATE church.push_event_deliveries SET next_attempt_at=now() WHERE event_id=$1 AND status='failed'",
    [saved.id],
  );
  await sendEventPushNow(saved.id);
  assert.equal(attempts, 3, "retry only the failed device");
});
test("revoked login families and logout disable push without breaking other devices", async () => {
  const member = await account(),
    value = await register(member);
  await pool().query(
    "UPDATE church.refresh_tokens SET revoked=true WHERE family_id=$1",
    [member.family],
  );
  assert.equal(
    (await result(await status(request("/api/push/status", member)), 401))
      .message,
    "Phiên đăng nhập đã hết hạn.",
  );
  const next = await account(),
    device = await register(next);
  const response = await logout(
    new Request("http://127.0.0.1:3000/api/auth/logout", {
      method: "POST",
      headers: {
        Origin: "http://127.0.0.1:3000",
        "x-church-csrf": "1",
        Cookie: refreshCookieName() + "=" + next.refresh,
      },
    }),
  );
  await result(response);
  assert.ok(
    (
      await pool().query(
        "SELECT revoked_at FROM church.push_subscriptions WHERE endpoint_hash=$1",
        [endpointHash(device.endpoint)],
      )
    ).rows[0].revoked_at,
  );
  assert.ok(value.endpoint);
});
test("delivery rejects external destinations before contacting a push provider", async () => {
  let count = 0;
  mock.method(pushProvider, "sendNotification", async () => {
    count++;
    return {} as any;
  });
  await assert.rejects(() =>
    sendPush("invalid", {
      title: "x",
      body: "x",
      url: "https://evil.example",
      tag: "x",
      type: "test",
    } as any),
  );
  assert.equal(count, 0);
});

test("events with no group or active device save without attempting push", async () => {
  const admin = await account("admin"),
    member = await account();
  let count = 0;
  mock.method(pushProvider, "sendNotification", async () => {
    count++;
    return {} as any;
  });
  await register(member);
  await event(admin, []);
  const noDevices = await account(),
    group = await groups([noDevices.email]);
  const saved = await event(admin, [group]);
  assert.ok(saved.id);
  assert.equal(count, 0);
});
test("push queue SQL failures roll back only the push savepoint", async () => {
  await transaction(async (db) => {
    const id = randomUUID();
    await db.query(
      "INSERT INTO church.member_profiles(id,full_name) VALUES($1,'Push transaction marker')",
      [id],
    );
    const broken = {
      query: async (sql: string, args?: unknown[]) =>
        sql.startsWith("INSERT INTO church.push_event_deliveries")
          ? db.query("SELECT 1/0")
          : db.query(sql, args),
    } as unknown as import("../lib/server/db").DB;
    await queueEventPush(broken, randomUUID());
    assert.equal(
      (
        await db.query("SELECT id FROM church.member_profiles WHERE id=$1", [
          id,
        ])
      ).rowCount,
      1,
    );
  });
});
test("HTTP rate limit advice is retained for durable event retries", async () => {
  const admin = await account("admin"),
    member = await account();
  await register(member);
  const group = await groups([member.email]);
  mock.method(pushProvider, "sendNotification", async () => {
    throw Object.assign(new Error("rate limited"), {
      statusCode: 429,
      headers: { "retry-after": "3600" },
    });
  });
  const saved = await event(admin, [group]);
  const delivery = (
    await pool().query(
      "SELECT status,extract(epoch from (next_attempt_at-now()))::int delay FROM church.push_event_deliveries WHERE event_id=$1",
      [saved.id],
    )
  ).rows[0];
  assert.equal(delivery.status, "failed");
  assert.ok(delivery.delay >= 3590);
});

test("editable profile aliases never grant email-group event access", async () => {
  const admin = await account("admin"),
    member = await account();
  await register(member);
  const alias = "profile-only-" + randomUUID() + "@example.test";
  await pool().query("UPDATE church.member_profiles SET email=$2 WHERE id=$1", [
    member.id,
    alias,
  ]);
  const group = await groups([alias]);
  let sent = 0;
  mock.method(pushProvider, "sendNotification", async () => {
    sent++;
    return {} as any;
  });
  const saved = await event(admin, [group]);
  assert.equal(sent, 0);
  await result(
    await memberEvent(request("/api/push/events/" + saved.id, member), {
      params: Promise.resolve({ id: saved.id }),
    }),
    404,
  );
});

test("logout revokes only its device family while another login of the same account still receives push", async () => {
  const member = await account(),
    first = await register(member);
  const second = await transaction(async (db) => {
    const actor = (await actorById(db, member.id))!,
      token = await createSession(db, actor),
      refresh = await newRefresh(
        db,
        actor,
        new Request("http://127.0.0.1:3000/client"),
      );
    await db.query(
      "UPDATE church.sessions SET refresh_family=$2 WHERE token_hash=$1",
      [tokenHash(token), refresh.family],
    );
    return { ...member, token, refresh: refresh.token, family: refresh.family };
  });
  const device = await register(second);
  await result(
    await logout(
      new Request("http://127.0.0.1:3000/api/auth/logout", {
        method: "POST",
        headers: {
          Origin: "http://127.0.0.1:3000",
          "x-church-csrf": "1",
          Cookie: refreshCookieName() + "=" + member.refresh,
        },
      }),
    ),
  );
  const info = await result(
    await status(
      request(
        "/api/push/status?fingerprint=" + endpointHash(device.endpoint),
        second,
      ),
    ),
  );
  assert.equal(info.active, true);
  assert.equal(info.activeCount, 1);
  assert.ok(
    (
      await pool().query(
        "SELECT revoked_at FROM church.push_subscriptions WHERE endpoint_hash=$1",
        [endpointHash(first.endpoint)],
      )
    ).rows[0].revoked_at,
  );
  let count = 0;
  mock.method(pushProvider, "sendNotification", async () => {
    count++;
    return {} as any;
  });
  await result(await tryPush(request("/api/push/test", second, {}, "POST")));
  assert.equal(count, 1);
});
test("active device quota counts live registrations and cannot be bypassed by reactivation", async () => {
  const member = await account(),
    devices = [];
  for (let index = 0; index < 20; index++) devices.push(await register(member));
  await register(member, devices[0]);
  const extra = subscription();
  await result(
    await subscribe(request("/api/push/subscribe", member, extra)),
    400,
  );
  await result(
    await unsubscribe(
      request("/api/push/unsubscribe", member, {
        endpoint: devices[0].endpoint,
      }),
    ),
  );
  await register(member, extra);
  await result(
    await subscribe(request("/api/push/subscribe", member, devices[0])),
    400,
  );
  assert.equal(
    (await result(await status(request("/api/push/status", member))))
      .activeCount,
    20,
  );
});

test("schedule publication uses existing live subscriptions, sends only to assignees and keeps private data out of push payloads", async () => {
  const { POST: createSchedule } = await import("../app/api/schedules/route");
  const { POST: publishSchedule } =
    await import("../app/api/schedules/[id]/publish/route");
  const { PUT: updateSchedule } =
    await import("../app/api/schedules/[id]/route");
  const { defaultScheduleSettings } = await import("@org/core");
  const admin = await account("admin"),
    member = await account(),
    outsider = await account();
  const subscribed = await register(member);
  await register(outsider);
  const sent: { endpoint: string; payload: any }[] = [];
  mock.method(
    pushProvider,
    "sendNotification",
    async (subscription: any, payload: string) => {
      sent.push({
        endpoint: subscription.endpoint,
        payload: JSON.parse(payload),
      });
      return { statusCode: 201 };
    },
  );
  const draft = {
    categoryId: "reception",
    title: "Lịch riêng tư",
    description: "",
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
    settings: defaultScheduleSettings("reception"),
    events: [
      {
        id: randomUUID(),
        date: "2026-11-08",
        title: "Chương trình riêng",
        responsibilities: [
          {
            id: randomUUID(),
            name: "Tiếp tân",
            assignments: [
              {
                memberId: member.id,
                notes: "Không đưa ghi chú lên dịch vụ push",
              },
            ],
          },
        ],
      },
    ],
    requestId: randomUUID(),
  };
  let plan = await result(
    await createSchedule(request("/api/schedules", admin, draft)),
  );
  assert.equal(sent.length, 0);
  const ctx = { params: Promise.resolve({ id: plan.id }) };
  plan = await result(
    await publishSchedule(
      request("/api/schedules/" + plan.id + "/publish", admin, {
        version: plan.version,
      }),
      ctx,
    ),
  );
  assert.equal(sent.length, 1);
  assert.equal(sent[0].endpoint, subscribed.endpoint);
  assert.equal(sent[0].payload.type, "schedule");
  assert.equal(sent[0].payload.url, "/client#/assignments");
  assert.equal(JSON.stringify(sent[0].payload).includes("Không đưa"), false);
  assert.equal(JSON.stringify(sent[0].payload).includes("riêng"), false);
  const input = {
    categoryId: plan.categoryId,
    title: plan.title,
    description: plan.description,
    periodStart: plan.periodStart,
    periodEnd: plan.periodEnd,
    settings: plan.settings,
    events: plan.events,
    version: plan.version,
    notifyAffected: true,
  };
  await result(
    await updateSchedule(
      request("/api/schedules/" + plan.id, admin, input, "PUT"),
      ctx,
    ),
  );
  assert.equal(sent.length, 1);
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.schedule_push_deliveries d JOIN church.schedule_notifications n ON n.id=d.notification_id WHERE n.schedule_id=$1 AND d.status='sent'",
        [plan.id],
      )
    ).rows[0].n,
    1,
  );
});
