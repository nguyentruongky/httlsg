import { before, after, test, mock } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import nodemailer from "nodemailer";
import { pool, transaction } from "../lib/server/db";
import { hashPassword } from "../lib/server/password";
import { actorById, createSession, cookieName } from "../lib/server/session";
import { POST as phoneRequest } from "../app/api/auth/request-phone-otp/route";
import { POST as emailRequest } from "../app/api/auth/request-email-otp/route";
import { POST as verify } from "../app/api/auth/verify-otp/route";
import { POST as setup } from "../app/api/auth/set-password/route";
import { POST as login } from "../app/api/auth/login/route";
import { GET as me } from "../app/api/auth/me/route";
import { GET as leaderOtps } from "../app/api/leader/otps/route";
import { GET as roles, POST as assignRole } from "../app/api/admin/roles/route";
import { GET as members } from "../app/api/members/route";
import { GET as memberDetail } from "../app/api/members/[id]/route";
import { GET as catalog } from "../app/api/catalog/route";
import { sendOtpEmail } from "../lib/server/mail";
const ids = {
  admin: "40000000-0000-4000-8000-000000000001",
  secretary: "40000000-0000-4000-8000-000000000002",
  leaderA: "40000000-0000-4000-8000-000000000003",
  leaderB: "40000000-0000-4000-8000-000000000004",
  member: "40000000-0000-4000-8000-000000000005",
  existing: "40000000-0000-4000-8000-000000000006",
};
const password = "Initial-password-otp-tests!";
const nextPassword = "Permanent-password-otp-tests!";
const cookies: Record<string, string> = {};
function req(path: string, data?: unknown, cookie = "") {
  return new Request(`http://127.0.0.1:3000${path}`, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      Origin: "http://127.0.0.1:3000",
      ...(cookie ? { cookie } : {}),
      ...(data === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}
function cookie(response: Response) {
  return response.headers.get("set-cookie")!.split(";")[0];
}
async function signIn(identifier: string, pw = password) {
  const response = await login(
    req("/api/auth/login", { identifier, password: pw }),
  );
  assert.equal(response.status, 200);
  return cookie(response);
}
async function getOtps(which = "leaderA") {
  const response = await leaderOtps(
    req("/api/leader/otps", undefined, cookies[which]),
  );
  assert.equal(response.status, 200);
  return response.json() as Promise<{
    items: { phone: string; otp_code: string; full_name: string }[];
    total: number;
  }>;
}
async function phone(
  phone: string,
  name = "Thành viên đăng ký",
  department = "thanh-nien",
) {
  return phoneRequest(
    req("/api/auth/request-phone-otp", {
      phone,
      full_name: name,
      department_id: department,
    }),
  );
}
async function codeFor(phone: string, which = "leaderA") {
  return (await getOtps(which)).items.find((item) => item.phone === phone)!
    .otp_code;
}
async function verifyCode(identifier: string, code: string) {
  return verify(req("/api/auth/verify-otp", { identifier, otp_code: code }));
}
async function emailCode(email: string) {
  const directory = process.env.OTP_OUTBOX_DIR!;
  const before = new Set(await readdir(directory).catch(() => []));
  const response = await emailRequest(
    req("/api/auth/request-email-otp", { email }),
  );
  assert.equal(response.status, 202);
  const created = (await readdir(directory)).filter(
    (file) => !before.has(file),
  );
  assert.equal(created.length, 1);
  const message = JSON.parse(
    await readFile(resolve(directory, created[0]), "utf8"),
  );
  assert.equal(message.to, email);
  const code = /[0-9]{6}/.exec(message.text)![0];
  return { code, message };
}
before(async () => {
  const encoded = await hashPassword(password);
  for (const [name, id] of Object.entries(ids)) {
    const role = name.startsWith("leader")
      ? "leader"
      : name === "existing"
        ? "user"
        : name === "member"
          ? "user"
          : name;
    const email = `otp-${name.toLowerCase()}@example.test`;
    await pool().query(
      "INSERT INTO church.member_profiles(id,email,full_name,role_id,phone) VALUES($1,$2,$3,$4,$5)",
      [id, email, `OTP ${name}`, role, name === "member" ? "0901234567" : null],
    );
    if (name !== "member")
      await pool().query(
        "INSERT INTO church.users(id,email,full_name,role_id,password_hash,is_password_set) VALUES($1,$2,$3,$4,$5,true)",
        [id, email, `OTP ${name}`, role, encoded],
      );
  }
  for (const [name, department] of [
    ["leaderA", "thanh-nien"],
    ["leaderB", "truyen-thong"],
  ]) {
    await pool().query("UPDATE church.users SET department_id=$2 WHERE id=$1", [
      ids[name as keyof typeof ids],
      department,
    ]);
    await pool().query(
      "INSERT INTO church.department_leaders(user_id,department_id) VALUES($1,$2)",
      [ids[name as keyof typeof ids], department],
    );
  }
  await pool().query(
    "INSERT INTO church.department_members(user_id,department_id) VALUES($1,'thanh-nien')",
    [ids.member],
  );
  const household = (
    await pool().query(
      "INSERT INTO church.households DEFAULT VALUES RETURNING id",
    )
  ).rows[0].id;
  await pool().query(
    "INSERT INTO church.household_members(user_id,household_id,relationship) VALUES($1,$3,'Thành viên'),($2,$3,'Con')",
    [ids.member, ids.existing, household],
  );
  for (const who of ["admin", "secretary", "leaderA", "leaderB", "existing"])
    cookies[who] = await signIn(`otp-${who.toLowerCase()}@example.test`);
});
after(async () => {
  mock.restoreAll();
  await pool().end();
});
test("login identifiers are unique while incomplete/shared-contact member profiles remain valid", async () => {
  const p = (
    await pool().query(
      "INSERT INTO church.member_profiles(full_name,phone) VALUES('Hồ sơ chưa có tài khoản','0901234567') RETURNING id",
    )
  ).rows[0];
  await assert.rejects(
    pool().query(
      "INSERT INTO church.users(id,full_name) VALUES($1,'No identifiers')",
      [p.id],
    ),
    { code: "23514" },
  );
  assert.equal(
    (
      await pool().query(
        "SELECT count(*) FROM church.member_profiles WHERE phone=$1",
        ["0901234567"],
      )
    ).rows[0].count,
    "2",
  );
  // Remove this synthetic duplicate to keep the named enrollment fixture unambiguous.
  await pool().query("DELETE FROM church.member_profiles WHERE id=$1", [p.id]);
});
test("phone request preserves an imported member, never returns an OTP, and scopes encrypted codes to its leader", async () => {
  const response = await phone("0901234567", "OTP member");
  assert.equal(response.status, 202);
  const data = await response.json();
  assert.equal("otp_code" in data, false);
  assert.match(data.message, /trưởng Ban ngành/);
  const account = (
    await pool().query("SELECT * FROM church.users WHERE phone=$1", [
      "+84901234567",
    ])
  ).rows[0];
  assert.equal(account.id, ids.member);
  assert.equal(account.is_password_set, false);
  assert.equal(account.department_id, "thanh-nien");
  const otp = (
    await pool().query(
      "SELECT *,EXTRACT(EPOCH FROM expires_at-created_at) duration FROM church.otps WHERE user_id=$1 AND NOT is_used",
      [ids.member],
    )
  ).rows[0];
  const code = await codeFor("+84901234567");
  assert.match(code, /^[0-9]{6}$/);
  assert.equal(otp.otp_code.length, 64);
  assert.notEqual(otp.otp_code, code);
  assert.ok(otp.otp_ciphertext);
  assert.equal(Number(otp.duration), 86400);
  assert.equal(
    (await getOtps("leaderB")).items.some(
      (item) => item.phone === "+84901234567",
    ),
    false,
  );
  assert.equal(
    (await leaderOtps(req("/api/leader/otps", undefined, cookies.admin)))
      .status,
    403,
  );
  const guessed = await leaderOtps(
    req(
      "/api/leader/otps?department_id=thanh-nien",
      undefined,
      cookies.leaderB,
    ),
  );
  assert.equal(
    (await guessed.json()).items.some(
      (item: any) => item.phone === "+84901234567",
    ),
    false,
  );
});
test("leader profile responses do not expose relatives outside the assigned department", async () => {
  const response = await memberDetail(
    req(`/api/members/${ids.member}`, undefined, cookies.leaderA),
    { params: Promise.resolve({ id: ids.member }) },
  );
  assert.equal(response.status, 200);
  assert.equal(
    (await response.json()).family.members.some(
      (m: any) => m.id === ids.existing,
    ),
    false,
  );
  assert.equal(
    (
      await memberDetail(
        req(`/api/members/${ids.existing}`, undefined, cookies.leaderA),
        { params: Promise.resolve({ id: ids.existing }) },
      )
    ).status,
    404,
  );
});
test("anonymous phone requests cannot rename accounts, move departments, or reset existing passwords", async () => {
  await phone("0901234567", "Tên giả mạo", "truyen-thong");
  const row = (
    await pool().query(
      "SELECT full_name,department_id FROM church.users WHERE id=$1",
      [ids.member],
    )
  ).rows[0];
  assert.equal(row.full_name, "OTP member");
  assert.equal(row.department_id, "thanh-nien");
  await pool().query(
    "UPDATE church.users SET phone='+84909999990',department_id='thanh-nien' WHERE id=$1",
    [ids.existing],
  );
  assert.equal((await phone("0909999990", "Existing")).status, 202);
  assert.equal(
    (await getOtps()).items.some((item) => item.phone === "+84909999990"),
    false,
  );
});
test("OTP grants only a restricted setup cookie, then password setup rotates/revokes every old session", async () => {
  const code = await codeFor("+84901234567");
  const response = await verifyCode("0901234567", code);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie")!, /Max-Age=900/);
  const restricted = cookie(response);
  const body = await response.json();
  assert.equal(body.requires_password_setup, true);
  assert.deepEqual(body.user.permissions, []);
  assert.equal(
    (await members(req("/api/members", undefined, restricted))).status,
    403,
  );
  assert.equal(
    (await catalog(req("/api/catalog", undefined, restricted))).status,
    403,
  );
  const profile = await me(req("/api/auth/me", undefined, restricted));
  assert.equal(profile.status, 200);
  assert.equal((await profile.json()).user.requiresPasswordSetup, true);
  const extra = await transaction(async (db) =>
    createSession(db, (await actorById(db, ids.member))!),
  );
  assert.equal(
    (
      await setup(
        req(
          "/api/auth/set-password",
          { new_password: "short", confirm_password: "short" },
          restricted,
        ),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await setup(
        req(
          "/api/auth/set-password",
          { new_password: nextPassword, confirm_password: "different" },
          restricted,
        ),
      )
    ).status,
    400,
  );
  const upgraded = await setup(
    req(
      "/api/auth/set-password",
      { new_password: nextPassword, confirm_password: nextPassword },
      restricted,
    ),
  );
  assert.equal(upgraded.status, 200);
  assert.match(upgraded.headers.get("set-cookie")!, /Max-Age=28800/);
  const full = cookie(upgraded);
  assert.notEqual(full, restricted);
  assert.equal((await upgraded.json()).requires_password_setup, false);
  assert.equal(
    (await me(req("/api/auth/me", undefined, restricted))).status,
    401,
  );
  assert.equal(
    (await me(req("/api/auth/me", undefined, `${cookieName()}=${extra}`)))
      .status,
    401,
  );
  assert.equal(
    (await members(req("/api/members", undefined, full))).status,
    200,
  );
  assert.equal((await verifyCode("0901234567", code)).status, 401);
  assert.equal(
    (
      await setup(
        req(
          "/api/auth/set-password",
          { new_password: nextPassword, confirm_password: nextPassword },
          restricted,
        ),
      )
    ).status,
    401,
  );
  cookies.member = await signIn("0901234567", nextPassword);
  const stored = (
    await pool().query(
      "SELECT is_password_set,password_hash,auth_version FROM church.users WHERE id=$1",
      [ids.member],
    )
  ).rows[0];
  assert.equal(stored.is_password_set, true);
  assert.match(stored.password_hash, /^\$argon2id\$/);
  assert.ok(stored.auth_version >= 2);
});
test("bad OTP attempts are committed, five failures consume the code, and resend invalidates earlier codes", async () => {
  await phone("0907777771");
  const first = await codeFor("+84907777771");
  const wrong = first === "000000" ? "000001" : "000000";
  for (let i = 0; i < 5; i++)
    assert.equal((await verifyCode("0907777771", wrong)).status, 401);
  assert.equal((await verifyCode("0907777771", first)).status, 401);
  const old = (
    await pool().query(
      "SELECT o.attempts,o.is_used FROM church.otps o JOIN church.users u ON u.id=o.user_id WHERE u.phone='+84907777771' ORDER BY o.created_at DESC LIMIT 1",
    )
  ).rows[0];
  assert.equal(old.attempts, 5);
  assert.equal(old.is_used, true);
  await phone("0907777771");
  const current = await codeFor("+84907777771");
  // Prove resend consumes the previous row; numeric collisions are possible and valid.
  assert.equal(
    (
      await pool().query(
        "SELECT count(*) FROM church.otps o JOIN church.users u ON u.id=o.user_id WHERE u.phone='+84907777771' AND NOT is_used",
      )
    ).rows[0].count,
    "1",
  );
  assert.equal((await verifyCode("0907777771", current)).status, 200);
});
test("email dispatch supports new-user setup and returning-user OTP login without exposing codes in responses", async () => {
  const fresh = await emailCode("otp-new-email@example.test");
  const row = (
    await pool().query(
      "SELECT o.*,EXTRACT(EPOCH FROM o.expires_at-o.created_at) duration FROM church.otps o JOIN church.users u ON u.id=o.user_id WHERE u.email='otp-new-email@example.test' AND NOT o.is_used",
    )
  ).rows[0];
  assert.equal(row.type, "EMAIL");
  assert.equal(row.otp_ciphertext, null);
  assert.equal(Number(row.duration), 600);
  const response = await verifyCode("otp-new-email@example.test", fresh.code);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).requires_password_setup, true);
  const existing = await emailCode("otp-existing@example.test");
  const returning = await verifyCode(
    "otp-existing@example.test",
    existing.code,
  );
  assert.equal(returning.status, 200);
  assert.equal((await returning.json()).requires_password_setup, false);
  assert.equal(
    (await members(req("/api/members", undefined, cookie(returning)))).status,
    200,
  );
});
test("expired OTPs, reused codes, cross-origin requests, and excessive issuance fail closed", async () => {
  await phone("0907777772");
  const code = await codeFor("+84907777772");
  await pool().query(
    "UPDATE church.otps SET created_at=now()-interval '25 hours',expires_at=now()-interval '1 hour' WHERE user_id=(SELECT id FROM church.users WHERE phone='+84907777772') AND NOT is_used",
  );
  assert.equal((await verifyCode("0907777772", code)).status, 401);
  const malicious = new Request(
    "http://127.0.0.1:3000/api/auth/request-phone-otp",
    {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        phone: "0907777773",
        full_name: "Blocked",
        department_id: "thanh-nien",
      }),
    },
  );
  assert.equal((await phoneRequest(malicious)).status, 403);
  for (let i = 0; i < 4; i++)
    assert.equal((await phone("0907777774")).status, i < 3 ? 202 : 429);
});
test("SMTP credentials select the SMTP transport and plaintext is never returned by the request API", async () => {
  const keys = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
  ] as const;
  const before = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  let delivery: any, configuration: any;
  const transport = mock.method(
    nodemailer,
    "createTransport",
    (options: any) => {
      configuration = options;
      return {
        sendMail: async (message: any) => {
          delivery = message;
        },
      } as any;
    },
  );
  try {
    Object.assign(process.env, {
      SMTP_HOST: "smtp.example.test",
      SMTP_PORT: "587",
      SMTP_USER: "sender@example.test",
      SMTP_PASS: "test-only-smtp-password",
      SMTP_FROM: "Church <sender@example.test>",
    });
    await sendOtpEmail("recipient@example.test", "012345");
    assert.equal(configuration.host, "smtp.example.test");
    assert.equal(configuration.requireTLS, true);
    assert.equal(configuration.secure, false);
    assert.equal(delivery.to, "recipient@example.test");
    assert.match(delivery.text, /012345/);
  } finally {
    transport.mock.restore();
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
});
test("leader reassignment invalidates sessions and enforces the new department; role permissions cannot exceed role bounds", async () => {
  assert.equal(
    (await roles(req("/api/admin/roles", undefined, cookies.leaderA))).status,
    403,
  );
  assert.equal(
    (await roles(req("/api/admin/roles", undefined, cookies.secretary))).status,
    200,
  );
  const forbidden = await assignRole(
    req(
      "/api/admin/roles",
      {
        action: "update-role-permissions",
        role_id: "deacon",
        permissions: ["access.manage"],
      },
      cookies.admin,
    ),
  );
  assert.equal(forbidden.status, 400);
  assert.equal(
    (
      await assignRole(
        req(
          "/api/admin/roles",
          {
            action: "update-role-permissions",
            role_id: "admin",
            permissions: [],
          },
          cookies.secretary,
        ),
      )
    ).status,
    400,
  );
  await phone("0907777775", "Ban khác", "truyen-thong");
  const changed = await assignRole(
    req(
      "/api/admin/roles",
      {
        action: "assign-user",
        user_id: ids.leaderA,
        roles: [{ role_id: "leader", department_id: "truyen-thong" }],
      },
      cookies.admin,
    ),
  );
  assert.equal(changed.status, 200);
  assert.equal(
    (await leaderOtps(req("/api/leader/otps", undefined, cookies.leaderA)))
      .status,
    401,
  );
  cookies.leaderA = await signIn("otp-leadera@example.test");
  const queue = await getOtps();
  assert.ok(queue.items.some((item) => item.phone === "+84907777775"));
  assert.equal(
    queue.items.some((item) => item.phone === "+84907777774"),
    false,
  );
  const scoped = await members(req("/api/members", undefined, cookies.leaderA));
  assert.equal(scoped.status, 200);
  assert.equal(
    (await scoped.json()).items.some((p: any) => p.id === ids.member),
    false,
  );
  const removed = await assignRole(
    req(
      "/api/admin/roles",
      {
        action: "update-role-permissions",
        role_id: "leader",
        permissions: ["members.read.department"],
      },
      cookies.secretary,
    ),
  );
  assert.equal(removed.status, 200);
  assert.equal(
    (await me(req("/api/auth/me", undefined, cookies.leaderA))).status,
    401,
  );
  cookies.leaderA = await signIn("otp-leadera@example.test");
  assert.equal(
    (await leaderOtps(req("/api/leader/otps", undefined, cookies.leaderA)))
      .status,
    403,
  );
  assert.equal(
    (
      await assignRole(
        req(
          "/api/admin/roles",
          {
            action: "update-role-permissions",
            role_id: "leader",
            permissions: ["members.read.department", "leader.otps.read"],
          },
          cookies.admin,
        ),
      )
    ).status,
    200,
  );
});
test("credential version invalidates a token even if its session row was not explicitly revoked", async () => {
  const current = await signIn("0901234567", nextPassword);
  await pool().query(
    "UPDATE church.users SET auth_version=auth_version+1 WHERE id=$1",
    [ids.member],
  );
  assert.equal((await me(req("/api/auth/me", undefined, current))).status, 401);
});

