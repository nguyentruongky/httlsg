import test from "node:test";
import assert from "node:assert/strict";
import { getAge, AgeRangeSchema } from "./age";
import { DirectoryQuerySchema, getMyProfile, listDirectory } from "./directory";
import { demo, orgs } from "./demo";
test("age uses complete birthdays and the Vietnamese calendar date", () => {
  const now = new Date("2026-11-04T05:00:00Z");
  assert.equal(getAge("2008-11-04", now), 18);
  assert.equal(getAge("2008-11-05", now), 17);
  assert.equal(getAge("2026-11-04", now), 0);
  assert.equal(getAge("2008-11-04", new Date("2026-11-03T18:00:00Z")), 18);
  assert.equal(getAge("2004-02-29", new Date("2026-02-28T12:00:00Z")), 21);
  assert.equal(getAge("2004-02-29", new Date("2026-03-01T12:00:00Z")), 22);
  assert.equal(getAge(null, now), null);
  assert.equal(getAge("2026-11-05", now), null);
  assert.equal(getAge("2000-02-30", now), null);
});
test("age bounds validate inclusive and open-ended ranges", () => {
  assert.deepEqual(AgeRangeSchema.parse({}), {
    minAge: null,
    maxAge: null,
    ageUnknownOnly: false,
  });
  assert.equal(
    DirectoryQuerySchema.safeParse({ minAge: 18, maxAge: 18 }).success,
    true,
  );
  assert.equal(AgeRangeSchema.safeParse({ minAge: 60 }).success, true);
  for (const input of [
    { minAge: 35, maxAge: 18 },
    { minAge: -1 },
    { maxAge: 131 },
    { minAge: 18.5 },
  ]) {
    assert.equal(AgeRangeSchema.safeParse(input).success, false);
    assert.equal(DirectoryQuerySchema.safeParse(input).success, false);
  }
});
test("age combines with existing filters and missing birth dates remain visible only without age constraints", async () => {
  const org = orgs[0].id;
  const profile = await getMyProfile(org);
  const age = getAge(profile.dateOfBirth)!;
  const result = await listDirectory(
    org,
    DirectoryQuerySchema.parse({
      minAge: age,
      maxAge: age,
      departmentIds: profile.departments.map((d) => d.id),
      area: profile.area,
      location: profile.location,
    }),
  );
  assert.equal(result.total, 1);
  assert.equal(result.items[0].id, profile.id);
  const above = await listDirectory(
    org,
    DirectoryQuerySchema.parse({ minAge: age + 1 }),
  );
  assert.ok(!above.items.some((m) => m.id === profile.id));
  await demo.updateDetails(
    org,
    profile.id,
    {
      name: profile.user.name,
      email: profile.user.email ?? "",
      phone: profile.phone ?? "",
      dateOfBirth: "",
      address: profile.address ?? "",
      occupation: profile.occupation ?? "",
      bio: profile.bio,
      departmentIds: profile.departments.map((d) => d.id),
      area: profile.area ?? "",
      location: profile.location ?? "",
      position: profile.position,
      familyName: profile.family?.name ?? "",
      familyMembers:
        profile.family?.members.map(({ id, relationship }) => ({
          id,
          relationship,
        })) ?? [],
    },
    0,
  );
  const all = await listDirectory(
    org,
    DirectoryQuerySchema.parse({ search: profile.user.name }),
  );
  assert.equal(all.total, 1);
  const constrained = await listDirectory(
    org,
    DirectoryQuerySchema.parse({ search: profile.user.name, minAge: 0 }),
  );
  assert.equal(constrained.total, 0);
  const missing = await listDirectory(
    org,
    DirectoryQuerySchema.parse({ ageUnknownOnly: true }),
  );
  assert.equal(missing.total, 1);
  assert.equal(missing.items[0].id, profile.id);
  const combined = await listDirectory(
    org,
    DirectoryQuerySchema.parse({
      ageUnknownOnly: true,
      area: profile.area,
      location: profile.location,
      departmentIds: profile.departments.map((d) => d.id),
    }),
  );
  assert.equal(combined.total, 1);
  assert.equal(
    AgeRangeSchema.safeParse({ ageUnknownOnly: true, minAge: 18 }).success,
    false,
  );
  assert.equal(
    DirectoryQuerySchema.safeParse({ ageUnknownOnly: true, maxAge: 50 })
      .success,
    false,
  );
});
