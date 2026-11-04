import test from "node:test";
import assert from "node:assert/strict";
import { OrganizationSchema, TaskSchema, InviteSchema } from "./schemas";
import { demo, orgs, viewerId } from "./demo";
import { workspaceKey } from "./queries";
test("schema rejects inconsistent task completion and invalid invitations", () => {
  assert.equal(
    InviteSchema.safeParse({ name: "A", email: "not-email", role: "owner" })
      .success,
    false,
  );
  assert.equal(
    TaskSchema.safeParse({
      id: viewerId,
      organizationId: orgs[0].id,
      assigneeId: viewerId,
      title: "Check in",
      description: "",
      kind: "check_in",
      status: "completed",
      completedAt: null,
      dueAt: new Date().toISOString(),
      version: 0,
    }).success,
    false,
  );
  assert.equal(OrganizationSchema.safeParse({}).success, false);
});
test("tenant query keys are isolated", () =>
  assert.notDeepEqual(workspaceKey(orgs[0].id), workspaceKey(orgs[1].id)));
test("demo enforces tenant boundaries, self protection and task conflicts", async () => {
  const a = orgs[0].id,
    b = orgs[1].id;
  const before = await demo.get(b);
  const source = await demo.get(a);
  await assert.rejects(
    demo.updateMembers(a, [source.members[0].id], { role: "member" }),
    /own access/,
  );
  await demo.invite(a, {
    name: "Test Person",
    email: "new@example.org",
    role: "member",
  });
  const added = (await demo.get(a)).members.find(
    (m) => m.user.email === "new@example.org",
  )!;
  await assert.rejects(
    demo.updateMembers(b, [added.id], { status: "suspended" }),
    /not found/,
  );
  await assert.rejects(
    demo.invite(a, {
      name: "Duplicate Person",
      email: "NEW@example.org",
      role: "member",
    }),
    /already/,
  );
  await demo.complete(a, source.tasks[0].id, 0);
  await assert.rejects(demo.complete(a, source.tasks[0].id, 0), /changed/);
  assert.deepEqual(await demo.get(b), before);
  assert.equal((await demo.get(a)).activity.length, 2);
});
