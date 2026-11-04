import test from "node:test";
import assert from "node:assert/strict";
import { demo, orgs, type Snapshot } from "./demo";
import { getDirectoryMember } from "./directory";
import {
  NoteInputSchema,
  VisitInputSchema,
  type MemberDetailInput,
} from "./schemas";
function input(
  m: Awaited<ReturnType<typeof getDirectoryMember>>,
): MemberDetailInput {
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
    lastVisitDate: m.lastVisitDate ?? "",
  };
}
async function store(snapshot: Snapshot, fn: () => Promise<void>) {
  let saved = JSON.stringify(snapshot);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) =>
        key === `gather-demo-v1:${snapshot.members[0].organizationId}`
          ? saved
          : null,
      setItem: (_key: string, value: string) => {
        saved = value;
      },
    },
  });
  try {
    await fn();
  } finally {
    Reflect.deleteProperty(globalThis, "localStorage");
  }
}
test("notes and visits survive browser persistence and profile edits in newest-first order", async () => {
  const org = orgs[0].id,
    s = await demo.get(org),
    id = s.members[1].id;
  await store(s, async () => {
    await demo.addNote(org, id, { text: "Ghi chú đầu" });
    await demo.addNote(org, id, { text: "Ghi chú mới nhất" });
    await demo.addVisit(org, id, {
      visitedOn: "2025-03-10",
      summary: "Thăm viếng gần đây",
    });
    await demo.addVisit(org, id, {
      visitedOn: "2024-01-02",
      summary: "Thăm viếng trước",
    });
    let m = await getDirectoryMember(org, id);
    assert.deepEqual(
      m.notes.map((n) => n.text),
      ["Ghi chú mới nhất", "Ghi chú đầu"],
    );
    assert.deepEqual(
      m.visitHistory.map((v) => v.visitedOn),
      ["2025-03-10", "2024-01-02"],
    );
    assert.equal(m.lastVisitDate, "2025-03-10");
    assert.equal(m.version, 0);
    await demo.updateDetails(
      org,
      id,
      { ...input(m), occupation: "Nghề kiểm thử" },
      m.version,
    );
    m = await getDirectoryMember(org, id);
    assert.equal(m.notes.length, 2);
    assert.equal(m.visitHistory.length, 2);
    assert.equal(m.occupation, "Nghề kiểm thử");
    assert.equal((await demo.get(org)).activity.length, 5);
  });
});
test("history creation validates input, active permissions, and tenant ownership", async () => {
  const org = orgs[1].id,
    s = await demo.get(org),
    id = s.members[1].id;
  assert.equal(NoteInputSchema.safeParse({ text: "   " }).success, false);
  assert.equal(
    NoteInputSchema.safeParse({ text: "x", authorId: s.members[0].userId })
      .success,
    false,
  );
  assert.equal(
    VisitInputSchema.safeParse({ visitedOn: "2999-01-01" }).success,
    false,
  );
  const readonly = structuredClone(s);
  readonly.members[0].role = "member";
  await store(readonly, async () => {
    await assert.rejects(
      demo.addNote(org, id, { text: "Không được lưu" }),
      /không có quyền/,
    );
    await assert.rejects(
      demo.addVisit(org, id, { visitedOn: "2024-01-02" }),
      /không có quyền/,
    );
  });
  await assert.rejects(
    demo.addNote(org, "20000000-0000-4000-8000-000000000195", {
      text: "Sai tổ chức",
    }),
    /Không tìm thấy/,
  );
});
