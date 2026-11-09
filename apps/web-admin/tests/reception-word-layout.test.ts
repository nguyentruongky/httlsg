import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  generateReceptionSchedule,
  addReceptionExtraService,
  type ScheduleRecord,
  type ReceptionPerson,
} from "@org/core";
import {
  receptionWordLayout,
  A4_PAGE,
  RECEPTION_WORD_COLUMNS,
  RECEPTION_WORD_MARGIN,
} from "../lib/server/reception-word-layout";
function fixture() {
  const team: ReceptionPerson[] = ["male_deacon", "male", "female"].flatMap(
    (eligibility, group) =>
      Array.from({ length: group === 0 ? 8 : 4 }, (_, index) => ({
        memberId: randomUUID(),
        name: `Nguyễn Hoàng Minh ${group}${index}`,
        eligibility: eligibility as ReceptionPerson["eligibility"],
      })),
  );
  const generated = generateReceptionSchedule("2026-11", team);
  const schedule = {
    ...generated.draft,
    id: randomUUID(),
    version: 0,
    status: "draft",
    createdBy: null,
    updatedBy: null,
    publishedAt: null,
    cancelledAt: null,
    memberNames: generated.memberNames,
    departmentNames: {},
  } as ScheduleRecord;
  return { schedule, team };
}
test("normal five-Sunday month and an extra service fit the conservative A4 page budget", () => {
  const { schedule, team } = fixture();
  const plain = receptionWordLayout(schedule);
  assert.equal(plain.rows.length, 5);
  assert.ok(plain.estimatedHeight <= plain.usableHeight);
  assert.equal(
    RECEPTION_WORD_COLUMNS.reduce((sum, width) => sum + width, 0),
    A4_PAGE.height - 2 * RECEPTION_WORD_MARGIN,
  );
  const extra = addReceptionExtraService(schedule, team, {
    date: "2026-11-24",
    session: "Tối",
    count: 10,
  });
  const result = receptionWordLayout({ ...schedule, ...extra });
  assert.equal(result.rows.length, 6);
  assert.ok(result.estimatedHeight <= result.usableHeight);
  assert.ok(result.fontSize >= 8.5 && result.fontSize <= 11);
  assert.ok(result.rows[5][0].includes("29/11/2026"));
  assert.ok(result.rows.some((row) => row[0].startsWith("Tối\n24/11/2026")));
});
test("large custom text is preserved and never clipped to pretend it fits a page", () => {
  const { schedule } = fixture();
  const text = Array.from(
    { length: 60 },
    (_, index) => `Dòng tự chỉnh sửa ${index}`,
  ).join("\n");
  schedule.events[0].responsibilities[0].displayText = text;
  const result = receptionWordLayout(schedule);
  assert.equal(result.fontSize, 8.5);
  assert.ok(result.estimatedHeight > result.usableHeight);
  assert.equal(result.rows[0][1], text);
});
