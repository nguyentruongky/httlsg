import { compareNamesByLastWord } from "./name-sort";
import test from "node:test";
import assert from "node:assert/strict";
import { orgs, viewerId } from "./demo";
import {
  DirectoryQuerySchema,
  getDirectoryMember,
  getMyProfile,
  listDirectory,
} from "./directory";

const query = (input: Partial<Parameters<typeof listDirectory>[1]> = {}) =>
  DirectoryQuerySchema.parse(input);

test("directory paginates a stable, sorted list without duplicates", async () => {
  const org = orgs[0].id;
  const first = await listDirectory(org, query());
  assert.equal(first.items.length, 12);
  assert.equal(first.total, 96);
  assert.equal(first.nextPage, 2);
  const members = [...first.items];
  let page: number | undefined = first.nextPage;
  while (page) {
    const next = await listDirectory(org, query({ page }));
    members.push(...next.items);
    page = next.nextPage;
  }
  assert.equal(members.length, first.total);
  assert.equal(new Set(members.map((m) => m.id)).size, first.total);
  const names = members.map((m) => m.user.name);
  assert.deepEqual(names, [...names].sort(compareNamesByLastWord));
});

test("search and combined filters apply before pagination", async () => {
  const org = orgs[0].id;
  const matches = await listDirectory(
    org,
    query({ search: "  ALEX.MORGAN@EXAMPLE.ORG  " }),
  );
  assert.equal(matches.total, 1);
  assert.equal(matches.items[0].userId, viewerId);
  const filtered = await listDirectory(
    org,
    query({
      departmentIds: ["lao-nien", "tham-vieng"],
      area: "KV1",
      location: "Phường Sài Gòn",
    }),
  );
  assert.equal(filtered.total, 1);
  assert.ok(
    filtered.items.every(
      (m) =>
        m.departments.some((d) => ["lao-nien", "tham-vieng"].includes(d.id)) &&
        m.area === "KV1" &&
        m.location === "Phường Sài Gòn",
    ),
  );
  const empty = await listDirectory(
    org,
    query({ search: "no such person xyz" }),
  );
  assert.equal(empty.total, 0);
  assert.equal(empty.nextPage, undefined);
});

test("member details, family links, and own profile stay within their tenant", async () => {
  const org = orgs[0].id;
  const profile = await getMyProfile(org);
  assert.equal(profile.userId, viewerId);
  assert.ok(
    profile.phone && profile.dateOfBirth && profile.departments[0].name,
  );
  assert.ok(profile.family?.members.length);
  for (const relative of profile.family!.members) {
    const detail = await getDirectoryMember(org, relative.id);
    assert.equal(detail.organizationId, org);
    assert.equal(detail.user.name, relative.name);
  }
  const farPage = await listDirectory(org, query({ page: 2, pageSize: 50 }));
  const tenantOnlyMember = farPage.items.find(
    (m) => Number(m.id.slice(-12)) >= 164,
  )!;
  await assert.rejects(
    getDirectoryMember(orgs[1].id, tenantOnlyMember.id),
    /Không tìm thấy|not available/,
  );
  await assert.rejects(
    getDirectoryMember("10000000-0000-4000-8000-000000000099", profile.id),
    /Không tìm thấy|not available/,
  );
});

test("directory rejects invalid pages and supports aborted requests", async () => {
  assert.equal(DirectoryQuerySchema.safeParse({ page: 0 }).success, false);
  assert.equal(
    DirectoryQuerySchema.safeParse({ pageSize: 1000 }).success,
    false,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(listDirectory(orgs[0].id, query(), controller.signal), {
    name: "AbortError",
  });
});

test("existing browser data keeps access changes while gaining the larger directory", async () => {
  const { demo } = await import("./demo");
  const org = orgs[0].id;
  const existing = await demo.get(org);
  const legacy = {
    ...existing,
    members: existing.members
      .slice(0, 12)
      .map((m, i) => (i === 1 ? { ...m, status: "suspended" } : m)),
  };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) =>
        key === `gather-demo-v1:${org}` ? JSON.stringify(legacy) : null,
    },
  });
  try {
    const page = await listDirectory(org, query());
    assert.equal(page.total, 96);
    const member = await getDirectoryMember(org, legacy.members[1].id);
    assert.equal(member.status, "suspended");
  } finally {
    Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("multiple department matches include secondary memberships and combine with area and location", async () => {
  const org = orgs[0].id;
  const profile = await getMyProfile(org);
  assert.equal(profile.departments.length, 2);
  for (const d of profile.departments) {
    const matches = await listDirectory(
      org,
      query({
        departmentIds: [d.id],
        area: profile.area!,
        location: profile.location!,
      }),
    );
    assert.ok(matches.items.some((m) => m.id === profile.id));
  }
  const unmatched = await listDirectory(
    org,
    query({ area: "KV2", location: profile.location! }),
  );
  assert.equal(unmatched.total, 0);
  const byLocation = await listDirectory(
    org,
    query({ search: "phuong sai gon" }),
  );
  assert.ok(byLocation.items.some((m) => m.id === profile.id));
  assert.equal(
    DirectoryQuerySchema.safeParse({ sort: "name_desc" }).success,
    false,
  );
  assert.equal(
    DirectoryQuerySchema.safeParse({ role: "admin" }).success,
    false,
  );
  assert.equal(
    DirectoryQuerySchema.safeParse({ status: "active" }).success,
    false,
  );
  assert.equal(DirectoryQuerySchema.safeParse({ area: "KV14" }).success, false);
  assert.equal(
    DirectoryQuerySchema.safeParse({ location: "Unknown location" }).success,
    false,
  );
});

test("names use the last word first, handle whitespace, and break equal-name ties by full name", () => {
  const names = ["An Bình", "Z Trần An", "C Lê\tChi  ", "B Nguyễn An", "An"];
  assert.deepEqual(names.sort(compareNamesByLastWord), [
    "An",
    "B Nguyễn An",
    "Z Trần An",
    "An Bình",
    "C Lê\tChi  ",
  ]);
});