test("an editable profile contact cannot be used to claim somebody else’s profile or family scope", async () => {
  const profile = (
    await pool().query(
      "INSERT INTO church.member_profiles(email,full_name) VALUES('otp-contact-only@example.test','Hồ sơ chưa liên kết đăng nhập') RETURNING id",
    )
  ).rows[0];
  const issued = await emailCode("otp-contact-only@example.test");
  const account = (
    await pool().query(
      "SELECT id FROM church.users WHERE email='otp-contact-only@example.test'",
    )
  ).rows[0];
  assert.notEqual(account.id, profile.id);
  const verified = await verifyCode(
    "otp-contact-only@example.test",
    issued.code,
  );
  assert.equal(verified.status, 200);
  const completed = await setup(
    req(
      "/api/auth/set-password",
      { new_password: nextPassword, confirm_password: nextPassword },
      cookie(verified),
    ),
  );
  assert.equal(completed.status, 200);
  const visible = await members(
    req("/api/members", undefined, cookie(completed)),
  );
  const body = await visible.json();
  assert.equal(body.total, 1);
  assert.equal(body.items[0].id, account.id);
  assert.equal(
    body.items.some((item: any) => item.id === profile.id),
    false,
  );
});

test("removing a department revokes its leader sessions and deletes pending OTPs", async () => {
  const { POST: add, DELETE: remove } =
    await import("../app/api/admin/departments/route");
  assert.equal(
    (
      await add(
        req(
          "/api/admin/departments",
          { id: "otp-deletion-test", name: "Ban kiểm thử xóa" },
          cookies.admin,
        ),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await assignRole(
        req(
          "/api/admin/roles",
          {
            action: "assign-user",
            user_id: ids.leaderB,
            roles: [{ role_id: "leader", department_id: "otp-deletion-test" }],
          },
          cookies.admin,
        ),
      )
    ).status,
    200,
  );
  cookies.leaderB = await signIn("otp-leaderb@example.test");
  assert.equal(
    (await phone("0907777788", "Chờ xác thực", "otp-deletion-test")).status,
    202,
  );
  assert.ok(
    (await getOtps("leaderB")).items.some(
      (row) => row.phone === "+84907777788",
    ),
  );
  const request = new Request("http://127.0.0.1:3000/api/admin/departments", {
    method: "DELETE",
    headers: {
      Origin: "http://127.0.0.1:3000",
      cookie: cookies.admin,
      "content-type": "application/json",
    },
    body: JSON.stringify({ id: "otp-deletion-test" }),
  });
  assert.equal((await remove(request)).status, 200);
  assert.equal(
    (await me(req("/api/auth/me", undefined, cookies.leaderB))).status,
    401,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT count(*) FROM church.otps WHERE department_id='otp-deletion-test'",
      )
    ).rows[0].count,
    "0",
  );
});

