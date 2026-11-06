import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool, transaction } from "../lib/server/db";
import { actorById, createSession } from "../lib/server/session";
import { hashPassword } from "../lib/server/password";
import {
  GET,
  POST,
  DELETE,
  PATCH,
} from "../app/api/admin/departments/[id]/members/route";
import { GET as catalog } from "../app/api/admin/departments/route";
const tokens = new Map<string, string>();
const accountIds = new Map<string, string>();
const a = "members-a-" + randomUUID(),
  b = "members-b-" + randomUUID();
const one = randomUUID(),
  two = randomUUID(),
  three = randomUUID(),
  deleted = randomUUID();
const context = (id = a) => ({ params: Promise.resolve({ id }) });
function req(
  method = "GET",
  query = "",
  role = "admin",
  input?: unknown,
  id = a,
  origin = "http://127.0.0.1:3000",
) {
  return new Request(
    "http://127.0.0.1:3000/api/admin/departments/" + id + "/members" + query,
    {
      method,
      headers: {
        Authorization: "Bearer " + (tokens.get(role) ?? ""),
        Origin: origin,
        ...(input ? { "Content-Type": "application/json" } : {}),
      },
      ...(input ? { body: JSON.stringify(input) } : {}),
    },
  );
}
async function data(response: Response, status = 200) {
  const result = await response.json();
  assert.equal(response.status, status, JSON.stringify(result));
  return result;
}
before(async () => {
  const hash = await hashPassword("Department-members-test!123");
  for (const role of [
    "admin",
    "secretary",
    "board",
    "leader",
    "deacon",
    "user",
  ]) {
    const id = randomUUID(),
      email = "dept-" + role + "@example.test";
    await pool().query(
      "INSERT INTO church.member_profiles(id,full_name,email,role_id) VALUES($1,'Department test',$2,$3)",
      [id, email, role],
    );
    await pool().query(
      "INSERT INTO church.users(id,full_name,email,role_id,is_password_set,password_hash) VALUES($1,'Department test',$2,$3,true,$4)",
      [id, email, role, hash],
    );
    accountIds.set(role, id);
    tokens.set(
      role,
      await transaction(async (db) =>
        createSession(db, (await actorById(db, id))!),
      ),
    );
  }
  await pool().query(
    "INSERT INTO church.departments(id,name) VALUES($1,'Ban thử A'),($2,'Ban thử B')",
    [a, b],
  );
  for (const [id, name, phone] of [
    [one, "Nguyễn Văn An", "0969876501"],
    [two, "Trần Bình", "0969876502"],
    [three, "Lê Hòa An", "0969876503"],
    [deleted, "Hồ sơ đã xóa", "0969876504"],
  ])
    await pool().query(
      "INSERT INTO church.member_profiles(id,full_name,phone) VALUES($1,$2,$3)",
      [id, name, phone],
    );
  await pool().query(
    "UPDATE church.member_profiles SET deleted_at=now() WHERE id=$1",
    [deleted],
  );
  await pool().query(
    "INSERT INTO church.department_members(department_id,user_id,position) VALUES($1,$2,'Ban viên lâu năm'),($3,$2,'Giữ nguyên')",
    [a, one, b],
  );
});
after(() => pool().end());
test("Admin can view department roster, scoped search, last-word ordering and member counts", async () => {
  const first = await data(await GET(req(), context()));
  assert.equal(first.total, 1);
  assert.equal(first.items[0].id, one);
  assert.equal(first.items[0].position, "Ban viên lâu năm");
  assert.equal(
    (await data(await GET(req("GET", "?q=khongco"), context()))).total,
    0,
  );
  assert.equal(
    (await data(await GET(req("GET", "?q=Nguyen"), context()))).items[0].id,
    one,
  );
  assert.equal(
    (await data(await GET(req("GET", "?mode=available"), context()))).items
      .length,
    0,
  );
  assert.equal(
    (await data(await GET(req("GET", "?mode=available&q=Tran"), context())))
      .items[0].id,
    two,
  );
  const result = await data(await catalog(req()));
  assert.equal(result.departments.find((d: any) => d.id === a).memberCount, 1);
});
test("adding/removing imported profiles is idempotent, increments profile versions and preserves other memberships", async () => {
  const old = (
    await pool().query(
      "SELECT version FROM church.member_profiles WHERE id=$1",
      [two],
    )
  ).rows[0].version;
  await data(
    await POST(req("POST", "", "admin", { memberId: two }), context()),
  );
  await data(
    await POST(req("POST", "", "admin", { memberId: two }), context()),
  );
  assert.equal(
    (
      await pool().query(
        "SELECT version FROM church.member_profiles WHERE id=$1",
        [two],
      )
    ).rows[0].version,
    old + 1,
  );
  assert.equal(
    (await pool().query("SELECT 1 FROM church.users WHERE id=$1", [two]))
      .rowCount,
    0,
  );
  await data(
    await POST(req("POST", "", "admin", { memberId: three }), context()),
  );
  const page = await data(await GET(req("GET", "?pageSize=1"), context()));
  assert.equal(page.total, 3);
  assert.equal(page.nextPage, 2);
  assert.equal(page.items[0].id, three);
  assert.equal(
    (await data(await GET(req("GET", "?pageSize=1&page=2"), context())))
      .items[0].id,
    one,
  );
  await data(
    await DELETE(req("DELETE", "", "admin", { memberId: one }), context()),
  );
  await data(
    await DELETE(req("DELETE", "", "admin", { memberId: one }), context()),
  );
  assert.equal(
    (
      await pool().query(
        "SELECT position FROM church.department_members WHERE department_id=$1 AND user_id=$2",
        [b, one],
      )
    ).rows[0].position,
    "Giữ nguyên",
  );
  assert.equal(
    (
      await pool().query(
        "SELECT 1 FROM church.member_profiles WHERE id=$1 AND deleted_at IS NULL",
        [one],
      )
    ).rowCount,
    1,
  );
  assert.equal(
    (
      await data(
        await GET(req("GET", "?mode=available&q=0969876501"), context()),
      )
    ).items[0].id,
    one,
  );
});
test("Secretary retains department management while scoped/non-admin roles and foreign origins cannot modify memberships", async () => {
  await data(await GET(req("GET", "", "secretary"), context()));
  await data(
    await POST(req("POST", "", "secretary", { memberId: one }), context()),
  );
  for (const role of ["board", "leader", "deacon", "user", "anonymous"]) {
    const status = role === "anonymous" ? 401 : 403;
    await data(await GET(req("GET", "", role), context()), status);
    await data(
      await POST(req("POST", "", role, { memberId: two }), context()),
      status,
    );
    await data(
      await DELETE(req("DELETE", "", role, { memberId: two }), context()),
      status,
    );
  }
  await data(
    await POST(
      req("POST", "", "admin", { memberId: two }, a, "https://attacker.test"),
      context(),
    ),
    403,
  );
});
test("department membership rejects missing/deleted profiles, arbitrary role writes and invalid query parameters", async () => {
  await data(
    await POST(req("POST", "", "admin", { memberId: deleted }), context()),
    404,
  );
  await data(
    await POST(req("POST", "", "admin", { memberId: randomUUID() }), context()),
    404,
  );
  await data(
    await POST(
      req("POST", "", "admin", { memberId: two, role: "admin" }),
      context(),
    ),
    400,
  );
  await data(await GET(req("GET", "?pageSize=100"), context()), 400);
  await data(await GET(req("GET", "?mode=unknown"), context()), 400);
  await data(
    await GET(
      req("GET", "", "admin", undefined, "missing-department"),
      context("missing-department"),
    ),
    404,
  );
  await data(await GET(req("GET", "?q=%25"), context()));
});

