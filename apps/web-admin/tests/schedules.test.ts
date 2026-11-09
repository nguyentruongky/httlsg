import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import JSZip from "jszip";
import { pool, transaction } from "../lib/server/db";
import { actorById, createSession } from "../lib/server/session";
import { hashPassword } from "../lib/server/password";
import { ScheduleDraft, defaultScheduleSettings } from "@org/core";
import { GET as categories } from "../app/api/schedule-categories/route";
import {
  GET as leaders,
  PATCH as grant,
} from "../app/api/schedule-leaders/route";
import { GET as lists, POST as create } from "../app/api/schedules/route";
import {
  GET as detail,
  PUT as update,
  DELETE as remove,
} from "../app/api/schedules/[id]/route";
import { POST as publish } from "../app/api/schedules/[id]/publish/route";
import { POST as cancel } from "../app/api/schedules/[id]/cancel/route";
import { POST as copy } from "../app/api/schedules/[id]/copy/route";
import { POST as preview } from "../app/api/schedules/[id]/copy-preview/route";
import { POST as word } from "../app/api/schedules/[id]/export/route";
import { GET as mine } from "../app/api/my-assignments/route";
import { GET as search } from "../app/api/schedule-members/route";
const ids: Record<string, string> = {},
  tokens: Record<string, string> = {};
