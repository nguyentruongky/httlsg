import { before, after, test, mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { pool, transaction } from "../lib/server/db";
import { hashPassword } from "../lib/server/password";
import { actorById, createSession } from "../lib/server/session";
import { POST } from "../app/api/events/export/email/route";
const tokens = new Map<string, string>();
const messages: any[] = [];
let fault: "failed" | "uncertain" | null = null;
let transport: any;
const old = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
const preview = {
  from: "2026-11-01",
  to: "2026-11-07",
  text: "LỊCH SINH HOẠT\n1. Cảm tạ 🙏\n<script>Không thực thi & giữ nguyên</script>\n",
};
function req(input: unknown, role = "admin", origin = "http://127.0.0.1:3000") {
  return new Request("http://127.0.0.1:3000/api/events/export/email", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + (tokens.get(role) ?? ""),
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}
async function send(input: unknown, status = 200, role = "admin") {
  const response = await POST(req(input, role));
  const data = await response.json();
  assert.equal(response.status, status, JSON.stringify(data));
  return data;
}
before(async () => {
  const passwordHash = await hashPassword("Export-mail-test!123");
  for (const role of ["admin", "secretary", "user"]) {
    const id = randomUUID();
    await pool().query(
      "INSERT INTO church.member_profiles(id,email,full_name,role_id) VALUES($1,$2,'Export mail test',$3)",
      [id, "export-" + role + "@example.test", role],
    );
    await pool().query(
      "INSERT INTO church.users(id,email,full_name,role_id,is_password_set,password_hash) VALUES($1,$2,'Export mail test',$3,true,$4)",
      [id, "export-" + role + "@example.test", role, passwordHash],
    );
    tokens.set(
      role,
      await transaction(async (db) =>
        createSession(db, (await actorById(db, id))!),
      ),
    );
  }
  process.env.SMTP_USER = "export-test@example.test";
  process.env.SMTP_PASS = "synthetic-test-value";
  transport = mock.method(nodemailer, "createTransport", (() => ({
    sendMail: async (mail: any) => {
      if (mail.to === "btt.httlsaigon@gmail.com" && fault)
        throw Object.assign(
          new Error("Synthetic delivery failure"),
          fault === "failed"
            ? { responseCode: 550 }
            : { code: "ETIMEDOUT", command: "DATA" },
        );
      messages.push(mail);
    },
  })) as any);
});
after(async () => {
  transport?.mock.restore();
  if (old.user === undefined) delete process.env.SMTP_USER;
  else process.env.SMTP_USER = old.user;
  if (old.pass === undefined) delete process.env.SMTP_PASS;
  else process.env.SMTP_PASS = old.pass;
  await pool().end();
});
test("export email sends the exact edited preview privately to the two fixed recipients and deduplicates concurrent requests", async () => {
  const input = { requestId: randomUUID(), preview };
  const before = messages.length;
  await Promise.all([send(input), send(input)]);
  assert.equal(messages.length, before + 2);
  assert.deepEqual(
    messages
      .slice(before)
      .map((mail) => mail.to)
      .sort(),
    ["btt.httlsaigon@gmail.com", "nguyentruongky33@gmail.com"],
  );
  for (const mail of messages.slice(before)) {
    assert.equal(mail.text, preview.text);
    assert.ok(mail.subject.includes("01/11/2026 – 07/11/2026"));
    assert.ok(mail.html.includes("&lt;script&gt;"));
    assert.equal(mail.html.includes("<script>"), false);
  }
  assert.equal((await send(input)).sent, 2);
  assert.equal(messages.length, before + 2);
  await send({ ...input, preview: { ...preview, text: "Different" } }, 409);
});
test("a partial export-email failure retries only the failed address", async () => {
  const input = { requestId: randomUUID(), preview };
  fault = "failed";
  const before = messages.length;
  const partial = await send(input);
  assert.equal(partial.sent, 1);
  assert.equal(partial.failed, 1);
  fault = null;
  assert.equal((await send(input)).sent, 2);
  assert.equal(messages.length, before + 2);
  assert.equal(
    messages
      .slice(before)
      .filter((mail) => mail.to === "nguyentruongky33@gmail.com").length,
    1,
  );
});
test("an ambiguous SMTP result is not resent on an export email retry", async () => {
  const input = { requestId: randomUUID(), preview };
  fault = "uncertain";
  const first = await send(input);
  assert.equal(first.sent, 1);
  assert.equal(first.uncertain, 1);
  const before = messages.length;
  fault = null;
  assert.equal((await send(input)).uncertain, 1);
  assert.equal(messages.length, before);
});
test("export-email API enforces role, origin, fixed recipients and preview validation", async () => {
  const input = { requestId: randomUUID(), preview };
  await send(input, 403, "secretary");
  await send(input, 403, "user");
  await send(input, 401, "anonymous");
  assert.equal(
    (await POST(req(input, "admin", "https://attacker.test"))).status,
    403,
  );
  await send({ ...input, to: "attacker@example.test" }, 400);
  await send({ ...input, preview: { ...preview, to: "2025-01-01" } }, 400);
  await send(
    { ...input, preview: { ...preview, text: "x".repeat(500001) } },
    400,
  );
});
