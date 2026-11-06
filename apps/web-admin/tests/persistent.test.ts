import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "../lib/server/db";
import { hashPassword } from "../lib/server/password";
import { tokenHash } from "../lib/server/session";
import { POST as login } from "../app/api/auth/login/route";
import { POST as refresh } from "../app/api/auth/refresh/route";
import { POST as logout } from "../app/api/auth/logout/route";
import { POST as logoutAll } from "../app/api/auth/logout-all/route";
import { GET as me } from "../app/api/auth/me/route";
import {
  refreshCookieName,
  refreshCookieOptions,
} from "../lib/server/persistent-session";
const id = randomUUID(),
  email = "persistent@example.test",
  password = "Persistent-test-password!";
function req(
  path: string,
  cookie = "",
  token = "",
  data?: unknown,
  csrf = true,
) {
  return new Request("http://127.0.0.1:3000" + path, {
    method: path.endsWith("/me") ? "GET" : "POST",
    headers: {
      Origin: "http://127.0.0.1:3000",
      cookie,
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(csrf ? { "X-Church-CSRF": "1" } : {}),
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
}
async function credentials(response: Response) {
  assert.equal(response.status, 200);
  const body = await response.json();
  const cookie = response.headers
    .getSetCookie()
    .find((v) => v.startsWith(refreshCookieName() + "="))!
    .split(";")[0];
  return {
    body,
    cookie,
    token: body.accessToken as string,
    raw: cookie.split("=")[1],
  };
}
const signIn = async () => {
  await pool().query("DELETE FROM church.login_limits WHERE key_hash=$1", [
    tokenHash(email),
  ]);
  return credentials(
    await login(
      req("/api/auth/login", "", "", { identifier: email, password }),
    ),
  );
};
before(async () => {
  await pool().query(
    "INSERT INTO church.member_profiles(id,email,full_name) VALUES($1,$2,$3)",
    [id, email, "Phiên lâu dài"],
  );
  await pool().query(
    "INSERT INTO church.users(id,email,full_name,password_hash,is_password_set) VALUES($1,$2,$3,$4,true)",
    [id, email, "Phiên lâu dài", await hashPassword(password)],
  );
});
after(() => pool().end());
test("login stores only a refresh digest; access expires in 15 minutes and is not a cookie", async () => {
  const s = await signIn();
  assert.equal(s.body.expiresIn, 900);
  const rows = await pool().query(
    "SELECT * FROM church.refresh_tokens WHERE token_hash=$1",
    [tokenHash(s.raw)],
  );
  assert.equal(rows.rows.length, 1);
  assert.equal(rows.rows[0].expires_at, null);
  assert.notEqual(rows.rows[0].token_hash, s.raw);
  assert.equal((await me(req("/api/auth/me", s.cookie))).status, 401);
  assert.equal((await me(req("/api/auth/me", "", s.token))).status, 200);
  const session = await pool().query(
    "SELECT extract(epoch from expires_at-created_at)::int lifetime FROM church.sessions WHERE token_hash=$1",
    [tokenHash(s.token)],
  );
  assert.ok(session.rows[0].lifetime <= 900);
});
test("refresh rotates tokens, replaces expired access, and supports restarting the browser", async () => {
  const s = await signIn();
  await pool().query(
    "UPDATE church.sessions SET created_at=now()-interval '30 minutes',expires_at=now()-interval '1 minute' WHERE token_hash=$1",
    [tokenHash(s.token)],
  );
  assert.equal((await me(req("/api/auth/me", "", s.token))).status, 401);
  const r = await credentials(
    await refresh(req("/api/auth/refresh", s.cookie)),
  );
  assert.notEqual(r.raw, s.raw);
  assert.notEqual(r.token, s.token);
  assert.equal((await me(req("/api/auth/me", "", r.token))).status, 200);
  assert.equal(
    (
      await pool().query(
        "SELECT revoked FROM church.refresh_tokens WHERE token_hash=$1",
        [tokenHash(s.raw)],
      )
    ).rows[0].revoked,
    true,
  );
});
test("refresh replay commits all-device revocation, kills access immediately, and records a member alert", async () => {
  const a = await signIn(),
    b = await signIn();
  const r = await credentials(
    await refresh(req("/api/auth/refresh", a.cookie)),
  );
  const replay = await refresh(req("/api/auth/refresh", a.cookie));
  assert.equal(replay.status, 401);
  assert.equal((await replay.json()).code, "REFRESH_REPLAY");
  assert.equal((await me(req("/api/auth/me", "", b.token))).status, 401);
  assert.equal((await me(req("/api/auth/me", "", r.token))).status, 401);
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.refresh_tokens WHERE user_id=$1 AND NOT revoked",
        [id],
      )
    ).rows[0].n,
    0,
  );
  const next = await signIn();
  assert.equal(next.body.user.securityAlert, true);
});
test("database refresh revocation and deletion invalidate access without waiting 15 minutes", async () => {
  for (const mode of ["revoked", "deleted"]) {
    const s = await signIn();
    await pool().query(
      mode === "revoked"
        ? "UPDATE church.refresh_tokens SET revoked=true WHERE token_hash=$1"
        : "DELETE FROM church.refresh_tokens WHERE token_hash=$1",
      [tokenHash(s.raw)],
    );
    assert.equal((await me(req("/api/auth/me", "", s.token))).status, 401);
    const response = await refresh(req("/api/auth/refresh", s.cookie));
    assert.equal(response.status, 401);
    assert.match(response.headers.get("set-cookie")!, /Max-Age=0/);
  }
});
test("logout revokes this device; all-device logout revokes every device", async () => {
  const a = await signIn(),
    b = await signIn();
  assert.equal((await logout(req("/api/auth/logout", a.cookie))).status, 200);
  assert.equal((await me(req("/api/auth/me", "", a.token))).status, 401);
  assert.equal((await me(req("/api/auth/me", "", b.token))).status, 200);
  assert.equal(
    (await logoutAll(req("/api/auth/logout-all", b.cookie))).status,
    200,
  );
  assert.equal((await me(req("/api/auth/me", "", b.token))).status, 401);
});
test("refresh and logout reject cross-origin and missing CSRF headers without revoking valid credentials", async () => {
  const s = await signIn();
  for (const handler of [refresh, logout, logoutAll]) {
    assert.equal(
      (await handler(req("/api/auth/refresh", s.cookie, "", undefined, false)))
        .status,
      403,
    );
    const foreign = req("/api/auth/refresh", s.cookie);
    foreign.headers.set("Origin", "https://attacker.test");
    assert.equal((await handler(foreign)).status, 403);
  }
  assert.equal((await me(req("/api/auth/me", "", s.token))).status, 200);
});
test("security changes propagate through existing session-revocation paths", async () => {
  const s = await signIn();
  await pool().query(
    "UPDATE church.sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
    [id],
  );
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.refresh_tokens WHERE user_id=$1 AND NOT revoked",
        [id],
      )
    ).rows[0].n,
    0,
  );
  assert.equal((await refresh(req("/api/auth/refresh", s.cookie))).status, 401);
});
test("production refresh cookies are host-only, Secure, HttpOnly and SameSite Strict", () => {
  const previous = process.env.NODE_ENV;
  try {
    Reflect.set(process.env, "NODE_ENV", "production");
    assert.equal(refreshCookieName(), "__Host-church-refresh");
    const options = refreshCookieOptions();
    assert.equal(options.secure, true);
    assert.equal(options.httpOnly, true);
    assert.equal(options.sameSite, "strict");
    assert.equal(options.path, "/");
    assert.equal("domain" in options, false);
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", previous);
  }
});

