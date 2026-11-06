import { accessCredential } from "./session-test-utils";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import { pool, transaction } from "../lib/server/db";
import { hashPassword } from "../lib/server/password";
import { actorById, createSession, cookieName } from "../lib/server/session";
import { POST as identify } from "../app/api/auth/identify/route";
import { POST as login } from "../app/api/auth/login/route";
import { POST as verify } from "../app/api/auth/verify-otp/route";
import { POST as emailOtp } from "../app/api/auth/request-email-otp/route";
import { GET as adminOtps } from "../app/api/admin/otps/route";
import { GET as profile } from "../app/api/members/me/route";
const password = "Identity-test-password!",
  victimPassword = "Different-victim-password!";
let hash: string, adminCookie: string;
async function person(
  email: string,
  phone: string | null,
  name: string,
  account = false,
  role = "user",
) {
  const id = randomUUID();
  await pool().query(
    "INSERT INTO church.member_profiles(id,email,phone,full_name,role_id) VALUES($1,$2,$3,$4,$5)",
    [id, email, phone, name, role],
  );
  if (account)
    await pool().query(
      "INSERT INTO church.users(id,email,full_name,role_id,password_hash,is_password_set) VALUES($1,$2,$3,$4,$5,true)",
      [id, email, name, role, hash],
    );
  return id;
}
function req(path: string, data?: unknown, cookie = "") {
  return new Request("http://127.0.0.1:3000" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      Origin: "http://127.0.0.1:3000",
      cookie,
      Authorization: "Bearer " + cookie.slice(cookie.indexOf("=") + 1),
      "X-Church-CSRF": "1",
      ...(data === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}
async function code(identifier: string) {
  const response = await adminOtps(
    req(
      `/api/admin/otps?q=${encodeURIComponent(identifier)}`,
      undefined,
      adminCookie,
    ),
  );
  assert.equal(response.status, 200);
  const rows = await response.clone().json();
  return rows.items.find(
    (item: any) => item.email === identifier || item.phone === identifier,
  );
}
before(async () => {
  hash = await hashPassword(password);
  const id = await person(
    "identity-admin@example.test",
    null,
    "Admin định danh",
    true,
    "admin",
  );
  adminCookie = await transaction(
    async (db) =>
      `${cookieName()}=${await createSession(db, (await actorById(db, id))!)}`,
  );
});
after(async () => {
  await pool().end();
});
test("email and profile-only phone authenticate the same account and preserve its details", async () => {
  const email = "identity-person@example.test",
    phone = "+84904455001";
  const id = await person(email, "090 445 5001", "Tên chính xác", true);
  const before = (
    await pool().query("SELECT count(*)::int n FROM church.member_profiles")
  ).rows[0].n;
  const emailNext = await identify(
    req("/api/auth/identify", { identifier: email }),
  );
  assert.deepEqual(await emailNext.clone().json(), { next: "password" });
  const signed = await login(
    req("/api/auth/login", { identifier: email, password }),
  );
  assert.equal(signed.status, 200);
  assert.equal((await signed.clone().json()).user.id, id);
  const next = await identify(
    req("/api/auth/identify", { identifier: "0904455001" }),
  );
  assert.equal(next.status, 200);
  assert.equal((await next.clone().json()).next, "otp");
  const otp = await code(phone);
  assert.equal(otp.user_id, id);
  assert.match(otp.otp_code, /^[0-9]{6}$/);
  const verified = await verify(
    req("/api/auth/verify-otp", { identifier: phone, otp_code: otp.otp_code }),
  );
  assert.equal(verified.status, 200);
  const body = await verified.clone().json();
  assert.equal(body.user.id, id);
  assert.equal(body.user.phone, phone);
  assert.equal(body.requires_password_setup, false);
  const cookie = "access=" + body.accessToken;
  const detail = await profile(req("/api/members/me", undefined, cookie));
  const member = await detail.clone().json();
  assert.equal(member.id, id);
  assert.equal(member.user.name, "Tên chính xác");
  assert.equal(member.phone, "090 445 5001");
  assert.equal(
    (await pool().query("SELECT count(*)::int n FROM church.member_profiles"))
      .rows[0].n,
    before,
  );
  assert.equal(
    (
      await pool().query("SELECT password_hash FROM church.users WHERE id=$1", [
        id,
      ])
    ).rows[0].password_hash,
    hash,
  );
});
test("an email available only on the linked profile uses the existing password and account ID", async () => {
  const original = "identity-primary@example.test",
    alias = "identity-profile-alias@example.test";
  const id = await person(original, null, "Hồ sơ email chính", true);
  await pool().query("UPDATE church.member_profiles SET email=$2 WHERE id=$1", [
    id,
    alias,
  ]);
  assert.equal(
    (
      await (
        await identify(req("/api/auth/identify", { identifier: alias }))
      ).json()
    ).next,
    "password",
  );
  const signed = await login(
    req("/api/auth/login", { identifier: alias, password }),
  );
  assert.equal(signed.status, 200);
  assert.equal((await signed.clone().json()).user.id, id);
  const canonical = await login(
    req("/api/auth/login", { identifier: original, password }),
  );
  assert.equal(canonical.status, 200);
  assert.equal((await canonical.clone().json()).user.id, id);
});
test("a known profile without credentials is claimed through Admin OTP using its original ID and name", async () => {
  const email = "identity-profile-only@example.test",
    id = await person(email, "0904455002", "Thông tin có sẵn");
  const response = await identify(
    req("/api/auth/identify", { identifier: "0904455002" }),
  );
  assert.equal(response.status, 200);
  assert.match((await response.clone().json()).message, /Admin/);
  const otp = await code("+84904455002");
  assert.equal(otp.user_id, id);
  const verified = await verify(
    req("/api/auth/verify-otp", {
      identifier: "0904455002",
      otp_code: otp.otp_code,
    }),
  );
  assert.equal(verified.status, 200);
  const body = await verified.clone().json();
  assert.equal(body.user.id, id);
  assert.equal(body.user.name, "Thông tin có sẵn");
  assert.equal(body.requires_password_setup, true);
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.member_profiles WHERE email=$1",
        [email],
      )
    ).rows[0].n,
    1,
  );
});
test("shared profile-only contacts never select an arbitrary account or create duplicates", async () => {
  const email = "identity-shared@example.test";
  await person(email, null, "Hồ sơ trùng một");
  await person(email, null, "Hồ sơ trùng hai");
  assert.equal(
    (await identify(req("/api/auth/identify", { identifier: email }))).status,
    409,
  );
  assert.equal(
    (await emailOtp(req("/api/auth/request-email-otp", { email }))).status,
    409,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.users WHERE email=$1",
        [email],
      )
    ).rows[0].n,
    0,
  );
});
test("editable contacts cannot bypass another account's password or receive a mailed takeover code", async () => {
  const alias = "identity-edited-contact@example.test",
    id = await person(
      "identity-victim@example.test",
      null,
      "Chủ hồ sơ",
      true,
      "admin",
    );
  await pool().query("UPDATE church.users SET password_hash=$2 WHERE id=$1", [
    id,
    await hashPassword(victimPassword),
  ]);
  await pool().query("UPDATE church.member_profiles SET email=$2 WHERE id=$1", [
    id,
    alias,
  ]);
  assert.equal(
    (await login(req("/api/auth/login", { identifier: alias, password })))
      .status,
    401,
  );
  const before = new Set(
    await readdir(process.env.OTP_OUTBOX_DIR!).catch(() => []),
  );
  const requested = await emailOtp(
    req("/api/auth/request-email-otp", { email: alias }),
  );
  assert.equal(requested.status, 202);
  const body = await requested.clone().json();
  assert.equal(body.delivery, "ADMIN");
  assert.equal("otp_code" in body, false);
  assert.equal(
    (await readdir(process.env.OTP_OUTBOX_DIR!).catch(() => [])).filter(
      (file) => !before.has(file),
    ).length,
    0,
  );
  const otp = await code(alias);
  assert.equal(otp.user_id, id);
  assert.equal(otp.delivery, "ADMIN");
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.member_profiles WHERE email=$1",
        [alias],
      )
    ).rows[0].n,
    1,
  );
});

test("credential ownership takes precedence and conflicting profile links require Admin merging", async () => {
  const email = "identity-owned@example.test",
    owner = await person(email, null, "Tài khoản đã xác thực", true);
  const duplicate = await person(email, "0904455009", "Hồ sơ cần hợp nhất");
  const signed = await login(
    req("/api/auth/login", { identifier: email, password }),
  );
  assert.equal(signed.status, 200);
  assert.equal((await signed.clone().json()).user.id, owner);
  assert.equal(
    (await identify(req("/api/auth/identify", { identifier: "0904455009" })))
      .status,
    409,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.users WHERE id=$1",
        [duplicate],
      )
    ).rows[0].n,
    0,
  );
});
