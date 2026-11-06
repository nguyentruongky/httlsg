import { accessCredential } from "./session-test-utils";
import { GET as adminOtps } from "../app/api/admin/otps/route";
import { before, after, test, mock } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import nodemailer from "nodemailer";
import { updatePermissionMatrix } from "../lib/server/roles";
import { pool, transaction } from "../lib/server/db";
import { hashPassword } from "../lib/server/password";
import { actorById, createSession, cookieName } from "../lib/server/session";
import { POST as phoneRequest } from "../app/api/auth/request-phone-otp/route";
import { POST as emailRequest } from "../app/api/auth/request-email-otp/route";
import { POST as verify } from "../app/api/auth/verify-otp/route";
import { POST as setup } from "../app/api/auth/set-password/route";
import { POST as login } from "../app/api/auth/login/route";
import { GET as me } from "../app/api/auth/me/route";
import { GET as teamMembers } from "../app/api/leader/members/route";
import {
  GET as teamMember,
  PATCH as editTeamMember,
} from "../app/api/leader/members/[id]/route";
import { GET as teamEvents } from "../app/api/leader/events/route";
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
  board: "40000000-0000-4000-8000-000000000007",
};
const password = "Initial-password-otp-tests!";
const nextPassword = "Permanent-password-otp-tests!";
const cookies: Record<string, string> = {};
function req(path: string, data?: unknown, cookie = "") {
  return new Request(`http://127.0.0.1:3000${path}`, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      Origin: "http://127.0.0.1:3000",
      ...(cookie
        ? {
            cookie,
            Authorization: "Bearer " + cookie.slice(cookie.indexOf("=") + 1),
          }
        : {}),
      "X-Church-CSRF": "1",
      ...(data === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}

async function signIn(identifier: string, pw = password) {
  if (!identifier.includes("@")) {
    const { POST: identify } = await import("../app/api/auth/identify/route");
    assert.equal(
      (await identify(req("/api/auth/identify", { identifier }))).status,
      200,
    );
    const normalized = identifier.startsWith("0")
      ? "+84" + identifier.slice(1)
      : identifier;
    const code = await codeFor(normalized);
    const response = await verifyCode(identifier, code);
    assert.equal(response.status, 200);
    return await accessCredential(response);
  }
  const response = await login(
    req("/api/auth/login", { identifier, password: pw }),
  );
  assert.equal(response.status, 200);
  return await accessCredential(response);
}
async function getOtps(which = "admin") {
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
async function codeFor(phone: string, which = "admin") {
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
  await pool().query(
    "INSERT INTO church.department_managers(user_id,department_id) VALUES($1,'thanh-nien')",
    [ids.board],
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
  for (const who of [
    "admin",
    "secretary",
    "leaderA",
    "leaderB",
    "existing",
    "board",
  ])
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
test("phone request preserves an imported member, never returns an OTP, and keeps codes encrypted for Admin retrieval", async () => {
  const response = await phone("0901234567", "OTP member");
  assert.equal(response.status, 202);
  const data = await response.clone().json();
  assert.equal("otp_code" in data, false);
  assert.match(data.message, /Admin/);
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
    (await leaderOtps(req("/api/leader/otps", undefined, cookies.admin)))
      .status,
    200,
  );
  assert.equal(
    (
      await leaderOtps(
        req(
          "/api/leader/otps?department_id=thanh-nien",
          undefined,
          cookies.leaderB,
        ),
      )
    ).status,
    403,
  );
});
test("OTP snapshots and streams are Admin-only even with board/leader permissions", async () => {
  for (const role of ["board", "leaderA", "leaderB", "secretary", "existing"]) {
    assert.equal(
      (await leaderOtps(req("/api/leader/otps", undefined, cookies[role])))
        .status,
      403,
      role,
    );
    assert.equal(
      (await teamEvents(req("/api/leader/events", undefined, cookies[role])))
        .status,
      403,
      role,
    );
  }
  await phone("0909996222", "Yêu cầu Ban khác", "truyen-thong");
  const admin = await getOtps();
  assert.ok(admin.items.some((item) => item.phone === "+84901234567"));
  assert.ok(admin.items.some((item) => item.phone === "+84909996222"));
});
test("leader profile responses do not expose relatives outside the assigned department", async () => {
  const response = await memberDetail(
    req(`/api/members/${ids.member}`, undefined, cookies.leaderA),
    { params: Promise.resolve({ id: ids.member }) },
  );
  assert.equal(response.status, 200);
  const profile = await response.clone().json();
  assert.equal(profile.family, null);
  assert.deepEqual(profile.familySummaries, [
    { name: "OTP existing", relationship: "Con" },
  ]);
  assert.equal(profile.familyDetailsRestricted, true);
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
test("leader directory and profile edits are scoped; relatives expose only names and relations", async () => {
  const directory = await teamMembers(
    req("/api/leader/members", undefined, cookies.leaderA),
  );
  assert.equal(directory.status, 200);
  const list = await directory.clone().json();
  assert.ok(list.items.some((m: any) => m.id === ids.member));
  assert.ok(!list.items.some((m: any) => m.id === ids.existing));
  assert.equal(
    (await teamMembers(req("/api/leader/members", undefined, cookies.existing)))
      .status,
    403,
  );
  const context = { params: Promise.resolve({ id: ids.member }) };
  const profile = await (
    await teamMember(
      req(`/api/leader/members/${ids.member}`, undefined, cookies.leaderA),
      context,
    )
  ).json();
  assert.equal(profile.canEdit, true);
  assert.equal(profile.canManageLinks, false);
  assert.equal(profile.family, null);
  assert.deepEqual(profile.familySummaries, [
    { name: "OTP existing", relationship: "Con" },
  ]);
  assert.equal(
    JSON.stringify(profile.familySummaries).includes(ids.existing),
    false,
  );
  const outside = { params: Promise.resolve({ id: ids.existing }) };
  assert.equal(
    (
      await teamMember(
        req(`/api/leader/members/${ids.existing}`, undefined, cookies.leaderA),
        outside,
      )
    ).status,
    404,
  );
  const values = {
    name: profile.user.name,
    email: profile.user.email ?? "",
    phone: profile.phone ?? "",
    dateOfBirth: profile.dateOfBirth ?? "",
    address: "Địa chỉ kiểm thử trưởng ban",
    occupation: "",
    bio: profile.bio,
    departmentIds: profile.departments.map((d: any) => d.id),
    departmentRoles: Object.fromEntries(
      profile.departments.map((d: any) => [d.id, d.position]),
    ),
    area: profile.area ?? "",
    location: profile.location ?? "",
    position: profile.position,
    familyName: "",
    familyMembers: [],
    faithDate: "",
    baptismDate: "",
    lastVisitDate: "",
    churchStatus: "Trung tín",
    preferredName: "",
    gender: "",
    householdRole: "",
  };
  const patch = (id: string, value: unknown) =>
    new Request(`http://127.0.0.1:3000/api/leader/members/${id}`, {
      method: "PATCH",
      headers: {
        Origin: "http://127.0.0.1:3000",
        cookie: cookies.leaderA,
        Authorization: "Bearer " + cookies.leaderA.split("=")[1],
        "content-type": "application/json",
      },
      body: JSON.stringify(value),
    });
  const updated = await editTeamMember(
    patch(ids.member, { values, version: profile.version }),
    context,
  );
  assert.equal(updated.status, 200, await updated.clone().text());
  const saved = await updated.clone().json();
  assert.equal(saved.address, values.address);
  assert.equal(saved.family, null);
  assert.equal(
    (await editTeamMember(patch(ids.existing, { values, version: 0 }), outside))
      .status,
    404,
  );
  const familyChange = await editTeamMember(
    patch(ids.member, {
      values: {
        ...values,
        familyName: "Gia đình kiểm thử",
        familyMembers: [{ id: ids.existing, relationship: "Con" }],
      },
      version: saved.version,
    }),
    context,
  );
  assert.equal(familyChange.status, 403, await familyChange.clone().text());
  await pool().query(
    "INSERT INTO church.department_members(user_id,department_id,position) VALUES($1,'truyen-thong','Ban viên')",
    [ids.member],
  );
  const foreignRoleValues = {
    ...values,
    departmentIds: [...values.departmentIds, "truyen-thong"],
    departmentRoles: {
      ...values.departmentRoles,
      "truyen-thong": "Trưởng ban",
    },
  };
  assert.equal(
    (
      await editTeamMember(
        patch(ids.member, {
          values: foreignRoleValues,
          version: saved.version,
        }),
        context,
      )
    ).status,
    403,
  );
  const contactOnly = await editTeamMember(
    patch(ids.member, {
      values: {
        ...foreignRoleValues,
        departmentRoles: {
          ...foreignRoleValues.departmentRoles,
          "truyen-thong": "Ban viên",
        },
      },
      version: saved.version,
    }),
    context,
  );
  assert.equal(contactOnly.status, 200, await contactOnly.clone().text());
  assert.equal(
    (
      await pool().query(
        "SELECT position FROM church.department_members WHERE user_id=$1 AND department_id='truyen-thong'",
        [ids.member],
      )
    ).rows[0].position,
    "Ban viên",
  );
  await pool().query(
    "DELETE FROM church.department_members WHERE user_id=$1 AND department_id='truyen-thong'",
    [ids.member],
  );
});
test("SSE removes a consumed OTP immediately and rejects non-admins", async () => {
  assert.equal(
    (await teamEvents(req("/api/leader/events", undefined, cookies.existing)))
      .status,
    403,
  );
  const abort = new AbortController();
  const response = await teamEvents(
    new Request("http://127.0.0.1:3000/api/leader/events", {
      headers: {
        Authorization: "Bearer " + cookies.admin.split("=")[1],
        cookie: cookies.admin,
      },
      signal: abort.signal,
    }),
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type")!, /text\/event-stream/);
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  async function until(match: (text: string) => boolean) {
    let text = "";
    const timeout = setTimeout(() => abort.abort(), 5000);
    try {
      while (true) {
        const next = await reader.read();
        assert.equal(next.done, false, "stream ended before expected event");
        text += decoder.decode(next.value);
        if (match(text)) return text;
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  try {
    await until((text) => text.includes("event: resync"));
    assert.equal(
      (await phone("0909996101", "Thành viên kiểm thử đồng bộ")).status,
      202,
    );
    const pending = (
      await (
        await leaderOtps(req("/api/leader/otps", undefined, cookies.admin))
      ).json()
    ).items.find((item: any) => item.phone === "+84909996101");
    assert.ok(pending.created_at);
    assert.equal(pending.status, "pending");
    await until((text) => text.includes(pending.id));
    const verified = await verifyCode("0909996101", pending.otp_code);
    assert.equal(verified.status, 200);
    const removed = await until(
      (text) => text.includes(pending.id) && text.includes('"removed":true'),
    );
    assert.equal(
      removed.includes(pending.otp_code),
      false,
      "live event must not transmit OTP secrets",
    );
    assert.equal(
      (await getOtps()).items.some((item: any) => item.id === pending.id),
      false,
    );
    await pool().query(
      "UPDATE church.sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
      [ids.admin],
    );
    await until((text) => text.includes("event: access-revoked"));
  } finally {
    abort.abort();
    await reader.cancel();
    cookies.admin = await signIn("otp-admin@example.test");
  }
});
test("secondary leader roles remain scoped and permission revocation invalidates their sessions", async () => {
  await transaction(async (db) => {
    const id = "40000000-0000-4000-8000-000000000009";
    await db.query(
      "INSERT INTO church.member_profiles(id,email,full_name,role_id) VALUES($1,'secondary-leader@example.test','Kiểm thử nhiều vai trò','deacon')",
      [id],
    );
    await db.query(
      "INSERT INTO church.users(id,email,full_name,role_id,password_hash,is_password_set) VALUES($1,'secondary-leader@example.test','Kiểm thử nhiều vai trò','deacon',$2,true)",
      [id, await hashPassword(password)],
    );
    await db.query(
      "INSERT INTO church.member_roles(member_id,role_id,department_id) VALUES($1,'deacon',NULL),($1,'leader','thanh-nien'),($1,'leader','truyen-thong')",
      [id],
    );
    await db.query(
      "INSERT INTO church.department_leaders(user_id,department_id) VALUES($1,'thanh-nien'),($1,'truyen-thong')",
      [id],
    );
    const actor = (await actorById(db, id))!;
    assert.equal(actor.role, "deacon");
    assert.ok(actor.roles!.includes("leader"));
    assert.deepEqual(actor.leaderDepartmentIds, ["thanh-nien", "truyen-thong"]);
    const token = await createSession(db, actor);
    await db.query("SAVEPOINT permissions_check");
    await updatePermissionMatrix(db, (await actorById(db, ids.admin))!, {
      role_id: "leader",
      permissions: [],
    });
    const account = (
      await db.query("SELECT auth_version FROM church.users WHERE id=$1", [id])
    ).rows[0];
    assert.equal(account.auth_version, actor.authVersion + 1);
    const sessions = await db.query(
      "SELECT revoked_at FROM church.sessions WHERE user_id=$1",
      [id],
    );
    assert.ok(sessions.rows.every((row) => row.revoked_at !== null));
    assert.ok(token);
    await db.query("ROLLBACK TO SAVEPOINT permissions_check");
  });
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
    true,
  );
});
test("OTP grants only a restricted setup cookie, then password setup rotates/revokes every old session", async () => {
  const code = await codeFor("+84901234567");
  const response = await verifyCode("0901234567", code);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie")!, /Max-Age=900/);
  const restricted = await accessCredential(response);
  const body = await response.clone().json();
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
  assert.equal((await profile.clone().json()).user.requiresPasswordSetup, true);
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
  assert.match(upgraded.headers.get("set-cookie")!, /Max-Age=34560000/);
  const full = await accessCredential(upgraded);
  assert.notEqual(full, restricted);
  assert.equal((await upgraded.clone().json()).requires_password_setup, false);
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
  assert.equal((await response.clone().json()).requires_password_setup, true);
  const existing = await emailCode("otp-existing@example.test");
  const returning = await verifyCode(
    "otp-existing@example.test",
    existing.code,
  );
  assert.equal(returning.status, 200);
  assert.equal((await returning.clone().json()).requires_password_setup, false);
  assert.equal(
    (
      await members(
        req("/api/members", undefined, await accessCredential(returning)),
      )
    ).status,
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
    true,
  );
  const scoped = await members(req("/api/members", undefined, cookies.leaderA));
  assert.equal(scoped.status, 200);
  assert.equal(
    (await scoped.clone().json()).items.some((p: any) => p.id === ids.member),
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
  const current = await transaction(
    async (db) =>
      `${cookieName()}=${await createSession(db, (await actorById(db, ids.member))!)}`,
  );
  await pool().query(
    "UPDATE church.users SET auth_version=auth_version+1 WHERE id=$1",
    [ids.member],
  );
  assert.equal((await me(req("/api/auth/me", undefined, current))).status, 401);
});

test("an existing profile contact requires Admin approval instead of creating a duplicate or emailing an unverified address", async () => {
  const email = "otp-contact-only@example.test";
  const profile = (
    await pool().query(
      "INSERT INTO church.member_profiles(email,full_name) VALUES($1,'Hồ sơ đã có thông tin') RETURNING id",
      [email],
    )
  ).rows[0];
  const before = new Set(
    await readdir(process.env.OTP_OUTBOX_DIR!).catch(() => []),
  );
  const requested = await emailRequest(
    req("/api/auth/request-email-otp", { email }),
  );
  assert.equal(requested.status, 202);
  assert.equal((await requested.clone().json()).delivery, "ADMIN");
  assert.equal(
    (await readdir(process.env.OTP_OUTBOX_DIR!).catch(() => [])).filter(
      (name) => !before.has(name),
    ).length,
    0,
  );
  const account = (
    await pool().query(
      "SELECT id,requires_admin_email_otp FROM church.users WHERE email=$1",
      [email],
    )
  ).rows[0];
  assert.equal(account.id, profile.id);
  assert.equal(account.requires_admin_email_otp, true);
  const codes = await adminOtps(
    req(
      `/api/admin/otps?q=${encodeURIComponent(email)}`,
      undefined,
      cookies.admin,
    ),
  );
  const code = (await codes.clone().json()).items[0];
  assert.equal(code.delivery, "ADMIN");
  assert.match(code.otp_code, /^[0-9]{6}$/);
  const verified = await verifyCode(email, code.otp_code);
  assert.equal(verified.status, 200);
  const completed = await setup(
    req(
      "/api/auth/set-password",
      { new_password: nextPassword, confirm_password: nextPassword },
      await accessCredential(verified),
    ),
  );
  assert.equal(completed.status, 200);
  const visible = await members(
    req("/api/members", undefined, await accessCredential(completed)),
  );
  const body = await visible.clone().json();
  assert.equal(body.total, 1);
  assert.equal(body.items[0].id, profile.id);
  assert.equal(body.items[0].user.name, "Hồ sơ đã có thông tin");
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
    (await getOtps()).items.some((row) => row.phone === "+84907777788"),
  );
  const request = new Request("http://127.0.0.1:3000/api/admin/departments", {
    method: "DELETE",
    headers: {
      Origin: "http://127.0.0.1:3000",
      Authorization: "Bearer " + cookies.admin.split("=")[1],
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
  assert.equal((await session.clone().json()).requires_password_setup, true);
  const restricted = await accessCredential(session);
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
    ["0909996999", "otp"],
    ["otp-unregistered@example.test", "otp"],
  ]) {
    const response = await identify(req("/api/auth/identify", { identifier }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.clone().json(), { next });
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
    const data = await response.clone().json();
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

test("Admin OTP management includes every channel and lifecycle state without exposing inactive or email codes", async () => {
  cookies.admin = await signIn("otp-admin@example.test");
  for (const who of ["secretary", "board", "leaderA", "existing"]) {
    cookies[who] = await signIn(`otp-${who.toLowerCase()}@example.test`);
    assert.equal(
      (await adminOtps(req("/api/admin/otps", undefined, cookies[who]))).status,
      403,
    );
  }
  assert.equal(
    (await phone("0909996333", "OTP quản trị toàn bộ", "truyen-thong")).status,
    202,
  );
  const search = (params: Record<string, string>) =>
    adminOtps(
      req(
        `/api/admin/otps?${new URLSearchParams(params)}`,
        undefined,
        cookies.admin,
      ),
    );
  const response = await search({ q: "+84909996333", status: "all" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const pending = await response.clone().json();
  assert.equal((await (await search({ q: "0909996333" })).json()).total, 1);
  assert.equal(pending.total, 1);
  const item = pending.items[0];
  assert.equal(item.status, "pending");
  assert.equal(item.type, "PHONE_LEADER");
  assert.match(item.otp_code, /^[0-9]{6}$/);
  assert.equal("otp_ciphertext" in item, false);
  const p2 = await search({ q: "+84909996333", page: "2" });
  assert.equal((await p2.clone().json()).items.length, 0);
  assert.equal((await verifyCode("0909996333", item.otp_code)).status, 200);
  assert.equal(
    (await (await search({ q: "+84909996333", status: "all" })).json()).total,
    0,
  );
  assert.equal(
    (await (await search({ q: "+84909996333", status: "closed" })).json())
      .total,
    0,
  );
  assert.equal(
    (await (await search({ q: "+84909996333", status: "pending" })).json())
      .total,
    0,
  );
  const email = "admin-otp-console@example.test";
  await emailCode(email);
  const emailed = (await (await search({ q: email, type: "EMAIL" })).json())
    .items[0];
  assert.equal(emailed.status, "pending");
  assert.equal(emailed.otp_code, null);
  assert.equal(emailed.code_state, "email");
  await pool().query(
    "UPDATE church.otps SET created_at=now()-interval '2 minutes',expires_at=now()-interval '1 minute' WHERE id=$1",
    [emailed.id],
  );
  assert.equal(
    (await (await search({ q: email, status: "all" })).json()).total,
    0,
  );
  assert.equal(
    (await (await search({ q: email, status: "expired" })).json()).total,
    0,
  );
  assert.equal((await search({ page: "0" })).status, 400);
  assert.equal((await search({ status: "other" })).status, 400);
});

test("phone sign-in issues a valid Admin-delivered OTP for returning accounts without a department", async () => {
  const { POST: identify } = await import("../app/api/auth/identify/route");
  const identifier = "0909996444",
    phoneValue = "+84909996444";
  await pool().query(
    "UPDATE church.users SET phone=$2,department_id=NULL WHERE id=$1",
    [ids.existing, phoneValue],
  );
  const before = (
    await pool().query("SELECT * FROM church.users WHERE id=$1", [ids.existing])
  ).rows[0];
  const outboxBefore = new Set(
    await readdir(process.env.OTP_OUTBOX_DIR!).catch(() => []),
  );
  const first = await identify(req("/api/auth/identify", { identifier }));
  assert.equal(first.status, 200);
  const data = await first.clone().json();
  assert.equal(data.next, "otp");
  assert.match(data.message, /Admin/);
  assert.equal("otp_code" in data, false);
  const pending = async () => {
    const response = await adminOtps(
      req(
        `/api/admin/otps?q=${encodeURIComponent(phoneValue)}`,
        undefined,
        cookies.admin,
      ),
    );
    assert.equal(response.status, 200);
    return (await response.clone().json()).items[0];
  };
  const old = await pending();
  assert.match(old.otp_code, /^[0-9]{6}$/);
  const delivered = (await readdir(process.env.OTP_OUTBOX_DIR!)).filter(
    (file) => !outboxBefore.has(file),
  );
  assert.equal(delivered.length, 1);
  const message = JSON.parse(
    await readFile(resolve(process.env.OTP_OUTBOX_DIR!, delivered[0]), "utf8"),
  );
  assert.equal(message.to, "nguyentruongky33@gmail.com");
  assert.ok(message.text.includes(old.otp_code));
  assert.ok(message.text.includes(phoneValue));
  assert.match(message.text, /24 giờ/);
  assert.equal(old.status, "pending");
  assert.equal(
    (await identify(req("/api/auth/identify", { identifier }))).status,
    200,
  );
  const current = await pending();
  assert.notEqual(current.id, old.id);
  const signed = await verifyCode(identifier, current.otp_code);
  assert.equal(signed.status, 200);
  const result = await signed.clone().json();
  assert.equal(result.requires_password_setup, false);
  assert.equal(result.user.id, ids.existing);
  const after = (
    await pool().query("SELECT * FROM church.users WHERE id=$1", [ids.existing])
  ).rows[0];
  assert.equal(after.password_hash, before.password_hash);
  assert.equal(after.department_id, null);
  assert.equal(after.full_name, before.full_name);
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.department_members WHERE user_id=$1",
        [ids.existing],
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (await me(req("/api/auth/me", undefined, await accessCredential(signed))))
      .status,
    200,
  );
  const empty = await adminOtps(
    req(
      `/api/admin/otps?q=${encodeURIComponent(phoneValue)}`,
      undefined,
      cookies.admin,
    ),
  );
  assert.equal((await empty.clone().json()).total, 0);
  assert.equal((await verifyCode(identifier, current.otp_code)).status, 401);
  const passwordBypass = await login(
    req("/api/auth/login", { identifier, password }),
  );
  assert.equal(passwordBypass.status, 400);
  assert.equal(passwordBypass.headers.has("set-cookie"), false);
});

test("first-time phone registration emails the same OTP displayed in the Admin list", async () => {
  const before = new Set(
    await readdir(process.env.OTP_OUTBOX_DIR!).catch(() => []),
  );
  const response = await phone("0909996555", "Thành viên nhận mã qua Admin");
  assert.equal(response.status, 202);
  assert.equal("otp_code" in (await response.clone().json()), false);
  const code = await codeFor("+84909996555");
  const files = (await readdir(process.env.OTP_OUTBOX_DIR!)).filter(
    (file) => !before.has(file),
  );
  assert.equal(files.length, 1);
  const message = JSON.parse(
    await readFile(resolve(process.env.OTP_OUTBOX_DIR!, files[0]), "utf8"),
  );
  assert.equal(message.to, "nguyentruongky33@gmail.com");
  assert.ok(message.text.includes(code));
  assert.ok(message.text.includes("Thành viên nhận mã qua Admin"));
  assert.equal((await verifyCode("0909996555", code)).status, 200);
});

test("failed Admin email delivery rolls back OTP replacement and preserves the previous valid code", async () => {
  const { POST: identify } = await import("../app/api/auth/identify/route");
  const identifier = "0909996666";
  assert.equal((await phone(identifier)).status, 202);
  const oldCode = await codeFor("+84909996666");
  const saved = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
  let recipient = "";
  const transport = mock.method(
    nodemailer,
    "createTransport",
    () =>
      ({
        sendMail: async (message: any) => {
          recipient = message.to;
          throw new Error("Simulated SMTP delivery failure");
        },
      }) as any,
  );
  try {
    process.env.SMTP_USER = "test@example.test";
    process.env.SMTP_PASS = "test-only";
    const failed = await identify(req("/api/auth/identify", { identifier }));
    assert.equal(failed.status, 503);
    assert.equal(recipient, "nguyentruongky33@gmail.com");
    assert.equal(await codeFor("+84909996666"), oldCode);
    const count = await pool().query(
      "SELECT count(*)::int n FROM church.otps WHERE identifier=$1",
      ["+84909996666"],
    );
    assert.equal(count.rows[0].n, 1);
  } finally {
    transport.mock.restore();
    if (saved.user === undefined) delete process.env.SMTP_USER;
    else process.env.SMTP_USER = saved.user;
    if (saved.pass === undefined) delete process.env.SMTP_PASS;
    else process.env.SMTP_PASS = saved.pass;
  }
  assert.equal((await verifyCode(identifier, oldCode)).status, 200);
});
