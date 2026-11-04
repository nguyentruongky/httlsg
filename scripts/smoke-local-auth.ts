import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
async function main() {
  const credentials = await readFile(".local-data/local-auth.txt", "utf8");
  const email = /^Email: (.+)$/m.exec(credentials)?.[1],
    password = /^Password: (.+)$/m.exec(credentials)?.[1];
  assert.ok(email && password);
  const base = "http://127.0.0.1:3000";
  for (const path of ["/client", "/dashboard"]) {
    const response = await fetch(base + path, { redirect: "manual" });
    assert.equal(response.status, 307);
    assert.equal(
      new URL(response.headers.get("location")!, base).pathname,
      "/login",
    );
  }
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
  const cookie = login.headers.get("set-cookie")!.split(";")[0];
  try {
    const me = await fetch(base + "/api/auth/me", { headers: { cookie } });
    assert.equal(me.status, 200);
    const actor = await me.json();
    assert.equal(actor.user.role, "admin");
    assert.equal(JSON.stringify(actor).includes("password_hash"), false);
    for (const path of [
      "/client",
      "/dashboard",
      "/dashboard/members",
      "/dashboard/settings",
    ])
      assert.equal(
        (await fetch(base + path, { headers: { cookie }, redirect: "manual" }))
          .status,
        200,
      );
    const members = await fetch(base + "/api/members", { headers: { cookie } });
    assert.equal(members.status, 200);
    const data = await members.json();
    assert.ok(data.total >= 2283);
    assert.equal(data.items.length, 12);
    const workspace = await fetch(base + "/api/admin/workspace", {
      headers: { cookie },
    });
    assert.equal(workspace.status, 200);
    assert.ok((await workspace.json()).members.length >= 2283);
    console.log(
      "Live HTTP smoke passed: protected redirects, login, session, client/dashboard routes, paginated directory, and admin workspace.",
    );
  } finally {
    const logout = await fetch(base + "/api/auth/logout", {
      method: "POST",
      headers: { cookie, Origin: base },
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
