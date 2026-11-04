import test from "node:test";
import assert from "node:assert/strict";
import { demo, orgs, type Snapshot } from "./demo";
import {
  getDirectoryMember,
  getMyProfile,
  listDirectory,
  DirectoryQuerySchema,
  type DirectoryMember,
} from "./directory";
import {
  canEditMemberDetails,
  MemberDetailInputSchema,
  ChurchStatusSchema,
  StoredMemberDetailsSchema,
  type MemberDetailInput,
} from "./schemas";
function fields(m: DirectoryMember): MemberDetailInput {
  return {
    name: m.user.name,
    email: m.user.email ?? "",
    phone: m.phone ?? "",
    dateOfBirth: m.dateOfBirth ?? "",
    address: m.address ?? "",
    occupation: m.occupation ?? "",
    bio: m.bio,
    churchStatus: m.churchStatus ?? "",
    departmentIds: m.departments.map((d) => d.id),
    area: m.area ?? "",
    location: m.location ?? "",
    position: m.position,
    familyName: m.family?.name ?? "",
    familyMembers:
      m.family?.members.map(({ id, relationship }) => ({ id, relationship })) ??
      [],
  };
}
async function withBrowserStore(snapshot: Snapshot, run: () => Promise<void>) {
  const store = new Map([
    [
      `gather-demo-v1:${snapshot.members[0].organizationId}`,
      JSON.stringify(snapshot),
    ],
  ]);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
  });
  try {
    await run();
  } finally {
    Reflect.deleteProperty(globalThis, "localStorage");
  }
}

test("edit permissions require active tenant-scoped admin or appropriate manager", async () => {
  const org = orgs[0].id;
  const admin = await getMyProfile(org);
  const target = (await demo.get(org)).members[1];
  assert.equal(canEditMemberDetails(admin, target), true);
  assert.equal(
    canEditMemberDetails({ ...admin, role: "manager" }, target),
    true,
  );
  assert.equal(
    canEditMemberDetails({ ...admin, role: "manager" }, admin),
    false,
  );
  assert.equal(
    canEditMemberDetails({ ...admin, role: "member" }, target),
    false,
  );
  assert.equal(
    canEditMemberDetails({ ...admin, status: "suspended" }, target),
    false,
  );
  assert.equal(
    canEditMemberDetails({ ...admin, organizationId: orgs[1].id }, target),
    false,
  );
  assert.equal(canEditMemberDetails(undefined, target), false);
});
test("saving profile persists fields, family, department and audit, then rejects stale writes", async () => {
  const org = orgs[0].id;
  const snapshot = await demo.get(org);
  await withBrowserStore(snapshot, async () => {
    const member = await getDirectoryMember(org, snapshot.members[1].id);
    const input = {
      ...fields(member),
      name: "Nguyễn Thị Mai",
      email: "mai@example.org",
      address: "12 đường Hoa Mai",
      occupation: "Giáo viên",
      departmentIds: ["thanh-nien", "truyen-thong"],
      area: "KV3" as const,
      location: "Phường Bến Thành",
      position: "Phụ trách nhóm",
      familyName: "Gia đình Nguyễn",
      familyMembers: [{ id: snapshot.members[3].id, relationship: "Chị gái" }],
    };
    await demo.updateDetails(org, member.id, input, member.version);
    const updated = await getDirectoryMember(org, member.id);
    assert.equal(updated.version, member.version + 1);
    assert.equal(updated.user.name, input.name);
    assert.equal(updated.address, input.address);
    assert.deepEqual(
      updated.departments.map((d) => d.id),
      ["thanh-nien", "truyen-thong"],
    );
    assert.equal(updated.area, "KV3");
    assert.equal(updated.location, "Phường Bến Thành");
    assert.equal(
      updated.family?.members[0].name,
      snapshot.members[3].user.name,
    );
    assert.equal(
      (await demo.get(org)).activity[0].action,
      "Đã cập nhật hồ sơ thành viên",
    );
    const search = await listDirectory(
      org,
      DirectoryQuerySchema.parse({
        search: "nguyen thi mai",
        departmentIds: ["thanh-nien"],
        area: "KV3",
        location: "Phường Bến Thành",
      }),
    );
    assert.equal(search.total, 1);
    assert.equal(search.items[0].id, member.id);
    await assert.rejects(
      demo.updateDetails(
        org,
        member.id,
        { ...input, name: "Tên cũ" },
        member.version,
      ),
      /đã thay đổi/,
    );
    assert.equal(
      (await getDirectoryMember(org, member.id)).user.name,
      input.name,
    );
  });
});
test("save rechecks role, suspended access, tenant and family ownership", async () => {
  const org = orgs[1].id;
  const snapshot = await demo.get(org);
  const target = await getDirectoryMember(org, snapshot.members[1].id);
  const input = fields(target);
  for (const role of ["member", "manager"] as const) {
    const fixture = structuredClone(snapshot);
    fixture.members[0].role = role;
    await withBrowserStore(fixture, async () => {
      if (role === "member")
        await assert.rejects(
          demo.updateDetails(org, target.id, input, 0),
          /không có quyền/,
        );
      else {
        const adminTarget = await getMyProfile(org); // role is manager; use another admin record to exercise protection
        const stored = await demo.get(org);
        stored.members[1].role = "admin";
        await withBrowserStore(stored, async () => {
          await assert.rejects(
            demo.updateDetails(org, target.id, input, 0),
            /không có quyền/,
          );
        });
        assert.equal(adminTarget.role, "manager");
      }
    });
  }
  const suspended = structuredClone(snapshot);
  suspended.members[0].status = "suspended";
  await withBrowserStore(suspended, async () => {
    await assert.rejects(
      demo.updateDetails(org, target.id, input, 0),
      /không có quyền/,
    );
  });
  const foreignId = "20000000-0000-4000-8000-000000000195";
  await withBrowserStore(snapshot, async () => {
    await assert.rejects(
      demo.updateDetails(org, foreignId, input, 0),
      /Không tìm thấy/,
    );
    await assert.rejects(
      demo.updateDetails(
        org,
        target.id,
        { ...input, familyMembers: [{ id: foreignId, relationship: "Anh" }] },
        0,
      ),
      /người thân không hợp lệ/,
    );
    await assert.rejects(
      demo.updateDetails(
        org,
        target.id,
        {
          ...input,
          familyMembers: [{ id: target.id, relationship: "Bản thân" }],
        },
        0,
      ),
      /người thân không hợp lệ/,
    );
    await assert.rejects(
      demo.updateDetails(
        org,
        target.id,
        { ...input, email: snapshot.members[0].user.email! },
        0,
      ),
      /đã được sử dụng/,
    );
  });
});
test("edit schema rejects injected access fields, invalid birth dates and invalid phone numbers", async () => {
  const member = await getMyProfile(orgs[0].id);
  const input = fields(member);
  assert.equal(
    MemberDetailInputSchema.safeParse({ ...input, role: "admin" }).success,
    false,
  );
  assert.equal(
    MemberDetailInputSchema.safeParse({ ...input, dateOfBirth: "2999-01-01" })
      .success,
    false,
  );
  assert.equal(
    MemberDetailInputSchema.safeParse({ ...input, phone: "invalid" }).success,
    false,
  );
  assert.equal(
    MemberDetailInputSchema.safeParse({
      ...input,
      familyName: "",
      familyMembers: [{ id: member.id, relationship: "Người thân" }],
    }).success,
    false,
  );
});

