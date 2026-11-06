import { queueEventNotification } from "../lib/server/calendar";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { before, after, test, mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import JSZip from "jszip";
import nodemailer from "nodemailer";
import { pool, transaction } from "../lib/server/db";
import { actorById, createSession } from "../lib/server/session";
import { hashPassword } from "../lib/server/password";
import {
  processCalendarOutbox,
  eventEmail,
} from "../lib/server/calendar-delivery";
import { GET as events, POST as createEvent } from "../app/api/events/route";
import {
  GET as event,
  PATCH as editEvent,
  DELETE as deleteEvent,
} from "../app/api/events/[id]/route";
import {
  GET as groups,
  POST as createGroup,
} from "../app/api/email-groups/route";
import {
  GET as group,
  PATCH as editGroup,
  DELETE as deleteGroup,
} from "../app/api/email-groups/[id]/route";
import { POST as addEmails } from "../app/api/email-groups/[id]/members/route";
import { DELETE as removeEmail } from "../app/api/email-groups/[id]/members/[memberId]/route";
import { POST as previewRecipients } from "../app/api/email-groups/recipients/route";
import {
  GET as history,
  POST as notify,
} from "../app/api/events/[id]/notifications/route";
import { GET as failureAlerts } from "../app/api/notifications/failures/route";
import { GET as allHistory } from "../app/api/notifications/route";
import { GET as deliveries } from "../app/api/notifications/[id]/deliveries/route";
import { POST as retry } from "../app/api/notifications/[id]/retry/route";
import { PATCH as resolve } from "../app/api/notification-deliveries/[id]/route";
import { GET as preview } from "../app/api/events/export/route";
import { POST as docx } from "../app/api/events/export/docx/route";
const tokens: Record<string, string> = {},
  ids: Record<string, string> = {};
let g1: any, g2: any, e1: any, batchId: string;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
function req(path: string, method = "GET", data?: unknown, role = "admin") {
  return new Request("http://127.0.0.1:3000" + path, {
    method,
    headers: {
      Origin: "http://127.0.0.1:3000",
      Authorization: "Bearer " + (tokens[role] ?? ""),
      ...(data === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}
async function json(response: Response, status = 200) {
  const body = await response.json();
  assert.equal(response.status, status, JSON.stringify(body));
  return body;
}
// Arrange a durable recovery batch without invoking the HTTP post-commit sender.
async function pendingBatch(eventId: string) {
  return transaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(74298331)");
    return queueEventNotification(
      db,
      (await actorById(db, ids.admin))!,
      eventId,
      { requestId: randomUUID() },
    );
  });
}
before(async () => {
  const hash = await hashPassword("Calendar-test-password!");
  for (const role of [
    "admin",
    "secretary",
    "deacon",
    "board",
    "leader",
    "user",
  ]) {
    const id = (ids[role] = randomUUID());
    await pool().query(
      "INSERT INTO church.member_profiles(id,email,full_name,role_id) VALUES($1,$2,$3,$4)",
      [id, `calendar-${role}@example.test`, `Lịch ${role}`, role],
    );
    await pool().query(
      "INSERT INTO church.users(id,email,full_name,role_id,password_hash,is_password_set) VALUES($1,$2,$3,$4,$5,true)",
      [id, `calendar-${role}@example.test`, `Lịch ${role}`, role, hash],
    );
    tokens[role] = await transaction(async (db) =>
      createSession(db, (await actorById(db, id))!),
    );
  }
});
after(() => pool().end());
test("calendar APIs require authentication and enforce Admin / Secretary view-export ceilings", async () => {
  assert.equal(
    (
      await events(
        req(
          "/api/events?from=2026-11-02&to=2026-11-08",
          "GET",
          undefined,
          "none",
        ),
      )
    ).status,
    401,
  );
  for (const role of ["deacon", "board", "leader", "user"]) {
    assert.equal(
      (
        await events(
          req(
            "/api/events?from=2026-11-02&to=2026-11-08",
            "GET",
            undefined,
            role,
          ),
        )
      ).status,
      403,
    );
    assert.equal(
      (await groups(req("/api/email-groups", "GET", undefined, role))).status,
      403,
    );
  }
  assert.equal(
    (
      await events(
        req(
          "/api/events?from=2026-11-02&to=2026-11-08",
          "GET",
          undefined,
          "secretary",
        ),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await createEvent(
        req(
          "/api/events",
          "POST",
          {
            eventDate: "2026-11-02",
            originalText: "Không được tạo",
            requestId: randomUUID(),
          },
          "secretary",
        ),
      )
    ).status,
    403,
  );
  assert.equal(
    (await groups(req("/api/email-groups", "GET", undefined, "secretary")))
      .status,
    403,
  );
  assert.equal(
    (
      await preview(
        req(
          "/api/events/export?from=2026-11-02&to=2026-11-08",
          "GET",
          undefined,
          "secretary",
        ),
      )
    ).status,
    200,
  );
});
test("email group CRUD and bulk feedback normalize, deduplicate, validate and protect membership scope", async () => {
  g1 = await json(
    await createGroup(
      req("/api/email-groups", "POST", { name: "Nhóm lịch A" }),
    ),
  );
  g2 = await json(
    await createGroup(
      req("/api/email-groups", "POST", { name: "Nhóm lịch B" }),
    ),
  );
  const bulk = await json(
    await addEmails(
      req(`/api/email-groups/${g1.id}/members`, "POST", {
        text: "ONE@example.test;two@example.test\none@example.test,invalid",
      }),
      ctx(g1.id),
    ),
  );
  assert.equal(bulk.added, 2);
  assert.deepEqual(bulk.invalid, ["invalid"]);
  assert.deepEqual(bulk.duplicates, ["one@example.test"]);
  const existing = await json(
    await addEmails(
      req(`/api/email-groups/${g1.id}/members`, "POST", {
        text: "one@example.test",
      }),
      ctx(g1.id),
    ),
  );
  assert.equal(existing.added, 0);
  assert.deepEqual(existing.alreadyExisting, ["one@example.test"]);
  await json(
    await addEmails(
      req(`/api/email-groups/${g2.id}/members`, "POST", {
        text: "two@example.test;three@example.test",
      }),
      ctx(g2.id),
    ),
  );
  g1 = await json(await group(req(`/api/email-groups/${g1.id}`), ctx(g1.id)));
  assert.equal(
    (
      await removeEmail(
        req(
          `/api/email-groups/${g2.id}/members/${g1.members[0].id}`,
          "DELETE",
          {},
        ),
        { params: Promise.resolve({ id: g2.id, memberId: g1.members[0].id }) },
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await editGroup(
        req(`/api/email-groups/${g1.id}`, "PATCH", {
          name: "Đổi tên",
          version: 0,
        }),
        ctx(g1.id),
      )
    ).status,
    409,
  );
  g1 = await json(
    await editGroup(
      req(`/api/email-groups/${g1.id}`, "PATCH", {
        name: "Nhóm lịch A đổi tên",
        version: g1.version,
      }),
      ctx(g1.id),
    ),
  );
  assert.equal(
    (await json(await groups(req("/api/email-groups")))).items.length,
    2,
  );
  assert.equal(
    (
      await json(
        await previewRecipients(
          req("/api/email-groups/recipients", "POST", {
            groupIds: [g1.id, g2.id],
          }),
        ),
      )
    ).count,
    3,
  );
});
test("event creation snapshots deduplicated recipients and is idempotent across repeated concurrent requests", async () => {
  const input = {
    eventDate: "2026-11-02",
    originalText:
      "Sinh hoạt 🙏\r\n08h00 - 10h00\r\nChủ đề: Yêu thương\r\n\r\n- Cầu nguyện",
    groupIds: [g1.id, g2.id],
    requestId: randomUUID(),
  };
  const result = await Promise.all([
    createEvent(req("/api/events", "POST", input)),
    createEvent(req("/api/events", "POST", input)),
  ]);
  e1 = await json(result[0]);
  assert.equal((await json(result[1])).id, e1.id);
  assert.equal(e1.originalText, input.originalText);
  assert.equal(e1.startTime, "08:00");
  assert.equal(
    e1.createdAt,
    (
      await pool().query("SELECT created_at FROM church.events WHERE id=$1", [
        e1.id,
      ])
    ).rows[0].created_at.toISOString(),
  );
  const h = await json(
    await history(req(`/api/events/${e1.id}/notifications`), ctx(e1.id)),
  );
  assert.equal(h.items.length, 1);
  batchId = h.items[0].id;
  assert.equal(h.items[0].counts.sent, 3);
  assert.equal(
    (
      await createEvent(
        req("/api/events", "POST", { ...input, originalText: "Đổi dữ liệu" }),
      )
    ).status,
    409,
  );
  const privateData = await json(
    await event(
      req(`/api/events/${e1.id}`, "GET", undefined, "secretary"),
      ctx(e1.id),
    ),
  );
  assert.deepEqual(privateData.groupIds, []);
  assert.equal(
    (
      await history(
        req(
          `/api/events/${e1.id}/notifications`,
          "GET",
          undefined,
          "secretary",
        ),
        ctx(e1.id),
      )
    ).status,
    403,
  );
});
test("inclusive range queries contain endpoints and no-time events; edits require versions and send updates immediately", async () => {
  for (const date of ["2026-11-01", "2026-11-08", "2026-11-09"])
    await json(
      await createEvent(
        req("/api/events", "POST", {
          eventDate: date,
          originalText: "Không có giờ " + date,
          requestId: randomUUID(),
        }),
      ),
    );
  const range = await json(
    await events(req("/api/events?from=2026-11-02&to=2026-11-08")),
  );
  assert.equal(range.items.length, 2);
  assert.equal(range.items[1].timeText, null);
  assert.equal(
    (await events(req("/api/events?from=2026-11-08&to=2026-11-02"))).status,
    400,
  );
  assert.equal(
    (
      await createEvent(
        req("/api/events", "POST", {
          eventDate: "2026-02-30",
          originalText: "Sai",
          requestId: randomUUID(),
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await createEvent(
        req("/api/events", "POST", {
          eventDate: "2026-11-02",
          originalText: " ",
          requestId: randomUUID(),
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await editEvent(
        req(`/api/events/${e1.id}`, "PATCH", {
          ...e1,
          eventDate: "2026-11-03",
        }),
        ctx(e1.id),
      )
    ).status,
    400,
  );
  e1 = await json(
    await editEvent(
      req(`/api/events/${e1.id}`, "PATCH", {
        eventDate: "2026-11-03",
        originalText: "Đã sửa\nKhông phải giờ\nChi tiết",
        groupIds: [g1.id, g2.id],
        version: e1.version,
        requestId: randomUUID(),
      }),
      ctx(e1.id),
    ),
  );
  assert.equal(e1.timeText, null);
  assert.equal(e1.details, "Không phải giờ\nChi tiết");
  const h = await json(
    await history(req(`/api/events/${e1.id}/notifications`), ctx(e1.id)),
  );
  assert.equal(h.items.length, 2);
  assert.equal(h.items[0].counts.sent, 3);
  assert.equal(
    (
      await editEvent(
        req(`/api/events/${e1.id}`, "PATCH", {
          eventDate: e1.eventDate,
          originalText: e1.originalText,
          groupIds: [],
          version: 0,
          requestId: randomUUID(),
        }),
        ctx(e1.id),
      )
    ).status,
    409,
  );
});
test("worker records partial outcomes, protects recipient privacy, and retries failed addresses only once per key", async () => {
  batchId = (await pendingBatch(e1.id)).id;
  const old = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
  const sent: any[] = [];
  const transport = mock.method(
    nodemailer,
    "createTransport",
    () =>
      ({
        sendMail: async (message: any) => {
          sent.push(message);
          if (message.to === "two@example.test")
            throw Object.assign(new Error("private SMTP text not returned"), {
              code: "EENVELOPE",
            });
        },
      }) as any,
  );
  try {
    process.env.SMTP_USER = "test@example.test";
    process.env.SMTP_PASS = "test-only";
    const result = await processCalendarOutbox(10);
    assert.deepEqual(result, { sent: 2, failed: 1, uncertain: 0 });
    assert.equal(sent.length, 3);
    for (const message of sent) {
      assert.equal(typeof message.to, "string");
      assert.equal("bcc" in message, false);
      assert.ok(message.messageId);
      assert.ok(message.text.includes("Đã sửa"));
      assert.ok(!message.text.includes("one@example.test"));
    }
    let rows = await json(
      await deliveries(
        req(`/api/notifications/${batchId}/deliveries?page=1`),
        ctx(batchId),
      ),
    );
    assert.equal(rows.total, 3);
    assert.ok(!JSON.stringify(rows).includes("private SMTP"));
    const requestId = randomUUID();
    assert.equal(
      (
        await json(
          await retry(
            req(`/api/notifications/${batchId}/retry`, "POST", { requestId }),
            ctx(batchId),
          ),
        )
      ).count,
      1,
    );
    assert.equal(
      (
        await json(
          await retry(
            req(`/api/notifications/${batchId}/retry`, "POST", { requestId }),
            ctx(batchId),
          ),
        )
      ).count,
      1,
    );
    assert.equal(sent.length, 4, "retry API sends immediately");
    await processCalendarOutbox(10);
    assert.equal(sent.length, 4);
    assert.equal(sent[3].to, "two@example.test");
    rows = await json(
      await deliveries(
        req(`/api/notifications/${batchId}/deliveries`),
        ctx(batchId),
      ),
    );
    assert.equal(rows.items.filter((r: any) => r.status === "sent").length, 2);
  } finally {
    transport.mock.restore();
    if (old.user === undefined) delete process.env.SMTP_USER;
    else process.env.SMTP_USER = old.user;
    if (old.pass === undefined) delete process.env.SMTP_PASS;
    else process.env.SMTP_PASS = old.pass;
  }
});
test("uncertain interrupted delivery is not automatically resent and needs explicit operator resolution", async () => {
  const row = (
    await pool().query(
      "SELECT id,attempts FROM church.event_notification_deliveries WHERE notification_id=$1 AND status='failed'",
      [batchId],
    )
  ).rows[0];
  await pool().query(
    "UPDATE church.event_notification_deliveries SET status='sending',claimed_at=now()-interval '10 minutes' WHERE id=$1",
    [row.id],
  );
  await processCalendarOutbox(1);
  assert.equal(
    (
      await pool().query(
        "SELECT status FROM church.event_notification_deliveries WHERE id=$1",
        [row.id],
      )
    ).rows[0].status,
    "uncertain",
  );
  assert.equal(
    (
      await json(
        await retry(
          req(`/api/notifications/${batchId}/retry`, "POST", {
            requestId: randomUUID(),
          }),
          ctx(batchId),
        ),
      )
    ).count,
    0,
  );
  await json(
    await resolve(
      req(`/api/notification-deliveries/${row.id}`, "PATCH", {
        status: "sent",
        attempt: row.attempts,
      }),
      ctx(row.id),
    ),
  );
  assert.equal(
    (
      await pool().query(
        "SELECT status FROM church.event_notification_deliveries WHERE id=$1",
        [row.id],
      )
    ).rows[0].status,
    "sent",
  );
  assert.equal(
    (
      await resolve(
        req(`/api/notification-deliveries/${row.id}`, "PATCH", {
          status: "failed",
          attempt: row.attempts,
        }),
        ctx(row.id),
      )
    ).status,
    409,
  );
});
test("explicit update notifications snapshot current content without automatic historical additions", async () => {
  const requestId = randomUUID();
  const first = await json(
    await notify(
      req(`/api/events/${e1.id}/notifications`, "POST", { requestId }),
      ctx(e1.id),
    ),
  );
  assert.equal(
    (
      await json(
        await notify(
          req(`/api/events/${e1.id}/notifications`, "POST", { requestId }),
          ctx(e1.id),
        ),
      )
    ).id,
    first.id,
  );
  const snap = (
    await pool().query(
      "SELECT snapshot FROM church.event_notifications WHERE id=$1",
      [first.id],
    )
  ).rows[0].snapshot;
  assert.equal(snap.title, "Đã sửa");
  await json(
    await addEmails(
      req(`/api/email-groups/${g1.id}/members`, "POST", {
        text: "late@example.test",
      }),
      ctx(g1.id),
    ),
  );
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.event_notification_deliveries WHERE notification_id=$1",
        [first.id],
      )
    ).rows[0].n,
    3,
  );
});
test("DOCX exports edited Unicode text and long details as valid A4 OOXML, without modifying events", async () => {
  const p = await json(
    await preview(
      req(
        "/api/events/export?from=2026-11-02&to=2026-11-08",
        "GET",
        undefined,
        "secretary",
      ),
    ),
  );
  assert.ok(p.text.includes("Đã sửa"));
  const text =
    "Nội dung do người dùng sửa 🙏\n\n" + "Chi tiết tiếng Việt\n".repeat(3000);
  const response = await docx(
    req(
      "/api/events/export/docx",
      "POST",
      { from: p.from, to: p.to, text },
      "secretary",
    ),
  );
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("content-type"),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  assert.match(
    response.headers.get("content-disposition")!,
    /lich-sinh-hoat-2026-11-02-den-2026-11-08\.docx/,
  );
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const xml = await zip.file("word/document.xml")!.async("string");
  assert.ok(xml.includes("Nội dung do người dùng sửa 🙏"));
  assert.ok(xml.includes("Chi tiết tiếng Việt"));
  assert.equal(xml.split("Chi tiết tiếng Việt").length - 1, 3000);
  assert.match(xml, /11906/);
  assert.match(xml, /16838/);
  assert.equal(
    (
      await docx(
        req("/api/events/export/docx", "POST", {
          from: p.from,
          to: p.to,
          text: "\n".repeat(12000),
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (await json(await event(req(`/api/events/${e1.id}`), ctx(e1.id)))).title,
    "Đã sửa",
  );
  assert.equal(
    (
      await docx(
        req("/api/events/export/docx", "POST", {
          from: "../../bad",
          to: p.to,
          text,
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await docx(
        req(
          "/api/events/export/docx",
          "POST",
          { from: p.from, to: p.to, text },
          "user",
        ),
      )
    ).status,
    403,
  );
});
test("deleting groups/events retains recipient snapshots and global delivery history, and cancels pending mail", async () => {
  g1 = await json(await group(req(`/api/email-groups/${g1.id}`), ctx(g1.id)));
  const originalRecipient = g1.members.find(
    (m: any) => m.email === "one@example.test",
  );
  await json(
    await removeEmail(
      req(
        `/api/email-groups/${g1.id}/members/${originalRecipient.id}`,
        "DELETE",
        {},
      ),
      {
        params: Promise.resolve({ id: g1.id, memberId: originalRecipient.id }),
      },
    ),
  );
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.event_notification_deliveries WHERE notification_id=$1",
        [batchId],
      )
    ).rows[0].n,
    3,
  );
  g1 = await json(await group(req(`/api/email-groups/${g1.id}`), ctx(g1.id)));
  await json(
    await deleteGroup(
      req(`/api/email-groups/${g1.id}`, "DELETE", { version: g1.version }),
      ctx(g1.id),
    ),
  );
  assert.equal(
    (await group(req(`/api/email-groups/${g1.id}`), ctx(g1.id))).status,
    404,
  );
  const h = await json(
    await history(req(`/api/events/${e1.id}/notifications`), ctx(e1.id)),
  );
  assert.ok(h.items[0].groupNames.includes("Nhóm lịch A đổi tên"));
  await pendingBatch(e1.id);
  await json(
    await deleteEvent(
      req(`/api/events/${e1.id}`, "DELETE", { version: e1.version }),
      ctx(e1.id),
    ),
  );
  assert.equal(
    (await event(req(`/api/events/${e1.id}`), ctx(e1.id))).status,
    404,
  );
  assert.equal(
    (
      await json(
        await history(req(`/api/events/${e1.id}/notifications`), ctx(e1.id)),
      )
    ).items.length,
    5,
  );
  const all = await json(await allHistory(req("/api/notifications?page=1")));
  assert.ok(all.items.some((n: any) => n.eventDeleted && n.eventId === e1.id));
  assert.equal(
    (
      await retry(
        req(`/api/notifications/${batchId}/retry`, "POST", {
          requestId: randomUUID(),
        }),
        ctx(batchId),
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.event_notification_deliveries d JOIN church.event_notifications n ON n.id=d.notification_id WHERE n.event_id=$1 AND d.status='pending'",
        [e1.id],
      )
    ).rows[0].n,
    0,
  );
});
test("calendar mutations reject forged origins and mail HTML escapes pasted content", async () => {
  const request = req("/api/events", "POST", {
    eventDate: "2026-11-02",
    originalText: "XSS",
    requestId: randomUUID(),
  });
  request.headers.set("Origin", "https://attacker.test");
  assert.equal((await createEvent(request)).status, 403);
  const mail = eventEmail({
    title: "<script>alert(1)</script>",
    eventDate: "2026-11-02",
    timeText: null,
    details: "<img src=x onerror=alert(1)> & 🙏",
  });
  assert.ok(!mail.html.includes("<script>"));
  assert.ok(mail.html.includes("&lt;img"));
  assert.ok(mail.text.includes("<img"));
  assert.equal(
    (
      await deliveries(
        req(
          `/api/notifications/${batchId}/deliveries`,
          "GET",
          undefined,
          "secretary",
        ),
        ctx(batchId),
      )
    ).status,
    403,
  );
});

test("concurrent outbox workers claim each recipient once; ambiguous SMTP errors remain uncertain", async () => {
  const value = await json(
    await createEvent(
      req("/api/events", "POST", {
        eventDate: "2026-11-10",
        originalText: "Gửi song song",
        groupIds: [g2.id],
        requestId: randomUUID(),
      }),
    ),
  );
  await pendingBatch(value.id);
  const delivered: string[] = [];
  const old = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
  let ambiguous = false;
  const transport = mock.method(
    nodemailer,
    "createTransport",
    () =>
      ({
        sendMail: async (message: any) => {
          delivered.push(message.messageId);
          await new Promise((resolve) => setTimeout(resolve, 10));
          if (ambiguous)
            throw Object.assign(new Error("private timeout"), {
              code: "ETIMEDOUT",
              command: "DATA",
            });
        },
      }) as any,
  );
  try {
    process.env.SMTP_USER = "test@example.test";
    process.env.SMTP_PASS = "test-only";
    await Promise.all([processCalendarOutbox(2), processCalendarOutbox(2)]);
    assert.equal(delivered.length, 2);
    assert.equal(new Set(delivered).size, 2);
    ambiguous = true;
    const batch = await json(
      await notify(
        req(`/api/events/${value.id}/notifications`, "POST", {
          requestId: randomUUID(),
        }),
        ctx(value.id),
      ),
    );
    assert.equal(batch.delivery.uncertain, 2);
    const outcome = await processCalendarOutbox(5);
    assert.equal(outcome.uncertain, 0);
    assert.equal(
      (
        await json(
          await retry(
            req(`/api/notifications/${batch.id}/retry`, "POST", {
              requestId: randomUUID(),
            }),
            ctx(batch.id),
          ),
        )
      ).count,
      0,
    );
  } finally {
    transport.mock.restore();
    if (old.user === undefined) delete process.env.SMTP_USER;
    else process.env.SMTP_USER = old.user;
    if (old.pass === undefined) delete process.env.SMTP_PASS;
    else process.env.SMTP_PASS = old.pass;
  }
});

test("all management, notification and group endpoints reject Secretary mutations and disclose no recipient data", async () => {
  const id = randomUUID(),
    path = "/unused";
  const writes = [
    () => editEvent(req(path, "PATCH", {}, "secretary"), ctx(id)),
    () => deleteEvent(req(path, "DELETE", {}, "secretary"), ctx(id)),
    () => createGroup(req(path, "POST", {}, "secretary")),
    () => editGroup(req(path, "PATCH", {}, "secretary"), ctx(id)),
    () => deleteGroup(req(path, "DELETE", {}, "secretary"), ctx(id)),
    () => addEmails(req(path, "POST", {}, "secretary"), ctx(id)),
    () =>
      removeEmail(req(path, "DELETE", {}, "secretary"), {
        params: Promise.resolve({ id, memberId: id }),
      }),
    () => notify(req(path, "POST", {}, "secretary"), ctx(id)),
    () => retry(req(path, "POST", {}, "secretary"), ctx(id)),
    () => resolve(req(path, "PATCH", {}, "secretary"), ctx(id)),
    () => previewRecipients(req(path, "POST", {}, "secretary")),
  ];
  for (const action of writes) assert.equal((await action()).status, 403);
  assert.equal(
    (
      await failureAlerts(
        req("/api/notifications/failures", "GET", undefined, "secretary"),
      )
    ).status,
    403,
  );
  assert.equal(
    (await allHistory(req("/api/notifications", "GET", undefined, "secretary")))
      .status,
    403,
  );
  assert.equal(
    (await group(req(path, "GET", undefined, "secretary"), ctx(id))).status,
    403,
  );
});

test("calendar delivery CLI runs against the isolated database without contacting real SMTP", async () => {
  const result = await promisify(execFile)(
    process.execPath,
    ["--import", "tsx", "scripts/calendar-deliver.ts", "--limit=1"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SMTP_USER: "",
        SMTP_PASS: "",
        EMAIL_DELIVERY_MODE: "file",
      },
      timeout: 20000,
    },
  );
  assert.match(result.stdout, /Calendar delivery summary:/);
  assert.ok(!result.stdout.includes("@example.test"));
});
