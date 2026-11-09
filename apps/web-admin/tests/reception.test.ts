import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import JSZip from "jszip";
import { addReceptionExtraService } from "@org/core";
import { pool, transaction } from "../lib/server/db";
import { actorById, createSession } from "../lib/server/session";
import { hashPassword } from "../lib/server/password";
import { GET as team, PUT as saveTeam } from "../app/api/reception-team/route";
import { POST as generate } from "../app/api/schedules/reception-generate/route";
import {
  GET as getPlan,
  PUT as editPlan,
} from "../app/api/schedules/[id]/route";
import { POST as create } from "../app/api/schedules/route";
import { POST as publish } from "../app/api/schedules/[id]/publish/route";
import { POST as previewWord } from "../app/api/schedules/export-preview/route";
import { POST as word } from "../app/api/schedules/[id]/export/route";
const ids: Record<string, string> = {},
  tokens: Record<string, string> = {};
let saved: any, preview: any;
function req(path: string, method = "GET", data?: unknown, role = "manager") {
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
before(async () => {
  const hash = await hashPassword("Reception-test-password!");
  for (const role of [
    "admin",
    "manager",
    "prayer",
    "member",
    "woman",
    "unknown",
    "outsider",
  ]) {
    ids[role] = randomUUID();
    await pool().query(
      "INSERT INTO church.member_profiles(id,email,full_name,role_id,gender) VALUES($1,$2,$3,$4,$5)",
      [
        ids[role],
        `reception-${role}@example.test`,
        `Tiếp tân ${role}`,
        role === "admin" ? "admin" : "user",
        role === "woman" ? "Nữ" : role === "unknown" ? "" : "Nam",
      ],
    );
    await pool().query(
      "INSERT INTO church.users(id,email,full_name,role_id,password_hash,is_password_set) VALUES($1,$2,$3,$4,$5,true)",
      [
        ids[role],
        `reception-${role}@example.test`,
        `Tiếp tân ${role}`,
        role === "admin" ? "admin" : "user",
        hash,
      ],
    );
    tokens[role] = await transaction(async (db) =>
      createSession(db, (await actorById(db, ids[role]))!),
    );
  }
  await pool().query(
    "INSERT INTO church.schedule_manager_permissions(member_id,category_id) VALUES($1,'reception'),($2,'prayer_guidance')",
    [ids.manager, ids.prayer],
  );
  await pool().query(
    "INSERT INTO church.departments(id,name) VALUES('reception-test-deacons','Ban Chấp sự'),('reception-test-team','Ban Tiếp tân – Trật tự')",
  );
  await pool().query(
    "INSERT INTO church.department_members(department_id,user_id) VALUES('reception-test-deacons',$1),('reception-test-team',$1),('reception-test-team',$2),('reception-test-team',$3)",
    [ids.member, ids.woman, ids.unknown],
  );
  // A legacy manual roster entry must never add an outsider to generation.
  await pool().query(
    "INSERT INTO church.reception_team(member_id,eligibility) VALUES($1,'male_deacon')",
    [ids.outsider],
  );
});
after(() => pool().end());
test("reception roster is the deduplicated union of the two departments; authorization and read-only source are enforced", async () => {
  for (const role of ["member", "prayer"]) {
    assert.equal(
      (await team(req("/api/reception-team", "GET", undefined, role))).status,
      403,
    );
    assert.equal(
      (
        await generate(
          req(
            "/api/schedules/reception-generate",
            "POST",
            { month: "2026-11", token: "0".repeat(64) },
            role,
          ),
        )
      ).status,
      403,
    );
  }
  assert.equal(
    (await team(req("/api/reception-team", "GET", undefined, "none"))).status,
    401,
  );
  saved = await json(await team(req("/api/reception-team")));
  assert.equal(saved.items.length, 3);
  assert.equal(
    saved.items.filter((p: any) => p.memberId === ids.member).length,
    1,
  );
  assert.equal(
    saved.items.find((p: any) => p.memberId === ids.member).eligibility,
    "male_deacon",
  );
  assert.equal(
    saved.items.find((p: any) => p.memberId === ids.woman).eligibility,
    "female",
  );
  assert.equal(
    saved.items.find((p: any) => p.memberId === ids.unknown).eligibility,
    "",
  );
  assert.equal(
    saved.items.some((p: any) => p.memberId === ids.outsider),
    false,
  );
  assert.equal(
    (
      await saveTeam(
        req("/api/reception-team", "PUT", {
          token: saved.token,
          members: [{ memberId: ids.outsider, eligibility: "male_deacon" }],
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await pool().query("SELECT role_id FROM church.users WHERE id=$1", [
        ids.member,
      ])
    ).rows[0].role_id,
    "user",
  );
});
test("monthly preview uses current department membership and profile genders, warns about missing data, and saves nothing", async () => {
  const before = (
    await pool().query("SELECT count(*)::int n FROM church.schedules")
  ).rows[0].n;
  assert.equal(
    (
      await generate(
        req("/api/schedules/reception-generate", "POST", {
          month: "2026-13",
          token: saved.token,
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await generate(
        req("/api/schedules/reception-generate", "POST", {
          month: "2026-11",
          token: "0".repeat(64),
        }),
      )
    ).status,
    409,
  );
  preview = await json(
    await generate(
      req("/api/schedules/reception-generate", "POST", {
        month: "2026-11",
        token: saved.token,
      }),
    ),
  );
  assert.equal(preview.draft.events.length, 10);
  assert.equal(preview.required, 80);
  assert.ok(
    preview.warnings.some((w: string) => w.includes("Tiếp tân unknown")),
  );
  assert.deepEqual(
    preview.counts.map((p: any) => p.memberId).sort(),
    [ids.member, ids.woman].sort(),
  );
  assert.equal(
    (await pool().query("SELECT count(*)::int n FROM church.schedules")).rows[0]
      .n,
    before,
  );
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.schedule_notifications WHERE member_id=$1",
        [ids.member],
      )
    ).rows[0].n,
    0,
  );
});
test("generated assignments remain editable normal drafts and published DOCX retains grouped headers", async () => {
  const draft = structuredClone(preview.draft);
  draft.events[0].description = "Ghi chú chỉnh sửa của trưởng ban";
  let plan = await json(
    await create(
      req("/api/schedules", "POST", { ...draft, requestId: randomUUID() }),
    ),
  );
  assert.equal(plan.status, "draft");
  assert.equal(plan.events[0].description, "Ghi chú chỉnh sửa của trưởng ban");
  const context = { params: Promise.resolve({ id: plan.id }) };
  plan = await json(
    await publish(
      req("/api/schedules/" + plan.id + "/publish", "POST", {
        version: plan.version,
      }),
      context,
    ),
  );
  const response = await word(
    req("/api/schedules/" + plan.id + "/export", "POST", {
      version: plan.version,
    }),
    context,
  );
  assert.equal(response.status, 200);
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const xml = await zip.file("word/document.xml")!.async("string");
  for (const label of [
    "Cửa chính",
    "Phòng trung lão",
    "Gác lửng",
    "Phòng nhóm phụ",
    "Sáng",
    "Tối",
  ])
    assert.ok(xml.includes(label));
  assert.match(xml, /gridSpan w:val="4"/);
});
test("cell text persists verbatim, exports correctly, preserves links, and is hidden from personal scoped views", async () => {
  const draft = structuredClone(preview.draft);
  draft.title += " · Ô chỉnh sửa";
  for (const event of draft.events) {
    event.id = randomUUID();
    for (const duty of event.responsibilities) duty.id = randomUUID();
  }
  const duty = draft.events[0].responsibilities[0];
  duty.displayText = "CS Minh Quân\nÔ. Tấn Kiệt\n";
  // Keep the member assigned to the tested duty even if shortage allocation chose another position.
  duty.assignments = [{ memberId: ids.member, notes: "Nam chấp sự" }];
  let plan = await json(
    await create(
      req("/api/schedules", "POST", { ...draft, requestId: randomUUID() }),
    ),
  );
  const context = { params: Promise.resolve({ id: plan.id }) };
  const fetched = await json(
    await getPlan(req("/api/schedules/" + plan.id), context),
  );
  assert.equal(
    fetched.events[0].responsibilities[0].displayText,
    duty.displayText,
  );
  assert.equal(
    fetched.events[0].responsibilities[0].assignments[0].memberId,
    ids.member,
  );
  plan = await json(
    await publish(
      req("/api/schedules/" + plan.id + "/publish", "POST", {
        version: plan.version,
      }),
      context,
    ),
  );
  const personal = await json(
    await getPlan(
      req("/api/schedules/" + plan.id, "GET", undefined, "member"),
      context,
    ),
  );
  assert.equal(JSON.stringify(personal).includes("Tấn Kiệt"), false);
  const exported = await word(
    req("/api/schedules/" + plan.id + "/export", "POST", {
      version: plan.version,
    }),
    context,
  );
  assert.equal(exported.status, 200);
  const zip = await JSZip.loadAsync(await exported.arrayBuffer());
  const xml = await zip.file("word/document.xml")!.async("string");
  assert.ok(xml.includes("CS Minh Quân"));
  assert.ok(xml.includes("Ô. Tấn Kiệt"));
  const {
    categoryId,
    title,
    description,
    periodStart,
    periodEnd,
    settings,
    events,
  } = plan;
  events[0].responsibilities[0].displayText = "";
  plan = await json(
    await editPlan(
      req("/api/schedules/" + plan.id, "PUT", {
        categoryId,
        title,
        description,
        periodStart,
        periodEnd,
        settings,
        events,
        version: plan.version,
        notifyAffected: false,
      }),
      context,
    ),
  );
  assert.equal(plan.events[0].responsibilities[0].displayText, "");
});
test("extra weekday service persists, publishes and exports through the existing schedule APIs", async () => {
  const current = await json(await team(req("/api/reception-team")));
  const generated = await json(
    await generate(
      req("/api/schedules/reception-generate", "POST", {
        month: "2026-12",
        token: current.token,
      }),
    ),
  );
  const source = {
    ...generated.draft,
    id: randomUUID(),
    version: 0,
    status: "draft" as const,
    createdBy: null,
    updatedBy: null,
    publishedAt: null,
    cancelledAt: null,
    memberNames: generated.memberNames,
    departmentNames: {},
  };
  const draft = addReceptionExtraService(source, current.items, {
    date: "2026-12-24",
    session: "Tối",
    count: 2,
  });
  const extra = draft.events.find((event) => event.date === "2026-12-24")!;
  extra.responsibilities[0].displayText = "CS Minh Quân\nÔ. Tấn Kiệt";
  for (const [index, duty] of extra.responsibilities.entries())
    if (index > 0) duty.displayText = `Phân công riêng ${duty.name}`;
  const exportInput = { draft, memberNames: generated.memberNames };
  assert.equal(
    (
      await previewWord(
        req("/api/schedules/export-preview", "POST", exportInput, "member"),
      )
    ).status,
    403,
  );
  const beforeCount = (
    await pool().query("SELECT count(*)::int n FROM church.schedules")
  ).rows[0].n;
  const previewResponse = await previewWord(
    req("/api/schedules/export-preview", "POST", exportInput),
  );
  assert.equal(previewResponse.status, 200);
  const previewZip = await JSZip.loadAsync(await previewResponse.arrayBuffer());
  const previewXml = await previewZip
    .file("word/document.xml")!
    .async("string");
  assert.ok(previewXml.includes("24/12/2026"));
  assert.ok(previewXml.includes("Thứ năm"));
  assert.match(
    previewXml,
    /<w:pgSz[^>]*w:w="16838"[^>]*w:h="11906"[^>]*w:orient="landscape"/,
  );
  assert.match(
    previewXml,
    /<w:pgMar[^>]*w:top="567"[^>]*w:right="567"[^>]*w:bottom="567"[^>]*w:left="567"/,
  );
  assert.match(previewXml, /<w:tblLayout w:type="fixed"/);
  assert.ok(previewXml.includes('w:w="15704"'));
  assert.ok(previewXml.includes('w:fill="E8EFEA"'));
  assert.match(previewXml, /w:before="0" w:after="0"/);
  assert.ok(previewXml.includes("w:cantSplit"));
  assert.equal(previewXml.includes("Ngày xuất:"), false);
  assert.equal(previewXml.includes('<w:sz w:val="32"'), true);

  assert.equal((previewXml.match(/>Cửa chính</g) ?? []).length, 1);
  for (const position of ["Phòng trung lão", "Gác lửng", "Phòng nhóm phụ"])
    assert.ok(previewXml.includes(`Phân công riêng ${position}`));
  assert.equal(
    (await pool().query("SELECT count(*)::int n FROM church.schedules")).rows[0]
      .n,
    beforeCount,
  );
  assert.equal(
    (
      await previewWord(
        new Request("http://127.0.0.1:3000/api/schedules/export-preview", {
          method: "POST",
          headers: {
            Origin: "https://untrusted.example",
            Authorization: "Bearer " + tokens.manager,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(exportInput),
        }),
      )
    ).status,
    403,
  );

  let plan = await json(
    await create(
      req("/api/schedules", "POST", { ...draft, requestId: randomUUID() }),
    ),
  );
  const context = { params: Promise.resolve({ id: plan.id }) };
  const fetched = await json(
    await getPlan(req("/api/schedules/" + plan.id), context),
  );
  const stored = fetched.events.find(
    (event: any) => event.date === "2026-12-24",
  );
  assert.equal(stored.session, "Tối");
  assert.equal(
    stored.responsibilities[0].displayText,
    extra.responsibilities[0].displayText,
  );
  assert.equal(
    stored.responsibilities[0].assignments.length,
    extra.responsibilities[0].assignments.length,
  );
  plan = await json(
    await publish(
      req("/api/schedules/" + plan.id + "/publish", "POST", {
        version: plan.version,
      }),
      context,
    ),
  );
  const exported = await word(
    req("/api/schedules/" + plan.id + "/export", "POST", {
      version: plan.version,
    }),
    context,
  );
  assert.equal(exported.status, 200);
  const zip = await JSZip.loadAsync(await exported.arrayBuffer());
  const xml = await zip.file("word/document.xml")!.async("string");
  assert.ok(xml.includes("24/12/2026"));
  for (const position of ["Phòng trung lão", "Gác lửng", "Phòng nhóm phụ"])
    assert.ok(xml.includes(`Phân công riêng ${position}`));
  assert.ok(xml.includes("CS Minh Quân"));
  assert.ok(xml.includes("Ô. Tấn Kiệt"));
});
test("department removal and gender changes invalidate tokens and eligibility; inactive members disappear without rewriting saved plans", async () => {
  await pool().query(
    "DELETE FROM church.department_members WHERE department_id='reception-test-deacons' AND user_id=$1",
    [ids.member],
  );
  let current = await json(await team(req("/api/reception-team")));
  assert.equal(
    current.items.find((p: any) => p.memberId === ids.member).eligibility,
    "male",
  );
  assert.equal(
    (
      await generate(
        req("/api/schedules/reception-generate", "POST", {
          month: "2026-12",
          token: saved.token,
        }),
      )
    ).status,
    409,
  );
  const token = current.token;
  await pool().query(
    "UPDATE church.member_profiles SET gender='Nữ' WHERE id=$1",
    [ids.member],
  );
  current = await json(await team(req("/api/reception-team")));
  assert.notEqual(current.token, token);
  assert.equal(
    current.items.find((p: any) => p.memberId === ids.member).eligibility,
    "female",
  );
  await pool().query(
    "UPDATE church.member_profiles SET enabled=false WHERE id=$1",
    [ids.member],
  );
  current = await json(await team(req("/api/reception-team")));
  assert.equal(
    current.items.some((p: any) => p.memberId === ids.member),
    false,
  );
  assert.ok(
    (
      await pool().query(
        "SELECT count(*)::int n FROM church.schedule_assignments WHERE member_id=$1",
        [ids.member],
      )
    ).rows[0].n > 0,
  );
});
