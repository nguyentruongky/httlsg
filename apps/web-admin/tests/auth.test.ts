import { accessCredential } from "./session-test-utils";
import { GET as filterChoices } from "../app/api/members/filters/route";
import { GET as boardMembers } from "../app/api/board/members/route";
import {
  GET as boardDetail,
  PATCH as boardPatch,
} from "../app/api/board/members/[id]/route";
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
import { GET as searchRoleMembers } from "../app/api/admin/members/search/route";
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
    `3abcdef0-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
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
      ...(cookie
        ? {
            cookie,
            Authorization: "Bearer " + cookie.slice(cookie.indexOf("=") + 1),
          }
        : {}),
      "X-Church-CSRF": "1",
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
    cookies[role] = await accessCredential(response);
  }
});
after(async () => {
  await pool().end();
});
test("assignment lookup loads the exact selected profile and remains restricted to Admin and Thư ký", async () => {
  for (const role of ["admin", "secretary"] as const) {
    const result = await searchRoleMembers(
      request(
        `/api/admin/members/search?memberId=${ids.user}`,
        "GET",
        cookies[role],
      ),
    );
    assert.equal(result.status, 200);
    const body = await result.clone().json();
    assert.equal(body.total, 1);
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].id, ids.user);
  }
  assert.equal(
    (
      await searchRoleMembers(
        request(
          `/api/admin/members/search?memberId=${ids.user}`,
          "GET",
          cookies.leader,
        ),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await searchRoleMembers(
        request(
          "/api/admin/members/search?memberId=invalid",
          "GET",
          cookies.admin,
        ),
      )
    ).status,
    400,
  );
});
test("Ban điều hành team screens enforce department scope, editing, and family summaries", async () => {
  const directory = await boardMembers(
    request("/api/board/members", "GET", cookies.board),
  );
  assert.equal(directory.status, 200);
  const list = await directory.clone().json();
  assert.ok(list.items.some((m: DirectoryMember) => m.id === ids.family));
  assert.ok(!list.items.some((m: DirectoryMember) => m.id === ids.outside));
  const response = await boardDetail(
    request(`/api/board/members/${ids.family}`, "GET", cookies.board),
    context(ids.family),
  );
  assert.equal(response.status, 200);
  const member: DirectoryMember = await response.clone().json();
  assert.equal(member.canEdit, true);
  assert.equal(member.canManageLinks, false);
  assert.equal(member.family, null);
  assert.ok(
    member.familySummaries!.some(
      (relative) => relative.name === "Kiểm thử user",
    ),
  );
  const saved = await boardPatch(
    request(`/api/board/members/${ids.family}`, "PATCH", cookies.board, {
      values: fields(member),
      version: member.version,
    }),
    context(ids.family),
  );
  assert.equal(saved.status, 200, await saved.clone().text());
  assert.equal(
    (
      await boardDetail(
        request(`/api/board/members/${ids.outside}`, "GET", cookies.board),
        context(ids.outside),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await boardPatch(
        request(`/api/board/members/${ids.outside}`, "PATCH", cookies.board, {
          values: fields(member),
          version: 0,
        }),
        context(ids.outside),
      )
    ).status,
    404,
  );
  for (const role of ["user", "leader", "deacon"] as const)
    assert.equal(
      (await boardMembers(request("/api/board/members", "GET", cookies[role])))
        .status,
      403,
    );
  await pool().query(
    "INSERT INTO church.member_roles(member_id,role_id,department_id) VALUES($1,'board','thanh-nien')",
    [ids.deacon],
  );
  await pool().query(
    "INSERT INTO church.department_managers(user_id,department_id) VALUES($1,'thanh-nien')",
    [ids.deacon],
  );
  try {
    assert.equal(
      (await boardMembers(request("/api/board/members", "GET", cookies.deacon)))
        .status,
      200,
    );
    const secondary = await boardDetail(
      request(`/api/board/members/${ids.family}`, "GET", cookies.deacon),
      context(ids.family),
    );
    assert.equal((await secondary.clone().json()).canEdit, true);
  } finally {
    await pool().query("DELETE FROM church.member_roles WHERE member_id=$1", [
      ids.deacon,
    ]);
    await pool().query(
      "DELETE FROM church.department_managers WHERE user_id=$1",
      [ids.deacon],
    );
  }
});
test("database seeds six roles and identical general Admin/Thư ký permissions with calendar exceptions", async () => {
  assert.equal(
    (await pool().query("SELECT count(*) FROM church.roles")).rows[0].count,
    "6",
  );
  const roles = await pool().query(
    "SELECT role_id,array_agg(permission_id ORDER BY permission_id) permissions FROM church.role_permissions WHERE role_id IN ('admin','secretary') AND permission_id NOT LIKE 'calendar.%' GROUP BY role_id ORDER BY role_id",
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
    const body = await response.clone().json();
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
  assert.match(response.headers.get("set-cookie")!, /SameSite=strict/i);
  assert.equal((await response.clone().json()).redirectTo, "/client");
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
  const cookie = await accessCredential(response);
  assert.equal(
    (
      await logout(
        request(
          "/api/auth/logout",
          "POST",
          response.headers.getSetCookie()[0].split(";")[0],
        ),
      )
    ).status,
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
      (await response.clone().json()).message,
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
test("directory applies family, team, and explicit global role scopes", async () => {
  for (const role of AccessRoleSchema.options) {
    const response = await list(request("/api/members", "GET", cookies[role]));
    assert.equal(response.status, 200);
    const data = await response.clone().json();
    assert.equal(
      data.total,
      role === "user" ? 2 : role === "leader" || role === "board" ? 1 : 8,
    );
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
test("team directory searches and filters cannot escape assignments, including combined roles", async () => {
  await pool().query(
    "UPDATE church.member_profiles SET area='KV1',location='Phường Sài Gòn' WHERE id=$1",
    [ids.family],
  );
  await pool().query(
    "UPDATE church.member_profiles SET area='KV13',location='Phường Tân Định' WHERE id=$1",
    [ids.outside],
  );
  for (const role of ["board", "leader"] as const) {
    const filtered = await list(
      request(
        `/api/members?query=${encodeURIComponent(JSON.stringify({ search: "outside" }))}`,
        "GET",
        cookies[role],
      ),
    );
    assert.equal((await filtered.clone().json()).total, 0);
    const outside = await detail(
      request(`/api/members/${ids.outside}`, "GET", cookies[role]),
      context(ids.outside),
    );
    assert.equal(outside.status, 404);
    const choices = await filterChoices(
      request("/api/members/filters", "GET", cookies[role]),
    );
    assert.equal(choices.status, 200);
    const options = await choices.clone().json();
    assert.deepEqual(
      options.departments.map((d: any) => d.id),
      ["thanh-nien"],
    );
    assert.deepEqual(options.areas, ["KV1"]);
    assert.deepEqual(options.locations, ["Phường Sài Gòn"]);
    const tampered = await list(
      request(
        `/api/members?query=${encodeURIComponent(JSON.stringify({ departmentIds: ["truyen-thong"], area: "KV13" }))}`,
        "GET",
        cookies[role],
      ),
    );
    assert.equal((await tampered.clone().json()).total, 0);
  }
  await pool().query(
    "INSERT INTO church.member_roles(member_id,role_id,department_id) VALUES($1,'board','thanh-nien'),($1,'leader','truyen-thong')",
    [ids.board],
  );
  await pool().query(
    "INSERT INTO church.department_leaders(user_id,department_id) VALUES($1,'truyen-thong')",
    [ids.board],
  );
  await pool().query(
    "INSERT INTO church.department_members(user_id,department_id) VALUES($1,'truyen-thong')",
    [ids.outside],
  );
  try {
    const combined = await list(request("/api/members", "GET", cookies.board));
    assert.deepEqual(
      (await combined.clone().json()).items.map((m: any) => m.id).sort(),
      [ids.family, ids.outside].sort(),
    );
    assert.equal(
      (
        await detail(
          request(`/api/members/${ids.user}`, "GET", cookies.board),
          context(ids.user),
        )
      ).status,
      404,
    );
    const own = await detail(
      request(`/api/members/${ids.board}`, "GET", cookies.board),
      context(ids.board),
    );
    assert.equal(
      own.status,
      200,
      "personal profile remains accessible outside the team directory",
    );
  } finally {
    await pool().query(
      "UPDATE church.member_profiles SET area=NULL,location=NULL WHERE id=ANY($1::uuid[])",
      [[ids.family, ids.outside]],
    );
    await pool().query("DELETE FROM church.member_roles WHERE member_id=$1", [
      ids.board,
    ]);
    await pool().query(
      "DELETE FROM church.department_leaders WHERE user_id=$1",
      [ids.board],
    );
    await pool().query(
      "DELETE FROM church.department_members WHERE user_id=$1 AND department_id='truyen-thong'",
      [ids.outside],
    );
  }
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
    (
      await patch(
        request(`/api/members/${ids.outside}`, "PATCH", cookies.board, {
          values: fields(await get("admin", ids.outside)),
          version: 0,
        }),
        context(ids.outside),
      )
    ).status,
    404,
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
test("User-only accounts cannot retrieve or create confidential notes", async () => {
  const text = "Ghi chú riêng dành cho người quản lý";
  const created = await addHistory(
    request(`/api/members/${ids.user}/notes`, "POST", cookies.admin, { text }),
    { params: Promise.resolve({ id: ids.user, kind: "notes" }) },
  );
  assert.equal(created.status, 201);
  const own = await get("user", ids.user);
  assert.equal(own.canReadNotes, false);
  assert.deepEqual(own.notes, []);
  assert.equal(JSON.stringify(own).includes(text), false);
  const response = await list(request("/api/members", "GET", cookies.user));
  assert.equal(
    JSON.stringify(await response.clone().json()).includes(text),
    false,
  );
  for (const id of [ids.user, ids.family]) {
    const blocked = await addHistory(
      request(`/api/members/${id}/notes`, "POST", cookies.user, {
        text: "Bị chặn",
      }),
      { params: Promise.resolve({ id, kind: "notes" }) },
    );
    assert.equal(blocked.status, 403);
  }
  const managed = await get("admin", ids.user);
  assert.equal(managed.canReadNotes, true);
  assert.ok(managed.notes.some((note) => note.text === text));
});
test("notes and visits are hidden on every actor's own profile and writable only for other managed members", async () => {
  for (const role of AccessRoleSchema.options) {
    await pool().query(
      "INSERT INTO church.notes(member_id,author_id,text) VALUES($1,$2,'Ghi chú cá nhân bí mật')",
      [ids[role], ids.admin],
    );
    await pool().query(
      "INSERT INTO church.visits(member_id,visited_on) VALUES($1,'2025-01-09')",
      [ids[role]],
    );
    await pool().query(
      "UPDATE church.member_profiles SET source=jsonb_build_object('row',1,'preferredName','','gender','','faithDate','','baptismDate','','age','','believerType','','areaRaw','','familyRole','','lastVisitDate','2025-01-09','departmentRaw','','phoneRaw','','householdName','','addressRaw','','ambiguousHousehold',false) WHERE id=$1",
      [ids[role]],
    );
    try {
      const own = await get(role, ids[role]);
      assert.equal(own.canReadNotes, false, role);
      assert.equal(own.canReadVisitHistory, false, role);
      assert.deepEqual(own.notes, [], role);
      assert.deepEqual(own.visitHistory, [], role);
      assert.equal(own.lastVisitDate, null, role);
      assert.equal(own.source?.lastVisitDate, "", role);
      for (const kind of ["notes", "visits"] as const) {
        const value =
          kind === "notes" ? { text: "Tự thêm" } : { visitedOn: "2025-01-10" };
        for (const id of [ids[role], ids[role].toUpperCase()])
          assert.equal(
            (
              await addHistory(
                request(
                  `/api/members/${id}/${kind}`,
                  "POST",
                  cookies[role],
                  value,
                ),
                { params: Promise.resolve({ id, kind }) },
              )
            ).status,
            403,
            `${role} ${kind}`,
          );
      }
    } finally {
      await pool().query(
        "UPDATE church.member_profiles SET source=NULL WHERE id=$1",
        [ids[role]],
      );
    }
  }
  for (const role of ["user", "deacon"] as const) {
    const profile = await get(role, ids.family);
    assert.deepEqual(profile.notes, []);
    assert.deepEqual(profile.visitHistory, []);
    for (const kind of ["notes", "visits"] as const)
      assert.equal(
        (
          await addHistory(
            request(
              `/api/members/${ids.family}/${kind}`,
              "POST",
              cookies[role],
              kind === "notes"
                ? { text: "Bị chặn" }
                : { visitedOn: "2025-01-10" },
            ),
            { params: Promise.resolve({ id: ids.family, kind }) },
          )
        ).status,
        403,
      );
  }
  for (const role of ["board", "leader"] as const) {
    const managed = await get(role, ids.family);
    assert.equal(managed.canReadNotes, true);
    assert.equal(managed.canReadVisitHistory, true);
    for (const kind of ["notes", "visits"] as const)
      assert.equal(
        (
          await addHistory(
            request(
              `/api/members/${ids.family}/${kind}`,
              "POST",
              cookies[role],
              kind === "notes"
                ? { text: "Ghi chú quản lý" }
                : { visitedOn: "2025-01-10" },
            ),
            { params: Promise.resolve({ id: ids.family, kind }) },
          )
        ).status,
        201,
      );
  }
});
test("visit creation accepts only date, attributes the session actor, and displays null-author imports", async () => {
  const response = await addHistory(
    request(`/api/members/${ids.family}/visits`, "POST", cookies.board, {
      visitedOn: "2025-02-03",
    }),
    { params: Promise.resolve({ id: ids.family, kind: "visits" }) },
  );
  assert.equal(response.status, 201);
  assert.equal(
    (
      await addHistory(
        request(`/api/members/${ids.family}/visits`, "POST", cookies.board, {
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
  const m = await get("board", ids.family);
  assert.equal(m.visitHistory[0].authorName, "");
  assert.equal(m.visitHistory[1].authorId, ids.board);
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
    const body = await response.clone().json();
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
  assert.equal((await response.clone().json()).user.role, "user");
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
  const cookie = await accessCredential(response);
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
      maxAge: 900,
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