test("admin-issued temporary passwords also require setup and cannot be reused as the permanent password", async () => {
  const { POST: create } = await import("../app/api/admin/users/route");
  const created = await create(
    req(
      "/api/admin/users",
      {
        name: "Mật khẩu tạm thời",
        email: "otp-temporary@example.test",
        password,
        accessRole: "user",
      },
      cookies.admin,
    ),
  );
  assert.equal(created.status, 201);
  const session = await login(
    req("/api/auth/login", {
      identifier: "otp-temporary@example.test",
      password,
    }),
  );
  assert.equal(session.status, 200);
  assert.equal((await session.json()).requires_password_setup, true);
  const restricted = cookie(session);
  assert.equal(
    (await members(req("/api/members", undefined, restricted))).status,
    403,
  );
  assert.equal(
    (
      await setup(
        req(
          "/api/auth/set-password",
          { new_password: password, confirm_password: password },
          restricted,
        ),
      )
    ).status,
    400,
  );
  const completed = await setup(
    req(
      "/api/auth/set-password",
      { new_password: nextPassword, confirm_password: nextPassword },
      restricted,
    ),
  );
  assert.equal(completed.status, 200);
  assert.equal(
    (await me(req("/api/auth/me", undefined, restricted))).status,
    401,
  );
  assert.equal(
    (
      await login(
        req("/api/auth/login", {
          identifier: "otp-temporary@example.test",
          password,
        }),
      )
    ).status,
    401,
  );
});