test("ordinary department removal does not revoke independently assigned management roles", async () => {
  const board = accountIds.get("board")!;
  await pool().query(
    "INSERT INTO church.department_members(department_id,user_id) VALUES($1,$2)",
    [a, board],
  );
  await pool().query(
    "INSERT INTO church.department_managers(department_id,user_id) VALUES($1,$2)",
    [a, board],
  );
  await pool().query(
    "INSERT INTO church.member_roles(member_id,role_id,department_id) VALUES($1,'board',$2)",
    [board, a],
  );
  await data(
    await DELETE(req("DELETE", "", "admin", { memberId: board }), context()),
  );
  assert.equal(
    (
      await pool().query(
        "SELECT 1 FROM church.department_managers WHERE user_id=$1 AND department_id=$2",
        [board, a],
      )
    ).rowCount,
    1,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT 1 FROM church.member_roles WHERE member_id=$1 AND department_id=$2",
        [board, a],
      )
    ).rowCount,
    1,
  );
});

test("bulk department moves are atomic and preserve target positions, other memberships and independent management roles", async () => {
  const first = randomUUID(),
    second = randomUUID(),
    outside = randomUUID();
  for (const id of [first, second, outside])
    await pool().query(
      "INSERT INTO church.member_profiles(id,full_name) VALUES($1,'Batch membership profile')",
      [id],
    );
  await pool().query(
    "INSERT INTO church.department_members(department_id,user_id,position) VALUES($1,$3,'Source position'),($1,$4,''),($2,$4,'Existing target position')",
    [a, b, first, second],
  );
  const initial = (
    await pool().query(
      "SELECT version FROM church.member_profiles WHERE id=$1",
      [first],
    )
  ).rows[0].version;
  await data(
    await PATCH(
      req("PATCH", "", "admin", {
        action: "move",
        memberIds: [first, outside],
        targetDepartmentId: b,
      }),
      context(),
    ),
    409,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT 1 FROM church.department_members WHERE department_id=$1 AND user_id=$2",
        [a, first],
      )
    ).rowCount,
    1,
  );
  const input = {
    action: "move",
    memberIds: [first, second],
    targetDepartmentId: b,
  };
  assert.equal(
    (await data(await PATCH(req("PATCH", "", "admin", input), context())))
      .changedCount,
    2,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT 1 FROM church.department_members WHERE department_id=$1 AND user_id=ANY($2::uuid[])",
        [a, [first, second]],
      )
    ).rowCount,
    0,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT position FROM church.department_members WHERE department_id=$1 AND user_id=$2",
        [b, second],
      )
    ).rows[0].position,
    "Existing target position",
  );
  assert.equal(
    (
      await pool().query(
        "SELECT version FROM church.member_profiles WHERE id=$1",
        [first],
      )
    ).rows[0].version,
    initial + 1,
  );
  assert.equal(
    (await data(await PATCH(req("PATCH", "", "admin", input), context())))
      .changedCount,
    0,
  );
  const board = accountIds.get("board")!;
  await pool().query(
    "INSERT INTO church.department_members(department_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
    [a, board],
  );
  await data(
    await PATCH(
      req("PATCH", "", "admin", {
        action: "move",
        memberIds: [board],
        targetDepartmentId: b,
      }),
      context(),
    ),
  );
  assert.equal(
    (
      await pool().query(
        "SELECT 1 FROM church.department_managers WHERE user_id=$1 AND department_id=$2",
        [board, a],
      )
    ).rowCount,
    1,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT 1 FROM church.member_roles WHERE member_id=$1 AND department_id=$2",
        [board, a],
      )
    ).rowCount,
    1,
  );
});
test("bulk add/remove is idempotent and validates all selected profiles before changing membership", async () => {
  const first = randomUUID(),
    second = randomUUID();
  for (const id of [first, second])
    await pool().query(
      "INSERT INTO church.member_profiles(id,full_name) VALUES($1,'Bulk profile')",
      [id],
    );
  const add = { action: "add", memberIds: [first, second] };
  assert.equal(
    (await data(await PATCH(req("PATCH", "", "admin", add), context())))
      .changedCount,
    2,
  );
  assert.equal(
    (await data(await PATCH(req("PATCH", "", "admin", add), context())))
      .changedCount,
    0,
  );
  await data(
    await PATCH(
      req("PATCH", "", "admin", {
        action: "remove",
        memberIds: [first, randomUUID()],
      }),
      context(),
    ),
    404,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT 1 FROM church.department_members WHERE department_id=$1 AND user_id=$2",
        [a, first],
      )
    ).rowCount,
    1,
  );
  await data(
    await PATCH(
      req("PATCH", "", "admin", {
        action: "remove",
        memberIds: [first, second],
      }),
      context(),
    ),
  );
});
test("bulk operations enforce roles, target department and selection limits", async () => {
  const input = { action: "move", memberIds: [two], targetDepartmentId: b };
  for (const role of ["board", "leader", "deacon", "user"])
    await data(await PATCH(req("PATCH", "", role, input), context()), 403);
  await data(
    await PATCH(
      req("PATCH", "", "admin", input, a, "https://attacker.test"),
      context(),
    ),
    403,
  );
  await data(
    await PATCH(
      req("PATCH", "", "admin", { ...input, targetDepartmentId: a }),
      context(),
    ),
    400,
  );
  await data(
    await PATCH(
      req("PATCH", "", "admin", {
        ...input,
        targetDepartmentId: "missing-department",
      }),
      context(),
    ),
    404,
  );
  await data(
    await PATCH(
      req("PATCH", "", "admin", { ...input, memberIds: [] }),
      context(),
    ),
    400,
  );
  await data(
    await PATCH(
      req("PATCH", "", "admin", { ...input, memberIds: [two, two] }),
      context(),
    ),
    400,
  );
  await data(
    await PATCH(
      req("PATCH", "", "admin", {
        ...input,
        memberIds: Array.from({ length: 101 }, () => randomUUID()),
      }),
      context(),
    ),
    400,
  );
});

