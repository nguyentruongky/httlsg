import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  SCHEDULE_CATEGORIES,
  ScheduleCreate,
  ScheduleDraft,
  defaultScheduleSettings,
  copyScheduleDraft,
  assignmentSignatures,
  affectedAssignments,
  scheduleTableSections,
  scheduleDutyText,
  type ScheduleRecord,
} from "./schedules";
const person = randomUUID(),
  other = randomUUID();
function draft() {
  return ScheduleDraft.parse({
    categoryId: "prayer_guidance",
    title: "Lịch cầu nguyện",
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
    settings: defaultScheduleSettings("prayer_guidance"),
    events: [
      {
        id: randomUUID(),
        date: "2026-11-08",
        title: "Cầu nguyện",
        startTime: "06:30",
        responsibilities: [
          {
            id: randomUUID(),
            name: "Hướng dẫn",
            assignments: [{ memberId: person, notes: "Ghi chú riêng" }],
          },
        ],
      },
    ],
  });
}
test("four categories share one model; prayer defaults configurable, communion has no invented duties", () => {
  assert.equal(SCHEDULE_CATEGORIES.length, 4);
  assert.equal(defaultScheduleSettings("prayer_guidance").weekdayTime, "05:30");
  assert.equal(defaultScheduleSettings("prayer_guidance").sundayTime, "06:30");
  assert.deepEqual(
    SCHEDULE_CATEGORIES.find((x) => x.id === "communion_duty")!.duties,
    [],
  );
});
test("aggregate validation rejects out-of-period dates, duplicate assignments, invalid times and duplicate events", () => {
  const d = draft();
  assert.equal(
    ScheduleCreate.safeParse({ ...d, requestId: randomUUID() }).success,
    true,
  );
  assert.equal(
    ScheduleDraft.safeParse({ ...d, periodEnd: "2026-11-01" }).success,
    false,
  );
  d.events[0].endTime = "05:30";
  assert.equal(ScheduleDraft.safeParse(d).success, false);
  d.events[0].endTime = null;
  d.events[0].responsibilities[0].assignments.push({
    memberId: person,
    notes: "",
  });
  assert.equal(ScheduleDraft.safeParse(d).success, false);
  assert.equal(
    ScheduleDraft.safeParse({
      ...draft(),
      events: [...draft().events, ...draft().events],
    }).success,
    false,
  );
});
test("copy maps Sunday to Sunday, generates fresh IDs, preserves source, and optionally removes people/duties", () => {
  const d = draft(),
    snapshot = JSON.stringify(d),
    input = {
      periodStart: "2026-12-01",
      periodEnd: "2026-12-31",
      title: "Lịch tháng 12",
      method: "weekday_pattern" as const,
      copyAssignments: true,
      copyResponsibilities: true,
      skipUnmatched: false,
      requestId: randomUUID(),
      sourceVersion: 1,
    };
  const c = copyScheduleDraft(d, input);
  assert.equal(c.draft.events[0].date, "2026-12-13");
  assert.notEqual(c.draft.events[0].id, d.events[0].id);
  assert.equal(JSON.stringify(d), snapshot);
  assert.equal(
    copyScheduleDraft(d, { ...input, method: "exact_offset" }).draft.events[0]
      .date,
    "2026-12-08",
  );
  assert.equal(
    copyScheduleDraft(d, { ...input, copyAssignments: false }).draft.events[0]
      .responsibilities[0].assignments.length,
    0,
  );
  assert.equal(
    copyScheduleDraft(d, { ...input, copyResponsibilities: false }).draft
      .events[0].responsibilities.length,
    0,
  );
  assert.equal(
    copyScheduleDraft(d, { ...input, periodEnd: "2026-12-02" }).issues.length,
    1,
  );
});
test("affected-member diff includes teams, deduplicates direct/team assignments and never includes others private notes", () => {
  const d = draft();
  d.events[0].responsibilities[0].departmentIds = ["ban-thanh-nien"];
  const groups = new Map([["ban-thanh-nien", [person, other]]]);
  const before = assignmentSignatures(d, groups);
  assert.equal(before.size, 2);
  assert.equal(JSON.parse(before.get(person)!).length, 1);
  assert.equal(before.get(other)!.includes("Ghi chú riêng"), false);
  d.events[0].responsibilities[0].assignments[0].notes = "Thay đổi";
  assert.deepEqual(
    affectedAssignments(before, assignmentSignatures(d, groups)),
    [{ memberId: person, kind: "changed" }],
  );
  assert.equal(affectedAssignments(before, before).length, 0);
  assert.equal(
    affectedAssignments(before, new Map()).every((x) => x.kind === "removed"),
    true,
  );
});
test("print sections and duty text preserve Vietnamese names, notes and unassigned indicators", () => {
  const d = draft() as ScheduleRecord;
  d.memberNames = { [person]: "Nguyễn Văn An" };
  d.departmentNames = {};
  assert.match(
    scheduleDutyText(d, d.events[0].responsibilities[0]),
    /Nguyễn Văn An.*Ghi chú riêng/,
  );
  assert.equal(scheduleDutyText(d, undefined), "—");
  d.events[0].responsibilities[0].assignments = [];
  assert.equal(
    scheduleDutyText(d, d.events[0].responsibilities[0]),
    "Chưa phân công",
  );
  assert.ok(scheduleTableSections(d).length);
});

test("schedule notification routes are restricted to the own-assignment page and retained through login", async () => {
  const { PushPayload, memberNotificationHash } = await import("./push");
  const payload = {
    title: "Lịch phân công mới",
    body: "Mở ứng dụng để xem.",
    url: "/client#/assignments",
    tag: "schedule:test",
    type: "schedule",
    referenceId: randomUUID(),
  };
  assert.equal(PushPayload.safeParse(payload).success, true);
  assert.equal(
    PushPayload.safeParse({ ...payload, url: "/dashboard/schedules" }).success,
    false,
  );
  assert.equal(
    PushPayload.safeParse({
      ...payload,
      url: "https://outside.test/client#/assignments",
    }).success,
    false,
  );
  assert.equal(memberNotificationHash("#/assignments"), "#/assignments");
});
