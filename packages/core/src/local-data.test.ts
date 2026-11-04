import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { demo, orgs, viewerId } from "./demo";
import {
  DirectoryQuerySchema,
  getDirectoryMember,
  getMyProfile,
  listDirectory,
} from "./directory";
import { departments } from "./catalog";
const fixturePath = new URL(
  "../../../.local-data/believers.json",
  import.meta.url,
);
test(
  "local fixture validates, paginates all source rows, and keeps test permissions separate",
  { skip: !existsSync(fixturePath) },
  async () => {
    const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
    const org = demo.loadLocalDataset(fixture);
    const first = await listDirectory(org, DirectoryQuerySchema.parse({}));
    assert.equal(first.total, fixture.report.importedRecords);
    assert.equal(first.items.length, 12);
    const ids = new Set<string>();
    let page: number | undefined = 1;
    while (page) {
      const result = await listDirectory(
        org,
        DirectoryQuerySchema.parse({ page, pageSize: 50 }),
      );
      for (const m of result.items) {
        assert.equal(m.user.email, null);
        assert.equal(m.role, "member");
        assert.equal(m.membershipDateKnown, false);
        assert.equal(m.testAccount, false);
        assert.ok(m.source);
        assert.equal(m.faithDate, m.source.faithDate || null);
        assert.equal(m.baptismDate, m.source.baptismDate || null);
        assert.ok(!ids.has(m.id));
        ids.add(m.id);
      }
      page = result.nextPage;
    }
    assert.equal(ids.size, fixture.report.importedRecords);
    const profile = await getMyProfile(org);
    assert.equal(profile.userId, viewerId);
    assert.equal(profile.role, "admin");
    assert.equal(profile.testAccount, true);
    assert.ok(!ids.has(profile.id));
    assert.ok(
      fixture.departments.every((d: { id: string }) =>
        departments.some((c) => c.id === d.id),
      ),
    );
    const target = first.items.find((m) => m.departments.length > 0 && m.area)!;
    const filtered = await listDirectory(
      org,
      DirectoryQuerySchema.parse({
        departmentIds: target.departments.map((d) => d.id),
        area: target.area,
      }),
    );
    assert.ok(filtered.total > 0);
    const detail = await getDirectoryMember(org, target.id);
    assert.equal(detail.source?.row, fixture.profiles[target.id].source.row);
    for (const relative of detail.family?.members ?? []) {
      assert.ok(ids.has(relative.id));
      assert.ok(relative.name);
    }
    assert.equal((await demo.get(orgs[0].id)).members.length, 96);
  },
);
test("invalid local imports roll back added departments and reject cross-tenant families", () => {
  const id = "10000000-0000-4000-8000-000000000099";
  assert.throws(() =>
    demo.loadLocalDataset({
      revision: "0123456789abcdef",
      organization: { id, name: "Test organization", short: "T" },
      departments: [{ id: "bad-local-test", name: "Ban kiểm thử" }],
      members: [],
      profiles: {},
    }),
  );
  assert.equal(
    departments.some((d) => d.id === "bad-local-test"),
    false,
  );
  assert.equal(
    orgs.some((o) => o.id === id),
    false,
  );
});
