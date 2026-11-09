import { accessCredential } from "./session-test-utils";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  getDirectoryMember,
  orgs,
  MemberSchema,
  MemberDetailInputSchema,
  departments,
} from "@org/core";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool, transaction } from "../lib/server/db";
import { hashPassword } from "../lib/server/password";
import { actorById, createSession, cookieName } from "../lib/server/session";
import { previewMerge, mergeMembers } from "../lib/server/merge-members";
import { POST as preview } from "../app/api/admin/members/merge/preview/route";
import { POST as merge } from "../app/api/admin/members/merge/route";
import {
  GET as detail,
  PATCH as patch,
  DELETE as remove,
} from "../app/api/members/[id]/route";
import { POST as history } from "../app/api/members/[id]/[kind]/route";
import { GET as me } from "../app/api/auth/me/route";
import { POST as login } from "../app/api/auth/login/route";
const password = "Merge-profile-test-password!";
let encoded: string, admin: string, secretary: string, board: string;
const cookies: Record<string, string> = {};
async function profile(name: string, role = "user", account = false) {
  const id = randomUUID(),
    email = `${id}@example.test`;
  await pool().query(
    "INSERT INTO church.member_profiles(id,full_name,email,role_id) VALUES($1,$2,$3,$4)",
    [id, name, email, role],
  );
  if (account)
    await pool().query(
      "INSERT INTO church.users(id,email,full_name,role_id,password_hash,is_password_set) VALUES($1,$2,$3,$4,$5,true)",
      [id, email, name, role, encoded],
    );
  return id;
}
function req(
  path: string,
  data?: unknown,
  cookie = cookies.admin,
  method = data === undefined ? "GET" : "POST",
) {
  return new Request(`http://127.0.0.1:3000${path}`, {
    method,
    headers: {
      cookie,
      Authorization: "Bearer " + cookie.slice(cookie.indexOf("=") + 1),
      "X-Church-CSRF": "1",
      Origin: "http://127.0.0.1:3000",
      ...(data === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
async function session(id: string) {
  return transaction(
    async (db) =>
      `${cookieName()}=${await createSession(db, (await actorById(db, id))!)}`,
  );
}
async function plan(ids: string[], cookie = cookies.admin) {
  const response = await preview(
    req("/api/admin/members/merge/preview", { ids }, cookie),
  );
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}
async function execute(ids: string[], token?: string) {
  const data = token ? { previewToken: token } : await plan(ids);
  return merge(
    req("/api/admin/members/merge", { ids, previewToken: data.previewToken }),
  );
}
before(async () => {
  encoded = await hashPassword(password);
  admin = await profile("Quản trị hợp nhất", "admin", true);
  secretary = await profile("Thư ký hợp nhất", "secretary", true);
  board = await profile("Điều hành hợp nhất", "board", true);
  for (const [name, id] of Object.entries({ admin, secretary, board }))
    cookies[name] = await session(id);
});
after(async () => {
  await pool().end();
});
test("only Admin can preview/merge; IDs are ordered, unique, bounded and origin checked", async () => {
  const first = await profile("Hồ sơ chính"),
    second = await profile("Hồ sơ phụ");
  for (const role of ["secretary", "board"]) {
    assert.equal(
      (
        await preview(
          req(
            "/api/admin/members/merge/preview",
            { ids: [first, second] },
            cookies[role],
          ),
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await merge(
          req(
            "/api/admin/members/merge",
            { ids: [first, second], previewToken: "a".repeat(64) },
            cookies[role],
          ),
        )
      ).status,
      403,
    );
  }
  for (const ids of [
    [first],
    [first, first.toUpperCase()],
    Array.from({ length: 21 }, () => randomUUID()),
  ])
    assert.equal(
      (await preview(req("/api/admin/members/merge/preview", { ids }))).status,
      400,
    );
  const untrusted = new Request(
    "http://127.0.0.1:3000/api/admin/members/merge",
    {
      method: "POST",
      headers: {
        cookie: cookies.admin,
        "content-type": "application/json",
        Origin: "https://other.test",
      },
      body: JSON.stringify({
        ids: [first, second],
        previewToken: "a".repeat(64),
      }),
    },
  );
  assert.equal((await merge(untrusted)).status, 403);
  const result = await plan([second, first]);
  assert.equal(result.ids[0], second);
  assert.equal(JSON.stringify(result).includes(encoded), false);
});
test("merge keeps the first ID and transfers every relationship with conflicts resolved in input order", async () => {
  const first = await profile("Hồ sơ đầu tiên"),
    second = await profile("Hồ sơ thứ hai", "leader", true),
    third = await profile("Hồ sơ thứ ba", "board", true),
    relativeA = await profile("Người thân A"),
    relativeB = await profile("Người thân B");
  await pool().query(
    "UPDATE church.member_profiles SET address='Địa chỉ ưu tiên',email=NULL WHERE id=$1",
    [first],
  );
  await pool().query(
    "UPDATE church.member_profiles SET address='Địa chỉ khác',occupation='Nghề bổ sung' WHERE id=$1",
    [second],
  );
  await pool().query(
    "INSERT INTO church.department_members VALUES('thanh-nien',$1,''),('thanh-nien',$2,'Trưởng ban'),('truyen-thong',$3,'Điều hành')",
    [first, second, third],
  );
  await pool().query(
    "INSERT INTO church.department_leaders(user_id,department_id) VALUES($1,'thanh-nien')",
    [second],
  );
  await pool().query(
    "INSERT INTO church.department_managers(user_id,department_id) VALUES($1,'truyen-thong')",
    [third],
  );
  await pool().query(
    "INSERT INTO church.member_roles(member_id,role_id,department_id) VALUES($1,'leader','thanh-nien'),($2,'board','truyen-thong')",
    [second, third],
  );
  const houses = (
    await pool().query(
      "INSERT INTO church.households VALUES(DEFAULT),(DEFAULT) RETURNING id",
    )
  ).rows;
  await pool().query(
    "INSERT INTO church.household_members(user_id,household_id,relationship) VALUES($1,$5,'Chủ hộ'),($2,$5,'Con'),($3,$6,'Thành viên'),($4,$6,'Vợ')",
    [first, relativeA, second, relativeB, houses[0].id, houses[1].id],
  );
  await pool().query(
    "INSERT INTO church.notes(member_id,author_id,text) VALUES($1,$2,'Ghi chú giữ nguyên')",
    [second, third],
  );
  await pool().query(
    "INSERT INTO church.visits(member_id,author_id,visited_on) VALUES($1,$2,'2025-01-02')",
    [third, second],
  );
  await pool().query(
    "INSERT INTO church.audit_log(actor_id,subject_id,action) VALUES($1,$2,'Lịch sử cũ')",
    [third, second],
  );
  const oldCookie = await session(second);
  await pool().query(
    "INSERT INTO church.otps(user_id,otp_code,otp_ciphertext,type,department_id,expires_at) VALUES($1,$2,'encrypted-placeholder','PHONE_LEADER','thanh-nien',now()+interval '1 hour')",
    [second, "a".repeat(64)],
  );
  const ids = [first, second, third],
    p = await plan(ids);
  assert.equal(p.retainedAccount.id, second);
  assert.ok(p.conflicts.includes("Địa chỉ"));
  const response = await execute(ids, p.previewToken);
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await response.clone().json()).id, first);
  const retained = (
    await pool().query("SELECT * FROM church.member_profiles WHERE id=$1", [
      first,
    ])
  ).rows[0];
  assert.equal(retained.full_name, "Hồ sơ đầu tiên");
  assert.equal(retained.address, "Địa chỉ ưu tiên");
  assert.equal(retained.occupation, "Nghề bổ sung");
  assert.equal(retained.role_id, "board");
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.member_profiles WHERE id=ANY($1::uuid[])",
        [[second, third]],
      )
    ).rows[0].n,
    0,
  );
  for (const table of [
    "department_members",
    "department_managers",
    "department_leaders",
    "sessions",
    "otps",
    "household_members",
  ])
    assert.equal(
      (
        await pool().query(
          `SELECT count(*)::int n FROM church.${table} WHERE user_id=ANY($1::uuid[])`,
          [[second, third]],
        )
      ).rows[0].n,
      0,
      table,
    );
  for (const table of ["notes", "visits"]) {
    const row = (
      await pool().query(`SELECT * FROM church.${table} WHERE member_id=$1`, [
        first,
      ])
    ).rows[0];
    assert.equal(row.author_id, first);
  }
  assert.equal(
    (
      await pool().query(
        "SELECT position FROM church.department_members WHERE user_id=$1 AND department_id='thanh-nien'",
        [first],
      )
    ).rows[0].position,
    "Trưởng ban",
  );
  assert.equal(
    (
      await pool().query(
        "SELECT count(DISTINCT household_id)::int n FROM church.household_members WHERE user_id=ANY($1::uuid[])",
        [[first, relativeA, relativeB]],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.member_roles WHERE member_id=$1",
        [first],
      )
    ).rows[0].n,
    2,
  );
  const audit = (
    await pool().query(
      "SELECT * FROM church.audit_log WHERE action='Lịch sử cũ'",
    )
  ).rows[0];
  assert.equal(audit.actor_id, first);
  assert.equal(audit.subject_id, first);
  assert.equal(
    (await me(req("/api/auth/me", undefined, oldCookie))).status,
    401,
  );
  const otp = (
    await pool().query("SELECT * FROM church.otps WHERE user_id=$1", [first])
  ).rows[0];
  assert.equal(otp.is_used, true);
  const alias = await detail(req(`/api/members/${second}`), ctx(second));
  assert.equal((await alias.clone().json()).id, first);
  assert.equal(
    (
      await remove(
        req(`/api/members/${second}`, undefined, cookies.admin, "DELETE"),
        ctx(second),
      )
    ).status,
    409,
  );
  const repeat = await execute(ids, p.previewToken);
  assert.equal(repeat.status, 200);
  const loggedIn = await login(
    req(
      "/api/auth/login",
      { identifier: `${second}@example.test`, password },
      "",
    ),
  );
  assert.equal(loggedIn.status, 200);
  assert.equal((await loggedIn.clone().json()).user.id, first);
  const targetCookie = await accessCredential(loggedIn);
  const selfNote = await history(
    req(
      `/api/members/${second}/notes`,
      { text: "Không được tự thêm" },
      targetCookie,
    ),
    { params: Promise.resolve({ id: second, kind: "notes" }) },
  );
  assert.equal(selfNote.status, 403);
  const unrelated = await profile("Hồ sơ ngoài đội");
  assert.equal(
    (
      await detail(
        req(`/api/members/${unrelated}`, undefined, targetCookie),
        ctx(unrelated),
      )
    ).status,
    404,
  );
});
test("existing primary account credentials win, all affected sessions are revoked, and aliases flatten", async () => {
  const first = await profile("Tài khoản chính", "user", true),
    second = await profile("Tài khoản phụ", "user", true),
    newFirst = await profile("ID cuối cùng");
  const cookie = await session(first),
    retired = await session(second);
  assert.equal((await execute([first, second])).status, 200);
  assert.equal((await me(req("/api/auth/me", undefined, cookie))).status, 401);
  assert.equal((await me(req("/api/auth/me", undefined, retired))).status, 401);
  const original = await login(
    req(
      "/api/auth/login",
      { identifier: `${first}@example.test`, password },
      "",
    ),
  );
  assert.equal(original.status, 200);
  const old = await login(
    req(
      "/api/auth/login",
      { identifier: `${second}@example.test`, password },
      "",
    ),
  );
  assert.equal(old.status, 401);
  assert.equal((await execute([newFirst, first])).status, 200);
  const aliases = (
    await pool().query(
      "SELECT * FROM church.profile_merges WHERE source_id=ANY($1::uuid[])",
      [[first, second]],
    )
  ).rows;
  assert.ok(aliases.every((a) => a.target_id === newFirst));
  assert.equal(
    (await (await detail(req(`/api/members/${second}`), ctx(second))).json())
      .id,
    newFirst,
  );
});
test("stale review fails atomically and runtime DB privileges allow canonicalizing references", async () => {
  const first = await profile("Chính kiểm tra"),
    second = await profile("Phụ kiểm tra");
  const p = await plan([first, second]);
  await pool().query(
    "INSERT INTO church.notes(member_id,author_id,text) VALUES($1,$2,'Thêm sau khi xem trước')",
    [second, admin],
  );
  const stale = await execute([first, second], p.previewToken);
  assert.equal(stale.status, 409);
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.member_profiles WHERE id=ANY($1::uuid[])",
        [[first, second]],
      )
    ).rows[0].n,
    2,
  );
  await transaction(async (db) => {
    const actor = (await actorById(db, admin))!;
    await db.query("SET LOCAL ROLE church_runtime");
    const fresh = await previewMerge(db, actor, { ids: [first, second] });
    const merged = await mergeMembers(db, actor, {
      ids: [first, second],
      previewToken: fresh.previewToken,
    });
    assert.equal(merged.id, first);
  });
});