let plan: any;
const context = (id: string) => ({ params: Promise.resolve({ id }) });
function req(path: string, method = "GET", data?: unknown, role = "admin") {
  return new Request("http://127.0.0.1:3000" + path, {
    method,
    headers: {
      Origin: "http://127.0.0.1:3000",
      Authorization: "Bearer " + (tokens[role] ?? ""),
      "Content-Type": "application/json",
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}
async function json(response: Response, status = 200) {
  const value = await response.json();
  assert.equal(response.status, status, JSON.stringify(value));
  return value;
}
async function notices() {
  return (
    await pool().query(
      "SELECT member_id,kind,schedule_version FROM church.schedule_notifications WHERE schedule_id=$1 ORDER BY created_at,member_id",
      [plan.id],
    )
  ).rows;
}
function editable(value: any) {
  const {
    categoryId,
    title,
    description,
    periodStart,
    periodEnd,
    settings,
    events,
  } = value;
  return ScheduleDraft.parse({
    categoryId,
    title,
    description,
    periodStart,
    periodEnd,
    settings,
    events,
  });
}
function fresh(categoryId = "reception") {
  return {
    ...ScheduleDraft.parse({
      categoryId,
      title: "Lịch tiếp tân tháng 11",
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
      settings: defaultScheduleSettings(categoryId as any),
      events: [
        {
          id: randomUUID(),
          date: "2026-11-08",
          title: "Chương trình sáng",
          responsibilities: [
            {
              id: randomUUID(),
              name: "Tiếp tân",
              assignments: [
                { memberId: ids.member, notes: "Ghi chú riêng A" },
                { memberId: ids.other, notes: "Ghi chú riêng B" },
              ],
            },
          ],
        },
      ],
    }),
    requestId: randomUUID(),
  };
}
before(async () => {
  const password = await hashPassword("Schedule-test-password!");
  for (const role of [
    "admin",
    "secretary",
    "manager",
    "member",
    "other",
    "outsider",
  ]) {
    ids[role] = randomUUID();
    const roleId = ["admin", "secretary"].includes(role) ? role : "user";
    await pool().query(
      "INSERT INTO church.member_profiles(id,email,full_name,role_id) VALUES($1,$2,$3,$4)",
      [ids[role], `schedule-${role}@example.test`, `Phục vụ ${role}`, roleId],
    );
    await pool().query(
      "INSERT INTO church.users(id,email,full_name,role_id,password_hash,is_password_set) VALUES($1,$2,$3,$4,$5,true)",
      [
        ids[role],
        `schedule-${role}@example.test`,
        `Phục vụ ${role}`,
        roleId,
        password,
      ],
    );
    tokens[role] = await transaction(async (db) =>
      createSession(db, (await actorById(db, ids[role]))!),
    );
  }
});
after(() => pool().end());
test("schedule APIs require login; administrators grant category-specific permissions to existing members only", async () => {
  assert.equal(
    (
      await categories(
        req("/api/schedule-categories", "GET", undefined, "none"),
      )
    ).status,
    401,
  );
  assert.equal(
    (await json(await categories(req("/api/schedule-categories")))).items
      .length,
    4,
  );
  assert.equal(
    (
      await json(
        await categories(
          req("/api/schedule-categories", "GET", undefined, "secretary"),
        ),
      )
    ).items.length,
    4,
  );
  assert.equal(
    (
      await json(
        await categories(
          req("/api/schedule-categories", "GET", undefined, "manager"),
        ),
      )
    ).items.length,
    0,
  );
  const state = await json(
    await leaders(req("/api/schedule-leaders?memberId=" + ids.manager)),
  );
  const input = {
    memberId: ids.manager,
    categoryIds: ["reception"],
    active: true,
    token: state.token,
  };
  assert.equal(
    (await grant(req("/api/schedule-leaders", "PATCH", input, "manager")))
      .status,
    403,
  );
  await json(await grant(req("/api/schedule-leaders", "PATCH", input)));
  assert.equal(
    (await grant(req("/api/schedule-leaders", "PATCH", input))).status,
    409,
  );
  assert.deepEqual(
    (
      await json(
        await categories(
          req("/api/schedule-categories", "GET", undefined, "manager"),
        ),
      )
    ).items.map((x: any) => x.id),
    ["reception"],
  );
  assert.equal(
    (
      await create(
        req("/api/schedules", "POST", fresh("communion_duty"), "manager"),
      )
    ).status,
    403,
  );
});
test("draft saving is idempotent and private, validates aggregates, and does not notify", async () => {
  const payload = fresh();
  plan = await json(
    await create(req("/api/schedules", "POST", payload, "manager")),
  );
  assert.equal(plan.status, "draft");
  assert.equal(
    (
      await json(
        await create(req("/api/schedules", "POST", payload, "manager")),
      )
    ).id,
    plan.id,
  );
  assert.equal(
    (
      await create(
        req("/api/schedules", "POST", { ...payload, title: "Khác" }, "manager"),
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await detail(
        req("/api/schedules/" + plan.id, "GET", undefined, "member"),
        context(plan.id),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await json(
        await mine(
          req("/api/my-assignments?view=all", "GET", undefined, "member"),
        ),
      )
    ).items.length,
    0,
  );
  assert.equal(
    (
      await word(
        req("/api/schedules/" + plan.id + "/export", "POST", {
          version: plan.version,
        }),
        context(plan.id),
      )
    ).status,
    403,
  );
  assert.equal((await notices()).length, 0);
  const bad = fresh();
  bad.events[0].date = "2027-01-01";
  assert.equal((await create(req("/api/schedules", "POST", bad))).status, 400);
});
test("publish notifies assigned people exactly once; members see only own assignments/notes", async () => {
  plan = await json(
    await publish(
      req(
        "/api/schedules/" + plan.id + "/publish",
        "POST",
        { version: plan.version },
        "manager",
      ),
      context(plan.id),
    ),
  );
  assert.equal(plan.status, "published");
  assert.equal((await notices()).length, 2);
  await json(
    await publish(
      req(
        "/api/schedules/" + plan.id + "/publish",
        "POST",
        { version: plan.version },
        "manager",
      ),
      context(plan.id),
    ),
  );
  assert.equal((await notices()).length, 2);
  const own = await json(
    await mine(req("/api/my-assignments?view=all", "GET", undefined, "member")),
  );
  assert.equal(own.items.length, 1);
  assert.equal(own.items[0].notes, "Ghi chú riêng A");
  const visible = await json(
    await detail(
      req("/api/schedules/" + plan.id, "GET", undefined, "member"),
      context(plan.id),
    ),
  );
  assert.equal(JSON.stringify(visible).includes("Ghi chú riêng B"), false);
  assert.equal(
    (
      await detail(
        req("/api/schedules/" + plan.id, "GET", undefined, "outsider"),
        context(plan.id),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await update(
        req(
          "/api/schedules/" + plan.id,
          "PUT",
          { ...editable(plan), version: plan.version },
          "member",
        ),
        context(plan.id),
      )
    ).status,
    403,
  );
});
test("published changes honor explicit notification and only affect the changed person; stale writes fail", async () => {
  const oldVersion = plan.version;
  let data = editable(plan);
  data.events[0].responsibilities[0].assignments[0].notes =
    "Ghi chú A cập nhật";
  plan = await json(
    await update(
      req(
        "/api/schedules/" + plan.id,
        "PUT",
        { ...data, version: plan.version, notifyAffected: true },
        "manager",
      ),
      context(plan.id),
    ),
  );
  assert.equal((await notices()).length, 3);
  assert.equal((await notices()).at(-1).member_id, ids.member);
  assert.equal(
    (
      await update(
        req(
          "/api/schedules/" + plan.id,
          "PUT",
          { ...data, version: oldVersion },
          "manager",
        ),
        context(plan.id),
      )
    ).status,
    409,
  );
  plan = await json(
    await update(
      req(
        "/api/schedules/" + plan.id,
        "PUT",
        { ...editable(plan), version: plan.version, notifyAffected: true },
        "manager",
      ),
      context(plan.id),
    ),
  );
  assert.equal((await notices()).length, 3);
  data = editable(plan);
  data.events[0].title = "Tên mới";
  plan = await json(
    await update(
      req(
        "/api/schedules/" + plan.id,
        "PUT",
        { ...data, version: plan.version, notifyAffected: false },
        "manager",
      ),
      context(plan.id),
    ),
  );
  assert.equal((await notices()).length, 3);
});
test("copy preview and save produce a new draft with fresh IDs and no notifications; DOCX preserves Vietnamese", async () => {
  const input = {
    periodStart: "2026-12-01",
    periodEnd: "2026-12-31",
    title: "Lịch tiếp tân tháng 12",
    method: "weekday_pattern",
    copyAssignments: true,
    copyResponsibilities: true,
    requestId: randomUUID(),
    sourceVersion: plan.version,
  };
  const p = await json(
    await preview(
      req(
        "/api/schedules/" + plan.id + "/copy-preview",
        "POST",
        input,
        "manager",
      ),
      context(plan.id),
    ),
  );
  assert.equal(p.draft.events[0].date, "2026-12-13");
  const copied = await json(
    await copy(
      req("/api/schedules/" + plan.id + "/copy", "POST", input, "manager"),
      context(plan.id),
    ),
  );
  assert.equal(copied.status, "draft");
  assert.notEqual(copied.events[0].id, plan.events[0].id);
  assert.equal(
    (
      await json(
        await copy(
          req("/api/schedules/" + plan.id + "/copy", "POST", input, "manager"),
          context(plan.id),
        ),
      )
    ).id,
    copied.id,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.schedule_notifications WHERE schedule_id=$1",
        [copied.id],
      )
    ).rows[0].n,
    0,
  );
  const response = await word(
    req(
      "/api/schedules/" + plan.id + "/export",
      "POST",
      { version: plan.version },
      "manager",
    ),
    context(plan.id),
  );
  assert.equal(response.status, 200);
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  assert.match(
    await zip.file("word/document.xml")!.async("string"),
    /Tiếp tân/,
  );
  await json(
    await remove(
      req(
        "/api/schedules/" + copied.id,
        "DELETE",
        { version: copied.version },
        "manager",
      ),
      context(copied.id),
    ),
  );
});
test("search minimizes profile data; revocation is immediate even with existing access token; cancellation informs affected people", async () => {
  const found = await json(
    await search(
      req(
        "/api/schedule-members?categoryId=reception&q=Phục",
        "GET",
        undefined,
        "manager",
      ),
    ),
  );
  assert.ok(found.items.length);
  assert.deepEqual(Object.keys(found.items[0]).sort(), [
    "id",
    "identifier",
    "name",
  ]);
  const state = await json(
    await leaders(req("/api/schedule-leaders?memberId=" + ids.manager)),
  );
  await json(
    await grant(
      req("/api/schedule-leaders", "PATCH", {
        memberId: ids.manager,
        categoryIds: [],
        active: false,
        token: state.token,
      }),
    ),
  );
  assert.equal(
    (
      await detail(
        req("/api/schedules/" + plan.id, "GET", undefined, "manager"),
        context(plan.id),
      )
    ).status,
    404,
  );
  plan = await json(
    await cancel(
      req("/api/schedules/" + plan.id + "/cancel", "POST", {
        version: plan.version,
      }),
      context(plan.id),
    ),
  );
  assert.equal(plan.status, "cancelled");
  assert.equal(
    (await notices()).filter((n: any) => n.kind === "cancelled").length,
    2,
  );
  assert.equal(
    (
      await json(
        await mine(
          req("/api/my-assignments?view=past", "GET", undefined, "member"),
        ),
      )
    ).items[0].status,
    "cancelled",
  );
});

test("atomic submission publishes once and rolls back an invalid new plan without leaving a server draft", async () => {
  const { POST: submit } = await import("../app/api/schedules/submit/route");
  const invalid = {
    ...fresh(),
    title: "Nộp không hợp lệ " + randomUUID(),
    events: [],
  };
  await json(await submit(req("/api/schedules/submit", "POST", invalid)), 400);
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.schedules WHERE request_id=$1",
        [invalid.requestId],
      )
    ).rows[0].n,
    0,
  );
  const input = { ...fresh(), title: "Nộp chính thức " + randomUUID() };
  await json(
    await submit(req("/api/schedules/submit", "POST", input, "member")),
    403,
  );
  const saved = await json(
    await submit(req("/api/schedules/submit", "POST", input)),
  );
  assert.equal(saved.status, "published");
  const again = await json(
    await submit(req("/api/schedules/submit", "POST", input)),
  );
  assert.equal(again.id, saved.id);
  assert.equal(again.version, saved.version);

  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.schedule_notifications WHERE schedule_id=$1",
        [saved.id],
      )
    ).rows[0].n,
    2,
  );
  await json(
    await cancel(
      req("/api/schedules/" + saved.id + "/cancel", "POST", {
        version: saved.version,
      }),
      context(saved.id),
    ),
  );
  await json(await submit(req("/api/schedules/submit", "POST", input)), 409);
});
test("existing server draft submission updates and publishes in one transaction", async () => {
  const { POST: submit } =
    await import("../app/api/schedules/[id]/submit/route");
  const draft = await json(
    await create(
      req("/api/schedules", "POST", {
        ...fresh(),
        title: "Bản cũ nộp " + randomUUID(),
      }),
    ),
  );
  const body = { ...editable(draft), version: draft.version };
  body.events[0].responsibilities = [];
  await json(
    await submit(
      req("/api/schedules/" + draft.id + "/submit", "POST", body),
      context(draft.id),
    ),
    400,
  );
  const untouched = await json(
    await detail(req("/api/schedules/" + draft.id), context(draft.id)),
  );
  assert.equal(untouched.version, draft.version);
  assert.equal(untouched.status, "draft");
  assert.ok(untouched.events[0].responsibilities.length);
  const saved = await json(
    await submit(
      req("/api/schedules/" + draft.id + "/submit", "POST", {
        ...editable(draft),
        version: draft.version,
      }),
      context(draft.id),
    ),
  );
  assert.equal(saved.status, "published");
});