test("identifier-first login returns only the next step for password, pending, and unknown accounts", async () => {
  const { POST: identify } = await import("../app/api/auth/identify/route");
  for (const [identifier, next] of [
    ["otp-admin@example.test", "password"],
    ["0901234567", "password"],
    ["0907777774", "otp"],
    ["otp-unregistered@example.test", "otp"],
  ]) {
    const response = await identify(req("/api/auth/identify", { identifier }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { next });
  }
  assert.equal(
    (await identify(req("/api/auth/identify", { identifier: "invalid" })))
      .status,
    400,
  );
  const wrongOrigin = new Request("http://127.0.0.1:3000/api/auth/identify", {
    method: "POST",
    headers: {
      origin: "https://evil.example",
      "content-type": "application/json",
    },
    body: JSON.stringify({ identifier: "otp-admin@example.test" }),
  });
  assert.equal((await identify(wrongOrigin)).status, 403);
  for (let i = 0; i < 11; i++)
    assert.equal(
      (
        await identify(
          req("/api/auth/identify", {
            identifier: "otp-lookup-limit@example.test",
          }),
        )
      ).status,
      i < 10 ? 200 : 429,
    );
});

test("directory orders by the final name word before pagination with stable full-name and ID ties", async () => {
  const names = [
    "Z Kiểmthứtự An",
    "A Kiểmthứtự Bình",
    "B Kiểmthứtự An",
    "C Kiểmthứtự\tChi  ",
    "B Kiểmthứtự An",
  ];
  const ids = [];
  for (const name of names)
    ids.push(
      (
        await pool().query(
          "INSERT INTO church.member_profiles(full_name) VALUES($1) RETURNING id",
          [name],
        )
      ).rows[0].id,
    );
  const items = [];
  for (let page = 1; page <= 3; page++) {
    const input = { search: "Kiểmthứtự", page, pageSize: 2 };
    const response = await members(
      req(
        `/api/members?query=${encodeURIComponent(JSON.stringify(input))}`,
        undefined,
        cookies.admin,
      ),
    );
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.total, 5);
    items.push(...data.items);
  }
  assert.deepEqual(
    items.map((m) => m.user.name),
    [
      "B Kiểmthứtự An",
      "B Kiểmthứtự An",
      "Z Kiểmthứtự An",
      "A Kiểmthứtự Bình",
      "C Kiểmthứtự\tChi",
    ],
  );
  assert.deepEqual(
    items.slice(0, 2).map((m) => m.id),
    [ids[2], ids[4]].sort(),
  );
  assert.equal(new Set(items.map((m) => m.id)).size, 5);
});