test("password setup refreshes retain their original absolute expiry and never become indefinite", async () => {
  const setupId = randomUUID(),
    setupEmail = "persistent-setup@example.test";
  await pool().query(
    "INSERT INTO church.member_profiles(id,email,full_name) VALUES($1,$2,$3)",
    [setupId, setupEmail, "Thiết lập mật khẩu"],
  );
  await pool().query(
    "INSERT INTO church.users(id,email,full_name,password_hash,is_password_set,must_reset_password,temporary_password_expires_at) VALUES($1,$2,$3,$4,false,true,now()+interval '24 hours')",
    [setupId, setupEmail, "Thiết lập mật khẩu", await hashPassword(password)],
  );
  const s = await credentials(
    await login(
      req("/api/auth/login", "", "", { identifier: setupEmail, password }),
    ),
  );
  assert.equal(s.body.requires_password_setup, true);
  const before = (
    await pool().query(
      "SELECT expires_at FROM church.refresh_tokens WHERE token_hash=$1",
      [tokenHash(s.raw)],
    )
  ).rows[0];
  assert.ok(before.expires_at);
  const rotated = await credentials(
    await refresh(req("/api/auth/refresh", s.cookie)),
  );
  const after = (
    await pool().query(
      "SELECT expires_at FROM church.refresh_tokens WHERE token_hash=$1",
      [tokenHash(rotated.raw)],
    )
  ).rows[0];
  assert.equal(after.expires_at.getTime(), before.expires_at.getTime());
  await pool().query(
    "UPDATE church.refresh_tokens SET expires_at=now()-interval '1 minute' WHERE token_hash=$1",
    [tokenHash(rotated.raw)],
  );
  assert.equal(
    (await refresh(req("/api/auth/refresh", rotated.cookie))).status,
    401,
  );
});

test("two requests presenting the same refresh token trigger replay handling rather than issue parallel descendants", async () => {
  const s = await signIn();
  const results = await Promise.all([
    refresh(req("/api/auth/refresh", s.cookie)),
    refresh(req("/api/auth/refresh", s.cookie)),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 401]);
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.refresh_tokens WHERE user_id=$1 AND NOT revoked",
        [id],
      )
    ).rows[0].n,
    0,
  );
});

test("deleting an access-session record also prevents the persistent cookie from renewing it", async () => {
  const s = await signIn();
  await pool().query("DELETE FROM church.sessions WHERE token_hash=$1", [
    tokenHash(s.token),
  ]);
  assert.equal((await me(req("/api/auth/me", "", s.token))).status, 401);
  assert.equal((await refresh(req("/api/auth/refresh", s.cookie))).status, 401);
});
