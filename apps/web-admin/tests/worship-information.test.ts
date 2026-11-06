import { before, after, afterEach, test, mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import {
  EVENT_PRESETS,
  renderEventPreset,
  composeWorshipInformationRequest,
} from "@org/core";
import { pool, transaction } from "../lib/server/db";
import { hashPassword } from "../lib/server/password";
import { actorById, createSession } from "../lib/server/session";
import { POST as createEvent } from "../app/api/events/route";
import { PATCH as editEvent } from "../app/api/events/[id]/route";
import {
  GET as preview,
  POST as requestInformation,
} from "../app/api/events/[id]/worship-information-request/route";
import { POST as emailViber } from "../app/api/events/[id]/worship-viber-email/route";
import { GET as readViberDraft } from "../app/api/worship-viber-drafts/[id]/route";
import {
  worshipViberEmail,
  worshipDraftOrigin,
} from "../lib/server/worship-viber-email";
const actorId = randomUUID(),
  tokens = new Map<string, string>();
const messages: any[] = [];
let transport: any,
  fault: "failed" | "uncertain" | null = null,
  groupId: string;
const oldEnv = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
function req(
  path: string,
  method = "GET",
  data?: unknown,
  role = "admin",
  origin = "http://127.0.0.1:3000",
) {
  return new Request("http://127.0.0.1:3000" + path, {
    method,
    headers: {
      Authorization: "Bearer " + tokens.get(role),
      Origin: origin,
      ...(data === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}
async function json(response: Response, status = 200) {
  const data = await response.json();
  assert.equal(response.status, status, JSON.stringify(data));
  return data;
}
const text = () => renderEventPreset(EVENT_PRESETS[0], { date: "2026-11-08" });
async function create(originalText = text(), groupIds: string[] = []) {
  const input = {
    originalText,
    eventDate: "2026-11-08",
    presetId: "worship-program",
    groupIds,
    requestId: randomUUID(),
  };
  return {
    input,
    event: await json(await createEvent(req("/api/events", "POST", input))),
  };
}
async function review(id: string) {
  return json(
    await preview(
      req(`/api/events/${id}/worship-information-request`),
      ctx(id),
    ),
  );
}
const send = (id: string, input: unknown, role = "admin", origin?: string) =>
  requestInformation(
    req(
      `/api/events/${id}/worship-information-request`,
      "POST",
      input,
      role,
      origin,
    ),
    ctx(id),
  );
const payload = (p: any) => ({
  requestId: randomUUID(),
  version: p.version,
  previewHash: p.previewHash,
});
before(async () => {
  const hash = await hashPassword("Worship-test-only!123");
  for (const role of [
    "admin",
    "secretary",
    "deacon",
    "board",
    "leader",
    "user",
  ]) {
    const id = role === "admin" ? actorId : randomUUID();
    await pool().query(
      "INSERT INTO church.member_profiles(id,email,full_name,role_id) VALUES($1,$2,$3,$4)",
      [id, `worship-${role}@example.test`, "Kiểm tra thờ phượng " + role, role],
    );
    await pool().query(
      "INSERT INTO church.users(id,email,full_name,role_id,password_hash,is_password_set) VALUES($1,$2,$3,$4,$5,true)",
      [
        id,
        `worship-${role}@example.test`,
        "Kiểm tra thờ phượng " + role,
        role,
        hash,
      ],
    );
    tokens.set(
      role,
      await transaction(async (db) =>
        createSession(db, (await actorById(db, id))!),
      ),
    );
  }
  groupId = (
    await pool().query(
      "INSERT INTO church.email_groups(name,created_by) VALUES($1,$2) RETURNING id",
      ["Nhóm thử thờ phượng " + randomUUID(), actorId],
    )
  ).rows[0].id;
  await pool().query(
    "INSERT INTO church.email_group_members(group_id,email) VALUES($1,'worship-group@example.test')",
    [groupId],
  );
  transport = mock.method(
    nodemailer,
    "createTransport",
    () =>
      ({
        sendMail: async (message: any) => {
          messages.push(message);
          if (fault)
            throw Object.assign(
              new Error("private mocked SMTP failure"),
              fault === "failed"
                ? { code: "EENVELOPE", responseCode: 550 }
                : { code: "ETIMEDOUT", command: "DATA" },
            );
        },
      }) as any,
  );
  process.env.SMTP_USER = "mock@example.test";
  process.env.SMTP_PASS = "test-only";
});
afterEach(() => {
  fault = null;
});
after(async () => {
  transport.mock.restore();
  if (oldEnv.user === undefined) delete process.env.SMTP_USER;
  else process.env.SMTP_USER = oldEnv.user;
  if (oldEnv.pass === undefined) delete process.env.SMTP_PASS;
  else process.env.SMTP_PASS = oldEnv.pass;
  await pool().query(
    "UPDATE church.event_notification_deliveries SET status='cancelled' WHERE status IN('pending','sending') AND notification_id IN(SELECT id FROM church.event_notifications WHERE created_by=$1)",
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
  await pool().end();
});

async function update(
  event: any,
  originalText: string,
  groupIds: string[] = [],
) {
  const input = {
    eventDate: event.eventDate,
    originalText,
    groupIds,
    requestId: randomUUID(),
    version: event.version,
  };
  return {
    input,
    event: await json(
      await editEvent(
        req(`/api/events/${event.id}`, "PATCH", input),
        ctx(event.id),
      ),
    ),
  };
}
test("every worship create/edit emails selected groups and a separate Viber draft exactly once", async () => {
  const before = messages.length,
    { event, input } = await create(text(), [groupId]);
  assert.equal(messages.length, before + 2);
  assert.equal(
    messages.filter((mail) => mail.to === "worship-group@example.test").length,
    1,
  );
  assert.ok(
    messages.some(
      (mail) =>
        mail.to === "nguyentruongky33@gmail.com" &&
        mail.subject.includes("Bản nháp Viber"),
    ),
  );
  await json(await createEvent(req("/api/events", "POST", input)));
  assert.equal(messages.length, before + 2);
  const edited = await update(event, text() + "\nChủ đề được cập nhật", [
    groupId,
  ]);
  assert.equal(messages.length, before + 4);
  assert.ok(edited.event.notificationId);
  assert.ok(edited.event.worshipNotificationId);
  const latest = await json(
    await readViberDraft(
      req(`/api/worship-viber-drafts/${edited.event.worshipNotificationId}`),
      ctx(edited.event.worshipNotificationId),
    ),
  );
  assert.equal(
    latest.message,
    composeWorshipInformationRequest(edited.input.originalText).message,
  );
  await json(
    await editEvent(
      req(`/api/events/${event.id}`, "PATCH", edited.input),
      ctx(event.id),
    ),
  );
  assert.equal(messages.length, before + 4);
  // A late replay of the original save must not use a newer draft snapshot.
  await json(await createEvent(req("/api/events", "POST", input)));
  assert.equal(messages.length, before + 4);
  const receipts = (
    await pool().query(
      "SELECT worship_notification_id FROM church.event_save_requests WHERE event_id=$1 ORDER BY applied_version",
      [event.id],
    )
  ).rows;
  assert.deepEqual(
    receipts.map((row) => row.worship_notification_id),
    [event.worshipNotificationId, edited.event.worshipNotificationId],
  );
});
test("worship saves without groups still send the private draft, including complete programs", async () => {
  const before = messages.length,
    { event } = await create();
  assert.equal(messages.length, before + 1);
  assert.equal(event.notificationId, null);
  const complete =
    "LỊCH TRỰC NGÀY 08/11/2026 – LỄ 1\n" +
    Object.values((await import("@org/core")).WORSHIP_FIELD_LABELS)
      .map((label) => `${label}: Nội dung thực tế`)
      .join("\n");
  await update(event, complete, []);
  assert.equal(messages.length, before + 2);
  const last = messages.at(-1);
  assert.ok(last.text.endsWith(complete));
  assert.ok(last.text.includes("/worship-viber/"));
  assert.equal(last.text.includes("Xin nhờ"), false);
  const completeCreation = await create(complete);
  assert.ok(completeCreation.event.worshipNotificationId);
  assert.equal(messages.length, before + 3);
  assert.ok(messages.at(-1).text.includes("/worship-viber/"));
  assert.ok(messages.at(-1).text.endsWith(complete));
  assert.equal(last.text.includes("vẫn đang thiếu"), false);
});
test("group and Viber emails fail independently while the event stays saved", async () => {
  const env = process.env.APP_ORIGIN;
  const before = messages.length;
  let result: any;
  try {
    delete process.env.APP_ORIGIN;
    result = await create(text(), [groupId]);
  } finally {
    process.env.APP_ORIGIN = env;
  }
  assert.equal(messages.length, before + 1);
  assert.equal(messages.at(-1).to, "worship-group@example.test");
  assert.equal(
    (
      await pool().query(
        "SELECT status FROM church.notification_history WHERE id=$1",
        [result.event.worshipNotificationId],
      )
    ).rows[0].status,
    "failed",
  );
  const beforeGroupFailure = messages.length;
  const oneShot = mock.method(
    nodemailer,
    "createTransport",
    () =>
      ({
        sendMail: async (mail: any) => {
          messages.push(mail);
          if (mail.to === "worship-group@example.test")
            throw Object.assign(new Error("mock rejection"), {
              responseCode: 550,
            });
        },
      }) as any,
  );
  try {
    const saved = await create(text(), [groupId]);
    assert.equal(saved.event.delivery.failed, 1);
    assert.equal(
      (
        await pool().query(
          "SELECT status FROM church.notification_history WHERE id=$1",
          [saved.event.worshipNotificationId],
        )
      ).rows[0].status,
      "sent",
    );
  } finally {
    oneShot.mock.restore();
  }
  assert.equal(messages.length, beforeGroupFailure + 2);
});
test("automatic private failure appears in the bell and retries its saved snapshot without group resend", async () => {
  fault = "failed";
  const { event } = await create(),
    before = messages.length;
  fault = null;
  const { GET: alerts } =
    await import("../app/api/notifications/failures/route");
  const { POST: retryDraft } =
    await import("../app/api/worship-viber-drafts/[id]/retry/route");
  const feed = await json(await alerts(req("/api/notifications/failures")));
  const item = feed.items.find(
    (item: any) => item.id === event.worshipNotificationId,
  );
  assert.equal(item.kind, "worship_viber");
  assert.equal(item.retryable, 1);
  assert.ok(!item.title.includes("\n"));
  const input = { requestId: randomUUID() };
  const retry = () =>
    retryDraft(
      req(`/api/worship-viber-drafts/${item.id}/retry`, "POST", input),
      ctx(item.id),
    );
  assert.equal((await json(await retry())).delivery.sent, 1);
  assert.equal(messages.length, before + 1);
  await json(await retry());
  assert.equal(messages.length, before + 1);
  const refreshed = await json(
    await alerts(req("/api/notifications/failures")),
  );
  assert.equal(
    refreshed.items.some((alert: any) => alert.id === item.id),
    false,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.event_notifications WHERE event_id=$1",
        [event.id],
      )
    ).rows[0].n,
    0,
  );
});
test("uncertain automatic drafts are never blindly resent on duplicate saves or retries", async () => {
  fault = "uncertain";
  const { event, input } = await create(),
    before = messages.length;
  fault = null;
  await json(await createEvent(req("/api/events", "POST", input)));
  assert.equal(messages.length, before);
  const { POST: retryDraft } =
    await import("../app/api/worship-viber-drafts/[id]/retry/route");
  const result = await json(
    await retryDraft(
      req(
        `/api/worship-viber-drafts/${event.worshipNotificationId}/retry`,
        "POST",
        { requestId: randomUUID() },
      ),
      ctx(event.worshipNotificationId),
    ),
  );
  assert.equal(result.delivery.uncertain, 1);
  assert.equal(messages.length, before);
});
test("private emails contain only the web handoff link and full message; protected drafts contain the Viber URI", async () => {
  const original = text() + "\n<script>test & Unicode 🙏</script>",
    before = messages.length,
    { event } = await create(original);
  assert.equal(messages.length, before + 1);
  const mail = messages.at(-1);
  const message = composeWorshipInformationRequest(original).message;
  assert.equal(mail.text.includes("viber://"), false);
  assert.equal(mail.html.includes("viber://"), false);
  assert.ok(
    mail.text.includes(
      `http://127.0.0.1:3000/worship-viber/${event.worshipNotificationId}`,
    ),
  );
  assert.ok(mail.text.endsWith(message));
  assert.equal(mail.html.includes("<script>"), false);
  const snapshot = await json(
    await readViberDraft(
      req(`/api/worship-viber-drafts/${event.worshipNotificationId}`),
      ctx(event.worshipNotificationId),
    ),
  );
  assert.equal(snapshot.message, message);
  assert.equal(
    decodeURIComponent(snapshot.viberLink.split("&draft=")[1]),
    message,
  );
  const updated = await update(event, text() + "\nNội dung mới", []);
  assert.equal(updated.event.presetId, "worship-program");
  const latest = await json(
    await readViberDraft(
      req(`/api/worship-viber-drafts/${event.worshipNotificationId}?latest=1`),
      ctx(event.worshipNotificationId),
    ),
  );
  assert.equal(
    latest.message,
    composeWorshipInformationRequest(updated.event.originalText).message,
  );
  assert.equal(latest.version, updated.event.version);

  assert.equal(
    (
      await json(
        await readViberDraft(
          req(`/api/worship-viber-drafts/${event.worshipNotificationId}`),
          ctx(event.worshipNotificationId),
        ),
      )
    ).message,
    message,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT original_text FROM church.events WHERE id=$1",
        [event.id],
      )
    ).rows[0].original_text,
    text() + "\nNội dung mới",
  );
});
test("phone drafts and retry endpoints remain Admin-only and reject deleted events", async () => {
  const { event } = await create();
  const { POST: retryDraft } =
    await import("../app/api/worship-viber-drafts/[id]/retry/route");
  assert.equal(
    (
      await readViberDraft(
        new Request(
          `http://127.0.0.1:3000/api/worship-viber-drafts/${event.worshipNotificationId}`,
        ),
        ctx(event.worshipNotificationId),
      )
    ).status,
    401,
  );
  for (const role of ["secretary", "deacon", "board", "leader", "user"]) {
    await json(
      await readViberDraft(
        req(
          `/api/worship-viber-drafts/${event.worshipNotificationId}`,
          "GET",
          undefined,
          role,
        ),
        ctx(event.worshipNotificationId),
      ),
      403,
    );
    await json(
      await retryDraft(
        req(
          `/api/worship-viber-drafts/${event.worshipNotificationId}/retry`,
          "POST",
          { requestId: randomUUID() },
          role,
        ),
        ctx(event.worshipNotificationId),
      ),
      403,
    );
  }
  await pool().query("UPDATE church.events SET deleted_at=now() WHERE id=$1", [
    event.id,
  ]);
  await json(
    await readViberDraft(
      req(`/api/worship-viber-drafts/${event.worshipNotificationId}`),
      ctx(event.worshipNotificationId),
    ),
    404,
  );
});
test("phone email origin is trusted configuration with HTTPS required in production", () => {
  const savedOrigin = process.env.APP_ORIGIN,
    savedMode = process.env.NODE_ENV;
  try {
    for (const value of [
      "javascript:alert(1)",
      "https://user:secret@example.test",
      "https://example.test/path",
      "https://example.test/?x=1",
      "not a URL",
    ]) {
      process.env.APP_ORIGIN = value;
      assert.throws(() => worshipDraftOrigin());
    }
    Reflect.set(process.env, "NODE_ENV", "production");
    process.env.APP_ORIGIN = "http://example.test";
    assert.throws(() => worshipDraftOrigin());
    process.env.APP_ORIGIN = "https://church.example.test";
    const email = worshipViberEmail("Nội dung đầy đủ", randomUUID());
    assert.equal(email.html.includes("viber://"), false);
    assert.equal(email.text.includes("viber://"), false);
    assert.ok(email.html.includes("Mở bản nháp Viber</a>"));
    assert.ok(email.text.includes("Nội dung đầy đủ"));
    assert.ok(
      worshipViberEmail("Thông tin còn thiếu", randomUUID()).html.includes(
        "https://church.example.test/worship-viber/",
      ),
    );
  } finally {
    process.env.APP_ORIGIN = savedOrigin;
    Reflect.set(process.env, "NODE_ENV", savedMode);
  }
});

test("unchanged saves and their retries send no email and preserve the event version", async () => {
  const { event } = await create(text(), [groupId]);
  const before = messages.length;
  const unchanged = await update(event, event.originalText, [groupId]);
  assert.equal(messages.length, before);
  assert.equal(unchanged.event.version, event.version);
  assert.equal(unchanged.event.notificationId, null);
  assert.equal(unchanged.event.worshipNotificationId, null);
  await json(
    await editEvent(
      req(`/api/events/${event.id}`, "PATCH", unchanged.input),
      ctx(event.id),
    ),
  );
  assert.equal(messages.length, before);
  const changed = await update(
    unchanged.event,
    event.originalText + "\nCập nhật thực tế",
    [groupId],
  );
  assert.equal(messages.length, before + 2);
  assert.equal(changed.event.version, event.version + 1);
  await json(
    await editEvent(
      req(`/api/events/${event.id}`, "PATCH", unchanged.input),
      ctx(event.id),
    ),
  );
  assert.equal(messages.length, before + 2);
  const stale = await editEvent(
    req(`/api/events/${event.id}`, "PATCH", {
      ...unchanged.input,
      originalText: changed.event.originalText,
      requestId: randomUUID(),
    }),
    ctx(event.id),
  );
  assert.equal(stale.status, 409);
});
test("changing only recipient groups saves the selection without resending unchanged content", async () => {
  const { event } = await create();
  const before = messages.length;
  const result = await update(event, event.originalText, [groupId]);
  assert.deepEqual(result.event.groupIds, [groupId]);
  assert.equal(result.event.version, event.version + 1);
  assert.equal(messages.length, before);
  assert.equal(result.event.notificationId, null);
  assert.equal(result.event.worshipNotificationId, null);
});