test("all-profile department search includes both members and nonmembers with accurate membership flags", async () => {
  const roster = await data(
    await GET(req("GET", "?mode=all&q=09698765"), context()),
  );
  assert.ok(
    roster.items.some((item: any) => item.id === one && item.isMember === true),
  );
  assert.ok(roster.items.some((item: any) => item.id === three));
  assert.equal(
    (await data(await GET(req("GET", "?mode=all"), context()))).items.length,
    0,
  );
  const candidate = randomUUID();
  await pool().query(
    "INSERT INTO church.member_profiles(id,full_name) VALUES($1,'Global search candidate')",
    [candidate],
  );
  const result = await data(
    await GET(req("GET", "?mode=all&q=Global%20search%20candidate"), context()),
  );
  assert.equal(result.items[0].id, candidate);
  assert.equal(result.items[0].isMember, false);
});

test("bulk status updates are atomic, idempotent and limited to current department members", async () => {
  const first = randomUUID(),
    second = randomUUID(),
    outside = randomUUID();
  for (const id of [first, second, outside])
    await pool().query(
      "INSERT INTO church.member_profiles(id,full_name) VALUES($1,'Status batch profile')",
      [id],
    );
  await pool().query(
    "INSERT INTO church.department_members(department_id,user_id) SELECT $1,unnest($2::uuid[])",
    [a, [first, second]],
  );
  const input = {
    action: "status",
    memberIds: [first, second],
    status: "Không đi nhóm",
  };
  assert.equal(
    (await data(await PATCH(req("PATCH", "", "admin", input), context())))
      .changedCount,
    2,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT church_status,version FROM church.member_profiles WHERE id=$1",
        [first],
      )
    ).rows[0].church_status,
    "Không đi nhóm",
  );
  const version = (
    await pool().query(
      "SELECT version FROM church.member_profiles WHERE id=$1",
      [first],
    )
  ).rows[0].version;
  assert.equal(
    (await data(await PATCH(req("PATCH", "", "admin", input), context())))
      .changedCount,
    0,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT version FROM church.member_profiles WHERE id=$1",
        [first],
      )
    ).rows[0].version,
    version,
  );
  await data(
    await PATCH(
      req("PATCH", "", "admin", {
        ...input,
        status: "Trung tín",
        memberIds: [first, outside],
      }),
      context(),
    ),
    409,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT church_status FROM church.member_profiles WHERE id=$1",
        [first],
      )
    ).rows[0].church_status,
    "Không đi nhóm",
  );
  await data(
    await PATCH(
      req("PATCH", "", "admin", { ...input, status: "invalid" }),
      context(),
    ),
    400,
  );
  await data(await PATCH(req("PATCH", "", "leader", input), context()), 403);
});
