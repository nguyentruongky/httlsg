import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
async function main() {
  const credentials = await readFile(".local-data/local-auth.txt", "utf8");
  const email = /^Email: (.+)$/m.exec(credentials)?.[1],
    password = /^Password: (.+)$/m.exec(credentials)?.[1];
  assert.ok(email && password);
  const base = "http://127.0.0.1:3000";
  // Pages render public shells; sensitive content is loaded only after bearer authentication.
  assert.equal((await fetch(base + "/api/auth/me")).status, 401);
  const identified = await fetch(base + "/api/auth/identify", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: email }),
  });
  assert.equal(identified.status, 200);
  assert.deepEqual(await identified.json(), { next: "password" });
  const login = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 200);
  let cookie = login.headers
    .getSetCookie()
    .find((v) => v.startsWith("church-refresh="))!
    .split(";")[0];
  let accessToken = (await login.json()).accessToken;
  const rotated = await fetch(base + "/api/auth/refresh", {
    method: "POST",
    headers: { cookie, Origin: base, "X-Church-CSRF": "1" },
  });
  assert.equal(rotated.status, 200);
  accessToken = (await rotated.json()).accessToken;
  cookie = rotated.headers
    .getSetCookie()
    .find((v) => v.startsWith("church-refresh="))!
    .split(";")[0];
  try {
    const me = await fetch(base + "/api/auth/me", {
      headers: { Authorization: "Bearer " + accessToken },
    });
    assert.equal(me.status, 200);
    const actor = await me.json();
    assert.equal(actor.user.role, "admin");
    assert.equal(JSON.stringify(actor).includes("password_hash"), false);
    for (const path of [
      "/client",
      "/dashboard",
      "/dashboard/members",
      "/dashboard/settings",
      "/dashboard/otps",
    ])
      assert.equal(
        (
          await fetch(base + path, {
            headers: { Authorization: "Bearer " + accessToken },
            redirect: "manual",
          })
        ).status,
        200,
      );
    for (const suffix of [
      "?page=1&q=&status=all&type=all",
      "?status=pending&type=PHONE_LEADER",
      "?type=EMAIL",
    ]) {
      const response = await fetch(base + "/api/admin/otps" + suffix, {
        headers: { Authorization: "Bearer " + accessToken },
      });
      assert.equal(response.status, 200, "Live Admin OTP endpoint must load");
      const data = await response.json();
      assert.ok(Array.isArray(data.items));
      assert.equal(typeof data.total, "number");
    }
    const members = await fetch(base + "/api/members", {
      headers: { Authorization: "Bearer " + accessToken },
    });
    assert.equal(members.status, 200);
    const data = await members.json();
    assert.ok(data.total > 0);
    assert.equal(data.items.length, 12);
    const workspace = await fetch(base + "/api/admin/workspace", {
      headers: { Authorization: "Bearer " + accessToken },
    });
    assert.equal(workspace.status, 200);
    assert.ok((await workspace.json()).members.length > 0);
    console.log(
      "Live HTTP smoke passed: bearer-only API protection, login, rotation, session, client/dashboard routes, paginated directory, admin workspace, and the live Admin OTP screen/API.",
    );
  } finally {
    const logout = await fetch(base + "/api/auth/logout", {
      method: "POST",
      headers: { cookie, Origin: base, "X-Church-CSRF": "1" },
    });
    assert.equal(logout.status, 200);
  }
}
void main().catch(() => {
  console.error(
    "Live HTTP smoke failed. No credentials or response bodies were printed.",
  );
  process.exitCode = 1;
});