test("legacy single-department drafts keep personal data and retain old taxonomy metadata", async () => {
  const profile = await getMyProfile(orgs[0].id);
  const { departmentIds, area, location, ...legacyFields } = fields(profile);
  const migrated = StoredMemberDetailsSchema.parse({
    version: 3,
    fields: { ...legacyFields, departmentId: "youth" },
  });
  assert.equal(migrated.fields.name, profile.user.name);
  assert.equal(migrated.fields.email, profile.user.email);
  assert.equal(migrated.version, 3);
  assert.equal(migrated.legacyDepartmentId, "youth");
  assert.deepEqual(migrated.fields.departmentIds, []);
  assert.equal(migrated.fields.area, "");
  assert.equal(migrated.fields.location, "");
  assert.equal(
    MemberDetailInputSchema.safeParse({
      ...fields(profile),
      departmentIds: ["thanh-nien", "thanh-nien"],
    }).success,
    false,
  );
});

test("department roles and event dates persist without changing access roles", async () => {
  const org = orgs[0].id;
  const snapshot = await demo.get(org);
  await withBrowserStore(snapshot, async () => {
    const member = await getDirectoryMember(org, snapshot.members[3].id);
    assert.ok(member.departments.length > 1);
    const roles = Object.fromEntries(
      member.departments.map((d, i) => [
        d.id,
        i === 0 ? "Trưởng ban" : "Thư ký",
      ]),
    );
    await demo.updateDetails(
      org,
      member.id,
      {
        ...fields(member),
        departmentRoles: roles,
        faithDate: "1998-03-04",
        baptismDate: "2000-04-05",
      },
      member.version,
    );
    const saved = await getDirectoryMember(org, member.id);
    assert.equal(saved.role, member.role);
    assert.deepEqual(
      Object.fromEntries(saved.departments.map((d) => [d.id, d.position])),
      roles,
    );
    assert.equal(saved.faithDate, "1998-03-04");
    assert.equal(saved.baptismDate, "2000-04-05");
    await demo.updateDetails(
      org,
      member.id,
      {
        ...fields(saved),
        departmentRoles: roles,
        faithDate: "",
        baptismDate: "",
      },
      saved.version,
    );
    assert.equal((await getDirectoryMember(org, member.id)).baptismDate, null);
    assert.equal(
      MemberDetailInputSchema.safeParse({
        ...fields(saved),
        departmentRoles: { "thanh-nien": "Thư ký" },
        departmentIds: [],
      }).success,
      false,
    );
    assert.equal(
      MemberDetailInputSchema.safeParse({
        ...fields(saved),
        faithDate: "2999-01-01",
      }).success,
      false,
    );
  });
});

test("church statuses persist without changing account permissions and reject unknown values", async () => {
  const org = orgs[0].id;
  const snapshot = await demo.get(org);
  await withBrowserStore(snapshot, async () => {
    let member = await getDirectoryMember(org, snapshot.members[3].id);
    const { status: accountStatus, role } = member;
    for (const churchStatus of ChurchStatusSchema.options) {
      await demo.updateDetails(
        org,
        member.id,
        { ...fields(member), churchStatus },
        member.version,
      );
      member = await getDirectoryMember(org, member.id);
      assert.equal(member.churchStatus, churchStatus);
      assert.equal(member.status, accountStatus);
      assert.equal(member.role, role);
    }
    assert.equal(
      MemberDetailInputSchema.safeParse({
        ...fields(member),
        churchStatus: "invalid",
      }).success,
      false,
    );
  });
});