test("a late constraint failure rolls back account moves, aliases, history and profile fields", async () => {
  const first = await profile("Giữ nguyên khi lỗi"),
    second = await profile("Không được xóa", "user", true);
  const cookie = await session(second);
  await pool().query(
    "UPDATE church.member_profiles SET occupation='Nghề nguồn' WHERE id=$1",
    [second],
  );
  await pool().query(
    "INSERT INTO church.notes(member_id,author_id,text) VALUES($1,$2,'Không được mất')",
    [second, admin],
  );
  await pool().query(
    "CREATE TABLE church.merge_blocker(profile_id uuid REFERENCES church.member_profiles(id) ON DELETE RESTRICT)",
  );
  await pool().query("INSERT INTO church.merge_blocker VALUES($1)", [second]);
  try {
    assert.equal((await execute([first, second])).status, 400);
    assert.equal(
      (
        await pool().query(
          "SELECT occupation FROM church.member_profiles WHERE id=$1",
          [first],
        )
      ).rows[0].occupation,
      "",
    );
    assert.equal(
      (
        await pool().query(
          "SELECT count(*)::int n FROM church.profile_merges WHERE source_id=$1",
          [second],
        )
      ).rows[0].n,
      0,
    );
    assert.equal(
      (
        await pool().query(
          "SELECT count(*)::int n FROM church.notes WHERE member_id=$1",
          [second],
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (await me(req("/api/auth/me", undefined, cookie))).status,
      200,
    );
  } finally {
    await pool().query("DROP TABLE church.merge_blocker");
  }
});
test("merging cannot disable the last usable Admin account", async () => {
  const first = await profile("Hồ sơ ngưng hoạt động");
  await pool().query(
    "UPDATE church.member_profiles SET enabled=false WHERE id=$1",
    [first],
  );
  await transaction(async (db) => {
    const actor = (await actorById(db, admin))!;
    await db.query("SAVEPOINT admins");
    try {
      await db.query(
        "UPDATE church.users SET enabled=false WHERE role_id='admin' AND id<>$1",
        [admin],
      );
      const preview = await previewMerge(db, actor, { ids: [first, admin] });
      await assert.rejects(
        mergeMembers(db, actor, {
          ids: [first, admin],
          previewToken: preview.previewToken,
        }),
        { status: 409 },
      );
    } finally {
      await db.query("ROLLBACK TO SAVEPOINT admins");
    }
  });
});
test("reimporting a retired ID never recreates a duplicate profile", async () => {
  const first = await profile("Hồ sơ chính nhập lại"),
    second = await profile("Hồ sơ nguồn nhập lại");
  assert.equal((await execute([first, second])).status, 200);
  const fixture = await getDirectoryMember(
    orgs[0].id,
    "20000000-0000-4000-8000-000000000101",
  );
  const member = MemberSchema.parse({
    ...fixture,
    id: second,
    userId: second,
    user: {
      ...fixture.user,
      id: second,
      name: "Dữ liệu nhập lại",
      email: null,
    },
  });
  const fields = MemberDetailInputSchema.parse({
    name: member.user.name,
    email: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    occupation: "",
    bio: "",
    departmentIds: [],
    area: "",
    location: "",
    position: "Ban viên",
    familyName: "",
    familyMembers: [],
  });
  const directory = await mkdtemp(join(tmpdir(), "church-merge-import-"));
  try {
    const path = join(directory, "fixture.json");
    await writeFile(
      path,
      JSON.stringify({
        revision: "abcdef1234567890",
        organization: orgs[0],
        departments,
        members: [member],
        profiles: { [second]: { fields } },
      }),
    );
    const result = await promisify(execFile)(
      process.execPath,
      ["--import", "tsx", "scripts/database.ts", "import", path],
      { cwd: process.cwd() },
    );
    assert.match(result.stdout, /Imported 0 profiles/);
    assert.equal(
      (
        await pool().query(
          "SELECT count(*)::int n FROM church.member_profiles WHERE id=$1",
          [second],
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("merging profiles canonicalizes calendar authors and preserves immutable event/recipient snapshots", async () => {
  const first = await profile("Hồ sơ giữ lịch"),
    second = await profile("Tác giả lịch trùng");
  const event = (
    await pool().query(
      "INSERT INTO church.events(event_date,title,details,original_text,created_by,updated_by,request_id,request_hash) VALUES('2026-11-06','Lịch được giữ','Nội dung','Lịch được giữ',$1,$1,$2,'hash') RETURNING id",
      [second, randomUUID()],
    )
  ).rows[0].id;
  const group = (
    await pool().query(
      "INSERT INTO church.email_groups(name,created_by,updated_by) VALUES($1,$2,$2) RETURNING id",
      ["calendar-merge-" + randomUUID(), second],
    )
  ).rows[0].id;
  const batch = (
    await pool().query(
      "INSERT INTO church.event_notifications(event_id,request_id,kind,snapshot,group_names,created_by) VALUES($1,$2,'created',$3,$4,$5) RETURNING id",
      [
        event,
        randomUUID(),
        JSON.stringify({ title: "Giữ nguyên snapshot" }),
        ["Nhóm gốc"],
        second,
      ],
    )
  ).rows[0].id;
  const retryId = randomUUID();
  await pool().query(
    "INSERT INTO church.event_notification_retries(request_id,notification_id,count,created_by) VALUES($1,$2,0,$3)",
    [retryId, batch, second],
  );
  const saveId = randomUUID();
  await pool().query(
    "INSERT INTO church.event_save_requests(request_id,event_id,created_by,operation,request_hash,notification_id,applied_version) VALUES($1,$2,$3,'created',$4,$5,0)",
    [saveId, event, second, "0".repeat(64), batch],
  );
  const worshipRequestId = randomUUID();
  await pool().query(
    "INSERT INTO church.notification_history(id,request_id,event_id,event_version,created_by,type,recipient,preview_hash,message,missing_fields,status) VALUES($1,$2,$3,0,$4,'worship_information_request','nguyentruongky33@gmail.com',$5,'Snapshot', '[]','sent')",
    [worshipRequestId, randomUUID(), event, second, "0".repeat(64)],
  );
  const preview = await plan([first, second]);
  const unrelated = await profile("Tác giả thay thế");
  await pool().query(
    "UPDATE church.email_groups SET updated_by=$2 WHERE id=$1",
    [group, unrelated],
  );
  assert.equal(
    (await execute([first, second], preview.previewToken)).status,
    409,
  );
  await pool().query(
    "UPDATE church.email_groups SET updated_by=$2 WHERE id=$1",
    [group, second],
  );
  assert.equal((await execute([first, second])).status, 200);
  for (const [table, key, id] of [
    ["events", "id", event],
    ["email_groups", "id", group],
    ["event_notifications", "id", batch],
    ["event_notification_retries", "request_id", retryId],
    ["event_save_requests", "request_id", saveId],
    ["notification_history", "id", worshipRequestId],
  ]) {
    const row = (
      await pool().query(`SELECT * FROM church.${table} WHERE ${key}=$1`, [id])
    ).rows[0];
    assert.equal(row.created_by, first);
    if ("updated_by" in row) assert.equal(row.updated_by, first);
  }
  assert.equal(
    (
      await pool().query(
        "SELECT snapshot FROM church.event_notifications WHERE id=$1",
        [batch],
      )
    ).rows[0].snapshot.title,
    "Giữ nguyên snapshot",
  );
});

test("profile merge coalesces schedule assignments, management grants, recipient state and duplicate notices into the first ID", async () => {
  const { saveSchedule, transitionSchedule } =
    await import("../lib/server/schedules");
  const { defaultScheduleSettings } = await import("@org/core");
  const first = await profile("Giữ hồ sơ phục vụ"),
    second = await profile("Trùng hồ sơ phục vụ");
  const schedule = await transaction(async (db) => {
    const actor = (await actorById(db, admin))!;
    const draft = await saveSchedule(db, actor, {
      categoryId: "reception",
      title: "Lịch gộp " + randomUUID(),
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
      settings: defaultScheduleSettings("reception"),
      events: [
        {
          id: randomUUID(),
          date: "2026-11-08",
          title: "Tiếp tân sáng",
          responsibilities: [
            {
              id: randomUUID(),
              name: "Tiếp tân",
              assignments: [
                { memberId: first, notes: "" },
                { memberId: second, notes: "Ghi chú được giữ" },
              ],
            },
          ],
        },
      ],
      requestId: randomUUID(),
    });
    await db.query(
      "INSERT INTO church.schedule_manager_permissions(member_id,category_id,is_active) VALUES($1,'reception',false),($2,'reception',true)",
      [first, second],
    );
    return transitionSchedule(
      db,
      actor,
      draft.id,
      { version: draft.version },
      "publish",
    );
  });
  await pool().query(
    "INSERT INTO church.reception_team(member_id,eligibility,created_by) VALUES($1,'male',$2),($3,'male_deacon',$3)",
    [first, admin, second],
  );
  const preview = await plan([first, second]);
  await transaction(async (db) =>
    mergeMembers(db, (await actorById(db, admin))!, {
      ids: [first, second],
      previewToken: preview.previewToken,
    }),
  );
  const assignment = (
    await pool().query(
      "SELECT a.member_id,a.notes FROM church.schedule_assignments a JOIN church.schedule_responsibilities r ON r.id=a.responsibility_id JOIN church.schedule_events e ON e.id=r.event_id WHERE e.schedule_id=$1",
      [schedule.id],
    )
  ).rows;
  assert.equal(assignment.length, 1);
  assert.equal(assignment[0].member_id, first);
  assert.equal(assignment[0].notes, "Ghi chú được giữ");
  assert.equal(
    (
      await pool().query(
        "SELECT eligibility FROM church.reception_team WHERE member_id=$1",
        [first],
      )
    ).rows[0].eligibility,
    "male",
  );
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.reception_team WHERE member_id=$1",
        [second],
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT is_active FROM church.schedule_manager_permissions WHERE member_id=$1",
        [first],
      )
    ).rows[0].is_active,
    true,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT member_id FROM church.schedule_notifications WHERE schedule_id=$1",
        [schedule.id],
      )
    ).rows.length,
    1,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT member_id FROM church.schedule_member_state WHERE schedule_id=$1",
        [schedule.id],
      )
    ).rows[0].member_id,
    first,
  );
});
