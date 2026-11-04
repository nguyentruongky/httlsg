import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../lib/server/db";
import { hashPassword } from "../lib/server/password";
import { POST as login } from "../app/api/auth/login/route";
import { GET as me } from "../app/api/auth/me/route";
import { POST as logout } from "../app/api/auth/logout/route";
import { GET as list } from "../app/api/members/route";
import {
  GET as detail,
  PATCH as patch,
  DELETE as remove,
} from "../app/api/members/[id]/route";
import { POST as addHistory } from "../app/api/members/[id]/[kind]/route";
import { POST as access } from "../app/api/admin/users/access/route";
import { GET as workspace } from "../app/api/admin/workspace/route";
import {
  AccessRoleSchema,
  type AccessRole,
  type DirectoryMember,
  type MemberDetailInput,
} from "@org/core";
const ids = Object.fromEntries(
  [
    "admin",
    "secretary",
    "deacon",
    "board",
    "user",
    "family",
    "outside",
    "leader",
  ].map((r, i) => [
    r,
    `30000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  ]),
);
const password = "Test-only-password-29!";
const cookies: Partial<Record<AccessRole, string>> = {};
function request(
  path: string,
  method = "GET",
  cookie = "",
  data?: unknown,
  origin = true,
) {
  return new Request(`http://127.0.0.1:3000${path}`, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(origin ? { Origin: "http://127.0.0.1:3000" } : {}),
      ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
}
const context = (id: string) => ({ params: Promise.resolve({ id }) });
async function get(role: AccessRole, id: string) {
  const response = await detail(
    request(`/api/members/${id}`, "GET", cookies[role]),
    context(id),
  );
  assert.equal(response.status, 200);
  return response.json() as Promise<DirectoryMember>;
}
function fields(m: DirectoryMember): MemberDetailInput {
  return {
    name: m.user.name,
    email: m.user.email ?? "",
    phone: m.phone ?? "",
    dateOfBirth: m.dateOfBirth ?? "",
    address: m.address ?? "",
    occupation: m.occupation ?? "",
    bio: m.bio,
    departmentIds: m.departments.map((d) => d.id),
    departmentRoles: Object.fromEntries(
      m.departments.map((d) => [d.id, d.position]),
    ),
    area: m.area ?? "",
    location: m.location ?? "",
    position: m.position,
    familyName: m.family?.name ?? "",
    familyMembers:
      m.family?.members.map(({ id, relationship }) => ({ id, relationship })) ??
      [],
    faithDate: m.faithDate ?? "",
    baptismDate: m.baptismDate ?? "",
    churchStatus: m.churchStatus ?? "",
    preferredName: m.preferredName,
    gender: m.gender,
    householdRole: m.householdRole,
  };
}
async function change(
  role: AccessRole,
  id: string,
  change: Partial<MemberDetailInput> = {},
  version?: number,
) {
  const m = await get(role, id);
  return patch(
    request(`/api/members/${id}`, "PATCH", cookies[role], {
      values: { ...fields(m), ...change },
      version: version ?? m.version,
    }),
    context(id),
  );
}
before(async () => {
  const encoded = await hashPassword(password);
  for (const [role, id] of Object.entries(ids)) {
    const actualRole = AccessRoleSchema.options.includes(role as AccessRole)
      ? role
      : "user";
    await pool().query(
      "INSERT INTO church.member_profiles(id,email,full_name,role_id) VALUES($1,$2,$3,$4)",
      [id, `${role}@example.test`, `Kiểm thử ${role}`, actualRole],
    );
    await pool().query(
      "INSERT INTO church.users(id,email,password_hash,full_name,role_id,is_password_set) VALUES($1,$2,$3,$4,$5,true)",
      [id, `${role}@example.test`, encoded, `Kiểm thử ${role}`, actualRole],
    );
  }
  await pool().query(
    "UPDATE church.users SET department_id='thanh-nien' WHERE id=$1",
    [ids.leader],
  );
  await pool().query(
    "INSERT INTO church.department_leaders(user_id,department_id) VALUES($1,'thanh-nien')",
    [ids.leader],
  );
  const household = (
    await pool().query(
      "INSERT INTO church.households DEFAULT VALUES RETURNING id",
    )
  ).rows[0].id;
  await pool().query(
    "INSERT INTO church.household_members(user_id,household_id,relationship) VALUES($1,$3,'Chủ hộ'),($2,$3,'Con')",
    [ids.user, ids.family, household],
  );
  await pool().query(
    "INSERT INTO church.department_managers VALUES($1,'thanh-nien')",
    [ids.board],
  );
  await pool().query(
    "INSERT INTO church.department_members VALUES('thanh-nien',$1,'Ban viên')",
    [ids.family],
  );
  for (const role of AccessRoleSchema.options) {
    const response = await login(
      request("/api/auth/login", "POST", "", {
        email: `${role}@example.test`,
        password,
      }),
    );
    assert.equal(response.status, 200);
    cookies[role] = response.headers.get("set-cookie")!.split(";")[0];
  }
});
after(async () => {
  await pool().end();
});
test("database seeds exactly five roles and identical Admin/Thư ký permissions", async () => {
  assert.equal(
    (await pool().query("SELECT count(*) FROM church.roles")).rows[0].count,
    "6",
  );
  const roles = await pool().query(
    "SELECT role_id,array_agg(permission_id ORDER BY permission_id) permissions FROM church.role_permissions WHERE role_id IN ('admin','secretary') GROUP BY role_id ORDER BY role_id",
  );
  assert.deepEqual(roles.rows[0].permissions, roles.rows[1].permissions);
  await assert.rejects(
    pool().query(
      "INSERT INTO church.users(id,email,full_name) VALUES(gen_random_uuid(),'admin@example.test','Duplicate')",
    ),
    { code: "23505" },
  );
});
test("unified login uses HttpOnly cookies and me returns current roles without hashes", async () => {
  for (const role of AccessRoleSchema.options) {
    const response = await me(request("/api/auth/me", "GET", cookies[role]));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.user.role, role);
    assert.equal(JSON.stringify(body).includes("password_hash"), false);
    if (role === "board")
      assert.deepEqual(body.user.departmentIds, ["thanh-nien"]);
  }
  const response = await login(
    request("/api/auth/login", "POST", "", {
      email: "admin@example.test",
      password,
    }),
  );
  assert.match(response.headers.get("set-cookie")!, /HttpOnly/);
  assert.match(response.headers.get("set-cookie")!, /SameSite=lax/i);
  assert.equal((await response.json()).redirectTo, "/client");
});
test("missing, forged and revoked sessions fail closed", async () => {
  assert.equal((await me(request("/api/auth/me"))).status, 401);
  assert.equal(
    (await me(request("/api/auth/me", "GET", "church-session=forged"))).status,
    401,
  );
  const response = await login(
    request("/api/auth/login", "POST", "", {
      email: "user@example.test",
      password,
    }),
  );
  const cookie = response.headers.get("set-cookie")!.split(";")[0];
  assert.equal(
    (await logout(request("/api/auth/logout", "POST", cookie))).status,
    200,
  );
  assert.equal((await me(request("/api/auth/me", "GET", cookie))).status, 401);
});
test("wrong credentials are generic and login rejects cross-origin and missing-origin writes", async () => {
  for (const email of ["outside@example.test", "missing@example.test"]) {
    const response = await login(
      request("/api/auth/login", "POST", "", { email, password: "wrong" }),
    );
    assert.equal(response.status, 401);
    assert.equal(
      (await response.json()).message,
      "Số điện thoại, email hoặc mật khẩu không đúng.",
    );
  }
  assert.equal(
    (
      await login(
        request(
          "/api/auth/login",
          "POST",
          "",
          { email: "user@example.test", password },
          false,
        ),
      )
    ).status,
    403,
  );
  const req = new Request("http://127.0.0.1:3000/api/auth/login", {
    method: "POST",
    headers: {
      origin: "https://evil.example",
      "content-type": "application/json",
    },
    body: JSON.stringify({ email: "user@example.test", password }),
  });
  assert.equal((await login(req)).status, 403);
});
test("User directory is limited to self and existing family while other roles can read all", async () => {
  for (const role of AccessRoleSchema.options) {
    const response = await list(request("/api/members", "GET", cookies[role]));
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.total, role === "user" || role === "leader" ? 2 : 8);
  }
  assert.equal(
    (
      await detail(
        request(`/api/members/${ids.outside}`, "GET", cookies.user),
        context(ids.outside),
      )
    ).status,
    404,
  );
});
test("deacons cannot mutate even their own profile; boards edit only assigned departments", async () => {
  assert.equal(
    (await change("deacon", ids.deacon, { occupation: "Blocked" })).status,
    403,
  );
  assert.equal(
    (await change("board", ids.family, { occupation: "Board edit" })).status,
    200,
  );
  assert.equal(
    (await change("board", ids.outside, { occupation: "Blocked" })).status,
    403,
  );
  assert.equal(
    (
      await addHistory(
        request(`/api/members/${ids.family}/visits`, "POST", cookies.deacon, {
          visitedOn: "2025-01-01",
        }),
        { params: Promise.resolve({ id: ids.family, kind: "visits" }) },
      )
    ).status,
    403,
  );
});
test("User can edit own/family profiles but cannot forge household or department grants", async () => {
  assert.equal(
    (await change("user", ids.user, { occupation: "Self edit" })).status,
    200,
  );
  assert.equal(
    (await change("user", ids.family, { occupation: "Family edit" })).status,
    200,
  );
  assert.equal(
    (await change("user", ids.user, { departmentIds: ["thanh-nien"] })).status,
    403,
  );
  assert.equal(
    (
      await change("user", ids.user, {
        familyMembers: [{ id: ids.outside, relationship: "Con" }],
      })
    ).status,
    403,
  );
  const target = await get("user", ids.user);
  assert.equal(
    (
      await patch(
        request(`/api/members/${ids.user}`, "PATCH", cookies.user, {
          values: { ...fields(target), role: "admin" },
          version: target.version,
        }),
        context(ids.user),
      )
    ).status,
    400,
  );
});
test("both full-access roles edit all profiles; stale versions fail and do not overwrite data", async () => {
  for (const role of ["admin", "secretary"] as const) {
    assert.equal(
      (await change(role, ids.outside, { churchStatus: "Chuyển hội" })).status,
      200,
    );
  }
  const before = await get("admin", ids.outside);
  assert.equal(
    (await change("admin", ids.outside, { occupation: "New value" })).status,
    200,
  );
  assert.equal(
    (
      await change(
        "admin",
        ids.outside,
        { occupation: "Stale value" },
        before.version,
      )
    ).status,
    409,
  );
  assert.equal((await get("admin", ids.outside)).occupation, "New value");
});
test("dashboard API and role assignment reject non-admin roles", async () => {
  for (const role of AccessRoleSchema.options) {
    const allowed = role === "admin" || role === "secretary";
    assert.equal(
      (await workspace(request("/api/admin/workspace", "GET", cookies[role])))
        .status,
      allowed ? 200 : 403,
    );
    if (!allowed)
      assert.equal(
        (
          await access(
            request("/api/admin/users/access", "POST", cookies[role], {
              ids: [ids.outside],
              accessRole: "admin",
            }),
          )
        ).status,
        403,
      );
  }
});
test("visit creation accepts only date, attributes the session actor, and displays null-author imports", async () => {
  const response = await addHistory(
    request(`/api/members/${ids.family}/visits`, "POST", cookies.user, {
      visitedOn: "2025-02-03",
    }),
    { params: Promise.resolve({ id: ids.family, kind: "visits" }) },
  );
  assert.equal(response.status, 201);
  assert.equal(
    (
      await addHistory(
        request(`/api/members/${ids.family}/visits`, "POST", cookies.user, {
          visitedOn: "2025-02-04",
          authorId: ids.admin,
        }),
        { params: Promise.resolve({ id: ids.family, kind: "visits" }) },
      )
    ).status,
    400,
  );
  await pool().query(
    "INSERT INTO church.visits(member_id,visited_on) VALUES($1,$2)",
    [ids.family, "2025-02-05"],
  );
  const m = await get("user", ids.family);
  assert.equal(m.visitHistory[0].authorName, "");
  assert.equal(m.visitHistory[1].authorId, ids.user);
  assert.equal(m.visitHistory[1].summary, "");
});
test("department reassignment and demotion invalidate existing sessions immediately", async () => {
  const response = await access(
    request("/api/admin/users/access", "POST", cookies.secretary, {
      ids: [ids.board],
      accessRole: "deacon",
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(
    (await me(request("/api/auth/me", "GET", cookies.board))).status,
    401,
  );
  const grants = await pool().query(
    "SELECT * FROM church.department_managers WHERE user_id=$1",
    [ids.board],
  );
  assert.equal(grants.rowCount, 0);
});
test("deleting a member disables login and never permits self-deletion", async () => {
  assert.equal(
    (
      await remove(
        request(`/api/members/${ids.outside}`, "DELETE", cookies.secretary),
        context(ids.outside),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await login(
        request("/api/auth/login", "POST", "", {
          email: "outside@example.test",
          password,
        }),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await remove(
        request(`/api/members/${ids.admin}`, "DELETE", cookies.admin),
        context(ids.admin),
      )
    ).status,
    400,
  );
});

test("Admin and Thư ký can create accounts and manage departments; other roles receive 403", async () => {
  const { POST: create } = await import("../app/api/admin/users/route");
  const {
    POST: add,
    PATCH: rename,
    DELETE: drop,
  } = await import("../app/api/admin/departments/route");
  for (const role of ["admin", "secretary"] as const) {
    const response = await create(
      request("/api/admin/users", "POST", cookies[role], {
        name: "Tài khoản kiểm thử",
        email: `created-${role}@example.test`,
        password,
        accessRole: "user",
      }),
    );
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.accessRole, "user");
    assert.equal(JSON.stringify(body).includes("password_hash"), false);
    assert.equal(
      (
        await add(
          request("/api/admin/departments", "POST", cookies[role], {
            id: `new-${role}`,
            name: `Ban kiểm thử ${role}`,
          }),
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await rename(
          request("/api/admin/departments", "PATCH", cookies[role], {
            id: `new-${role}`,
            name: `Ban đổi tên ${role}`,
          }),
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await drop(
          request("/api/admin/departments", "DELETE", cookies[role], {
            id: `new-${role}`,
          }),
        )
      ).status,
      200,
    );
  }
  for (const role of ["user", "deacon"] as const)
    assert.equal(
      (
        await create(
          request("/api/admin/users", "POST", cookies[role], {
            name: "Blocked",
            email: "blocked@example.test",
            password,
            accessRole: "admin",
          }),
        )
      ).status,
      403,
    );
});
test("credentials can be set for an imported profile without assigning a privileged role", async () => {
  const { POST: credentials } =
    await import("../app/api/admin/users/[id]/credentials/route");
  const row = (
    await pool().query(
      "INSERT INTO church.member_profiles(full_name) VALUES('Hồ sơ chưa đăng nhập') RETURNING id",
    )
  ).rows[0];
  assert.equal(
    (
      await credentials(
        request(
          `/api/admin/users/${row.id}/credentials`,
          "POST",
          cookies.user,
          { email: "imported@example.test", password },
        ),
        context(row.id),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await credentials(
        request(
          `/api/admin/users/${row.id}/credentials`,
          "POST",
          cookies.secretary,
          { email: "imported@example.test", password },
        ),
        context(row.id),
      )
    ).status,
    200,
  );
  const response = await login(
    request("/api/auth/login", "POST", "", {
      email: "imported@example.test",
      password,
    }),
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.role, "user");
});
test("family linking updates all affected versions and removal preserves member profiles", async () => {
  const member = await get("admin", ids.user);
  const relative = await get("admin", ids.family);
  assert.equal(
    (await change("admin", ids.user, { familyMembers: [] })).status,
    200,
  );
  assert.equal((await get("admin", ids.family)).version, relative.version + 1);
  assert.equal(
    (
      await detail(
        request(`/api/members/${ids.family}`, "GET", cookies.user),
        context(ids.family),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await change("admin", ids.user, {
        familyName: "Gia đình",
        familyMembers: [{ id: ids.family, relationship: "Con" }],
      })
    ).status,
    200,
  );
  assert.equal((await get("user", ids.family)).user.name, relative.user.name);
});
test("login attempts are bounded and expired database sessions are rejected", async () => {
  for (let i = 0; i < 9; i++) {
    const response = await login(
      request("/api/auth/login", "POST", "", {
        email: "ratelimit@example.test",
        password: "wrong",
      }),
    );
    assert.equal(response.status, i < 8 ? 401 : 429);
  }
  const response = await login(
    request("/api/auth/login", "POST", "", {
      email: "user@example.test",
      password,
    }),
  );
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie")!.split(";")[0];
  const { tokenHash } = await import("../lib/server/session");
  await pool().query(
    "UPDATE church.sessions SET created_at=now()-interval '10 hours',expires_at=now()-interval '2 hours' WHERE token_hash=$1",
    [tokenHash(cookie.slice(cookie.indexOf("=") + 1))],
  );
  assert.equal((await me(request("/api/auth/me", "GET", cookie))).status, 401);
});
test("production cookies use the host prefix, HTTPS, HttpOnly and SameSite Lax", async () => {
  const { cookieName, cookieOptions } = await import("../lib/server/session");
  const previous = process.env.NODE_ENV;
  try {
    Reflect.set(process.env, "NODE_ENV", "production");
    assert.equal(cookieName(), "__Host-church-session");
    assert.deepEqual(cookieOptions(), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 28800,
    });
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", previous);
  }
});

test("profile contact edits do not change the authenticated login identifier", async () => {
  assert.equal((await change("user", ids.user, { email: "" })).status, 200);
  assert.equal(
    (await (await me(request("/api/auth/me", "GET", cookies.user))).json()).user
      .email,
    "user@example.test",
  );
});
test("the runtime database role cannot rewrite permission definitions", async () => {
  const db = await pool().connect();
  try {
    await db.query("BEGIN");
    await db.query("SET LOCAL ROLE church_runtime");
    assert.equal(
      (await db.query("SELECT count(*) FROM church.roles")).rows[0].count,
      "6",
    );
    await assert.rejects(
      db.query("DELETE FROM church.permissions WHERE id='dashboard'"),
      { code: "42501" },
    );
  } finally {
    await db.query("ROLLBACK");
    db.release();
  }
});
