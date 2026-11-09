import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  generateReceptionSchedule,
  addReceptionExtraService,
  receptionRuleIssues,
  receptionWorkload,
  receptionCellText,
  editReceptionCell,
  RECEPTION_REQUIREMENTS,
  ReceptionMonthInput,
  isReceptionTable,
  receptionTableRows,
  receptionDisplayRows,
  type ReceptionPerson,
} from "./reception";
import { calendarWeekday } from "./calendar";
import type { ScheduleRecord } from "./schedules";
function roster(deacons = 8, men = 4, women = 4) {
  return [
    ["male_deacon", deacons],
    ["male", men],
    ["female", women],
  ].flatMap(([eligibility, count]) =>
    Array.from({ length: Number(count) }, (_, i) => ({
      memberId: randomUUID(),
      name: String(eligibility) + " " + i,
      eligibility,
    })),
  ) as ReceptionPerson[];
}
test("monthly generator covers every Sunday with exact morning/evening requirements and no simultaneous duplicate", () => {
  const team = roster(),
    result = generateReceptionSchedule("2026-11", team);
  assert.equal(result.draft.events.length, 10);
  assert.equal(result.required, 80);
  assert.equal(result.filled, 80);
  assert.equal(result.warnings.length, 0);
  assert.deepEqual(
    [...new Set(result.draft.events.map((e) => e.date))],
    ["2026-11-01", "2026-11-08", "2026-11-15", "2026-11-22", "2026-11-29"],
  );
  for (const event of result.draft.events) {
    assert.equal(calendarWeekday(event.date), 0);
    const ids = event.responsibilities.flatMap((d) =>
      d.assignments.map((a) => a.memberId),
    );
    assert.equal(new Set(ids).size, ids.length);
    for (const duty of event.responsibilities) {
      for (const requirement of RECEPTION_REQUIREMENTS.filter(
        (r) => r.position === duty.name && r.session === event.session,
      )) {
        const people = duty.assignments.map((a) =>
          team.find((p) => p.memberId === a.memberId)!,
        );
        if (requirement.eligibility === "male")
          assert.equal(
            people.filter((p) => p.eligibility !== "female").length,
            RECEPTION_REQUIREMENTS.filter(
              (r) =>
                r.position === duty.name &&
                r.session === event.session &&
                r.eligibility !== "female",
            ).reduce((sum, r) => sum + r.count, 0),
          );
        else if (requirement.eligibility === "female")
          assert.equal(
            people.filter((p) => p.eligibility === "female").length,
            requirement.count,
          );
        else
          assert.ok(
            people.filter((p) => p.eligibility === "male_deacon").length >=
              requirement.count,
          );
      }
    }
  }
});
test("fairness minimizes monthly squared assignment counts under eligibility constraints", () => {
  const team = roster(10, 2, 4),
    result = generateReceptionSchedule("2026-11", team);
  assert.equal(result.filled, 80);
  assert.equal(
    result.counts.every((p) => p.count === 5),
    true,
  );
  assert.equal(
    result.counts.reduce((sum, p) => sum + p.count, 0),
    80,
  );
});
test("shortages stay unfilled and flagged rather than duplicating people or inventing eligible deacons", () => {
  const team = roster(2, 1, 1),
    result = generateReceptionSchedule("2026-02", team);
  assert.equal(result.required, 64);
  assert.ok(result.filled < result.required);
  assert.ok(result.warnings.some((w) => w.includes("nam chấp sự")));
  assert.ok(result.warnings.some((w) => w.includes("nữ")));
  for (const event of result.draft.events) {
    const ids = event.responsibilities.flatMap((d) =>
      d.assignments.map((a) => a.memberId),
    );
    assert.equal(new Set(ids).size, ids.length);
  }
  assert.equal(team.length, 4);
});
test("generator is deterministic for a roster/month, independent of input order, but generates fresh editable IDs", () => {
  const team = roster(),
    first = generateReceptionSchedule("2026-11", team),
    second = generateReceptionSchedule("2026-11", [...team].reverse());
  assert.deepEqual(
    first.draft.events.map((e) => e.responsibilities.map((d) => d.assignments)),
    second.draft.events.map((e) =>
      e.responsibilities.map((d) => d.assignments),
    ),
  );
  assert.notEqual(first.draft.events[0].id, second.draft.events[0].id);
  assert.equal(isReceptionTable({ ...first.draft } as ScheduleRecord), true);
  assert.equal(
    receptionTableRows({ ...first.draft } as ScheduleRecord).length,
    5,
  );
});
test("rejects invalid months, duplicate/empty teams and invalid eligibility; handles four-Sunday month", () => {
  assert.equal(
    ReceptionMonthInput.shape.month.safeParse("2026-13").success,
    false,
  );
  assert.throws(() => generateReceptionSchedule("2026-11", []));
  const team = roster();
  assert.throws(() => generateReceptionSchedule("2026-11", [team[0], team[0]]));
  assert.equal(
    generateReceptionSchedule("2026-02", team).draft.events.length,
    8,
  );
});
test("custom morning duties fall back to the normal table so manually added content is retained", () => {
  const result = generateReceptionSchedule("2026-11", roster());
  const schedule = { ...result.draft } as ScheduleRecord;
  assert.equal(isReceptionTable(schedule), true);
  schedule.events[0].responsibilities[0].name = "Vị trí bổ sung";
  assert.equal(isReceptionTable(schedule), false);
});

test("large eligible roster balances fillable assignments to at most one per member in the month", () => {
  const result = generateReceptionSchedule("2026-11", roster(80, 60, 60));
  assert.equal(result.filled, 80);
  assert.ok(result.counts.every((person) => person.count <= 1));
  assert.equal(result.counts.length, 200);
});

test("reception names are compact honorific names without gender/staffing annotations", async () => {
  const { formatReceptionName, receptionCellText } =
    await import("./reception");
  assert.equal(
    formatReceptionName("Lê Minh Quân", "Nam chấp sự"),
    "CS Minh Quân",
  );
  assert.equal(formatReceptionName("Nguyễn Tấn Kiệt", "Nam"), "Ô. Tấn Kiệt");
  assert.equal(formatReceptionName("Trần Mỹ Hạnh", "Nữ"), "CS Mỹ Hạnh");
  assert.equal(formatReceptionName("Nguyễn Thùy Linh", "Nữ"), "CS Thùy Linh");
  const result = generateReceptionSchedule("2026-11", roster());
  const schedule = {
    ...result.draft,
    memberNames: result.memberNames,
    departmentNames: {},
  } as ScheduleRecord;
  const text = receptionCellText(
    schedule,
    schedule.events.filter(
      (e) => e.date === "2026-11-01" && e.session === "Sáng",
    ),
    "Cửa chính",
  );
  assert.equal(text.split("\n").length, 4);
  assert.ok(
    text
      .split("\n")
      .slice(0, 2)
      .every((line) => line.includes("female")),
  );
  assert.ok(
    text
      .split("\n")
      .slice(2)
      .every((line) => line.includes("male_deacon")),
  );
  assert.equal(text.includes("Nam chấp sự"), false);
  assert.equal(text.includes("2 nữ"), false);
});
test("direct cell edits preserve exact text, linked assignments, other cells, and intentional empty values", async () => {
  const { editReceptionCell, receptionCellText } = await import("./reception");
  const result = generateReceptionSchedule("2026-11", roster()),
    original = JSON.stringify(result.draft);
  const edited = editReceptionCell(
    result.draft,
    "2026-11-01",
    "Sáng",
    "Cửa chính",
    "CS Minh Quân\nÔ. Tấn Kiệt\n",
  );
  const schedule = {
    ...result.draft,
    events: edited,
    memberNames: result.memberNames,
    departmentNames: {},
  } as ScheduleRecord;
  assert.equal(
    receptionCellText(
      schedule,
      edited.filter((e) => e.date === "2026-11-01" && e.session === "Sáng"),
      "Cửa chính",
    ),
    "CS Minh Quân\nÔ. Tấn Kiệt\n",
  );
  assert.equal(JSON.stringify(result.draft), original);
  assert.deepEqual(
    edited[0].responsibilities[0].assignments,
    result.draft.events[0].responsibilities[0].assignments,
  );
  assert.deepEqual(
    edited[0].responsibilities[1],
    result.draft.events[0].responsibilities[1],
  );
  schedule.events = editReceptionCell(
    { ...result.draft, events: edited },
    "2026-11-01",
    "Sáng",
    "Cửa chính",
    "",
  );
  assert.equal(
    receptionCellText(
      schedule,
      schedule.events.filter(
        (e) => e.date === "2026-11-01" && e.session === "Sáng",
      ),
      "Cửa chính",
    ),
    "",
  );
});
test("copy without assignees clears custom cell names; text edits affect only linked assignees notifications", async () => {
  const { copyScheduleDraft, assignmentSignatures, affectedAssignments } =
    await import("./schedules");
  const { editReceptionCell } = await import("./reception");
  const result = generateReceptionSchedule("2026-11", roster()),
    changed = {
      ...result.draft,
      events: editReceptionCell(
        result.draft,
        "2026-11-01",
        "Sáng",
        "Cửa chính",
        "CS Minh Quân",
      ),
    };
  const diff = affectedAssignments(
    assignmentSignatures(result.draft, new Map()),
    assignmentSignatures(changed, new Map()),
  );
  assert.equal(diff.length, 4);
  const copied = copyScheduleDraft(changed, {
    periodStart: "2026-12-01",
    periodEnd: "2026-12-31",
    title: "Bản sao",
    method: "weekday_pattern",
    copyAssignments: false,
    copyResponsibilities: true,
    skipUnmatched: true,
    requestId: randomUUID(),
    sourceVersion: 0,
  });
  assert.equal(copied.draft.events[0].responsibilities[0].displayText, null);
});

test("cell ordering groups women, male deacons, members then Vietnamese given-name alphabet", async () => {
  const { sortReceptionCellText } = await import("./reception");
  const team = [
    {
      memberId: randomUUID(),
      name: "Nguyễn Thùy Linh",
      eligibility: "female" as const,
    },
    {
      memberId: randomUUID(),
      name: "Trần Ngọc Ánh",
      eligibility: "female" as const,
    },
    {
      memberId: randomUUID(),
      name: "Lê Minh Quân",
      eligibility: "male_deacon" as const,
    },
    {
      memberId: randomUUID(),
      name: "Nguyễn Hữu An",
      eligibility: "male_deacon" as const,
    },
    {
      memberId: randomUUID(),
      name: "Nguyễn Tấn Kiệt",
      eligibility: "male" as const,
    },
  ];
  assert.equal(
    sortReceptionCellText(
      "Ô. Tấn Kiệt\nCS Minh Quân\nCS Thùy Linh\nCS Hữu An\nCS Ngọc Ánh",
      team,
    ),
    "CS Ngọc Ánh\nCS Thùy Linh\nCS Hữu An\nCS Minh Quân\nÔ. Tấn Kiệt",
  );
});
test("cell checks flag understaffing, eligibility, ambiguous names and same-session duplication", async () => {
  const { editReceptionCell, receptionRuleIssues } =
    await import("./reception");
  const woman = {
      memberId: randomUUID(),
      name: "Nguyễn Thùy Linh",
      eligibility: "female" as const,
    },
    deacon = {
      memberId: randomUUID(),
      name: "Lê Minh Quân",
      eligibility: "male_deacon" as const,
    },
    member = {
      memberId: randomUUID(),
      name: "Nguyễn Tấn Kiệt",
      eligibility: "male" as const,
    },
    team = [woman, deacon, member];
  const result = generateReceptionSchedule("2026-11", team);
  let draft = result.draft;
  for (const event of draft.events)
    for (const duty of event.responsibilities)
      draft = {
        ...draft,
        events: editReceptionCell(
          draft,
          event.date,
          event.session as "Sáng" | "Tối",
          duty.name,
          "",
        ),
      };
  const view = () =>
    ({
      ...draft,
      memberNames: result.memberNames,
      departmentNames: {},
    }) as ScheduleRecord;
  draft = {
    ...draft,
    events: editReceptionCell(
      draft,
      "2026-11-01",
      "Sáng",
      "Cửa chính",
      "CS Minh Quân",
    ),
  };
  assert.ok(
    receptionRuleIssues(view(), team).some(
      (issue) =>
        issue.position === "Cửa chính" && issue.message.includes("Còn thiếu"),
    ),
  );
  draft = {
    ...draft,
    events: editReceptionCell(
      draft,
      "2026-11-01",
      "Tối",
      "Buổi tối",
      "CS Minh Quân",
    ),
  };
  assert.equal(
    receptionRuleIssues(view(), team).filter((issue) =>
      issue.message.includes("lặp"),
    ).length,
    0,
  );
  draft = {
    ...draft,
    events: editReceptionCell(
      draft,
      "2026-11-01",
      "Sáng",
      "Gác lửng",
      "CS Minh Quân",
    ),
  };
  assert.equal(
    receptionRuleIssues(view(), team).filter((issue) =>
      issue.message.includes("lặp"),
    ).length,
    2,
  );
  draft = {
    ...draft,
    events: editReceptionCell(
      draft,
      "2026-11-01",
      "Sáng",
      "Phòng nhóm phụ",
      "CS Thùy Linh",
    ),
  };
  assert.ok(
    receptionRuleIssues(view(), team).some((issue) =>
      issue.message.includes("không thể xếp"),
    ),
  );
  draft = {
    ...draft,
    events: editReceptionCell(
      draft,
      "2026-11-01",
      "Tối",
      "Buổi tối",
      "Ô. Tấn Kiệt",
    ),
  };
  assert.ok(
    receptionRuleIssues(view(), team).some((issue) =>
      issue.message.includes("không thể xếp"),
    ),
  );
  draft = {
    ...draft,
    events: editReceptionCell(
      draft,
      "2026-11-01",
      "Sáng",
      "Cửa chính",
      "CS Người Ngoài",
    ),
  };
  assert.ok(
    receptionRuleIssues(view(), team).some((issue) =>
      issue.message.includes("không có"),
    ),
  );
  const other = { ...deacon, memberId: randomUUID(), name: "Trần Minh Quân" };
  draft = {
    ...draft,
    events: editReceptionCell(
      draft,
      "2026-11-01",
      "Sáng",
      "Cửa chính",
      "CS Minh Quân",
    ),
  };
  assert.ok(
    receptionRuleIssues(view(), [...team, other]).some((issue) =>
      issue.message.includes("trùng tên"),
    ),
  );
  draft = {
    ...draft,
    events: editReceptionCell(
      draft,
      "2026-11-01",
      "Sáng",
      "Cửa chính",
      "CS Lê Minh Quân",
    ),
  };
  assert.ok(
    !receptionRuleIssues(view(), [...team, other]).some(
      (issue) =>
        issue.position === "Cửa chính" && issue.message.includes("trùng tên"),
    ),
  );
});

test("replacing names checks required gender/deacon mix when the head count is unchanged", async () => {
  const { receptionRuleIssues } = await import("./reception");
  const team = roster(4, 0, 0);
  const schedule = {
    ...generateReceptionSchedule("2026-11", team).draft,
    memberNames: Object.fromEntries(team.map((p) => [p.memberId, p.name])),
    departmentNames: {},
  } as ScheduleRecord;
  schedule.events = [
    {
      id: randomUUID(),
      date: "2026-11-01",
      session: "Sáng",
      title: "Sáng",
      startTime: null,
      endTime: null,
      description: "",
      location: "",
      responsibilities: [
        {
          id: randomUUID(),
          name: "Cửa chính",
          description: "",
          departmentIds: [],
          assignments: team.map((p) => ({
            memberId: p.memberId,
            notes: "Nam chấp sự",
          })),
        },
      ],
    },
  ];
  assert.ok(
    receptionRuleIssues(schedule, team).some(
      (issue) => issue.message === "Còn thiếu 2 nữ.",
    ),
  );
});

test("edited alphabetical ordering retains Vietnamese D and Đ distinctions", async () => {
  const { sortReceptionCellText } = await import("./reception");
  const team = [
    {
      memberId: randomUUID(),
      name: "Nguyễn An Đức",
      eligibility: "male_deacon" as const,
    },
    {
      memberId: randomUUID(),
      name: "Nguyễn An Dũng",
      eligibility: "male_deacon" as const,
    },
  ];
  assert.equal(
    sortReceptionCellText("CS An Đức\nCS An Dũng", team),
    "CS An Dũng\nCS An Đức",
  );
});

test("visible-text workload updates morning/evening totals without changing linked assignments", async () => {
  const { receptionWorkload, editReceptionCell } = await import("./reception");
  const team = roster(6, 2, 2),
    result = generateReceptionSchedule("2026-11", team);
  const schedule = {
    ...result.draft,
    memberNames: result.memberNames,
    departmentNames: {},
  } as ScheduleRecord;
  const before = receptionWorkload(schedule, team);
  assert.equal(before.total, 80);
  assert.equal(before.required, 80);
  assert.equal(
    before.people.reduce((sum, p) => sum + p.morning, 0),
    50,
  );
  assert.equal(
    before.people.reduce((sum, p) => sum + p.evening, 0),
    30,
  );
  const next = {
    ...schedule,
    events: editReceptionCell(
      result.draft,
      "2026-11-01",
      "Sáng",
      "Cửa chính",
      "",
    ),
  };
  assert.equal(receptionWorkload(next, team).total, 76);
  assert.equal(
    receptionWorkload(next, team).people.reduce((sum, p) => sum + p.morning, 0),
    46,
  );
  const { receptionRuleIssues } = await import("./reception");
  assert.equal(receptionRuleIssues(schedule, team).length, 0);
  assert.ok(
    receptionRuleIssues(next, team).some(
      (issue) =>
        issue.position === "Cửa chính" &&
        issue.message === "Còn thiếu 2 nam chấp sự.",
    ),
  );
});

function extraFixture() {
  const team = roster();
  const generated = generateReceptionSchedule("2026-12", team);
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
  return { team, schedule };
}
test("extra Christmas Eve evening prefills least-used members, preserves Sundays and contributes to workload", () => {
  const { team, schedule } = extraFixture();
  const before = receptionWorkload(schedule, team);
  const next = addReceptionExtraService(schedule, team, {
    date: "2026-12-24",
    session: "Tối",
    count: 6,
  });
  const extra = next.events.find((event) => event.date === "2026-12-24")!;
  const ids = extra.responsibilities.flatMap((duty) =>
    duty.assignments.map((person) => person.memberId),
  );
  assert.equal(ids.length, 6);
  assert.equal(new Set(ids).size, 6);
  for (const eligibility of ["female", "male_deacon", "male"]) {
    const chosen = before.people.filter(
      (person) =>
        person.eligibility === eligibility && ids.includes(person.memberId),
    );
    const remaining = before.people.filter(
      (person) =>
        person.eligibility === eligibility && !ids.includes(person.memberId),
    );
    if (chosen.length && remaining.length)
      assert.ok(
        Math.max(...chosen.map((person) => person.total)) <=
          Math.min(...remaining.map((person) => person.total)),
      );
  }
  assert.deepEqual(
    next.events.filter((event) => calendarWeekday(event.date) === 0),
    schedule.events,
  );
  const view = { ...schedule, ...next };
  assert.ok(isReceptionTable(view));
  assert.equal(receptionWorkload(view, team).total, before.total + 6);
  assert.equal(receptionWorkload(view, team).sundays, 4);
  assert.deepEqual(
    receptionRuleIssues(view, team),
    receptionRuleIssues(schedule, team),
  );
  assert.equal(
    receptionTableRows(view).some((row) => row.date === "2026-12-24"),
    true,
  );
});
test("extra weekday services accept any roster category and free edits without Sunday shortages", () => {
  const { schedule } = extraFixture();
  const team = roster(0, 2, 1);
  let next = addReceptionExtraService(schedule, team, {
    date: "2026-12-24",
    session: "Sáng",
    count: 6,
  });
  next = addReceptionExtraService({ ...schedule, ...next }, team, {
    date: "2026-12-24",
    session: "Tối",
    count: 2,
  });
  assert.equal(
    next.events
      .find((event) => event.date === "2026-12-24" && event.session === "Sáng")!
      .responsibilities.reduce((sum, duty) => sum + duty.assignments.length, 0),
    3,
  );
  next = {
    ...next,
    events: editReceptionCell(
      next,
      "2026-12-24",
      "Tối",
      "Cửa chính",
      "Tự sắp xếp\nTheo yêu cầu của trưởng ban",
    ),
  };
  assert.equal(
    next.events.find(
      (event) => event.date === "2026-12-24" && event.session === "Tối",
    )!.responsibilities[0].displayText,
    "Tự sắp xếp\nTheo yêu cầu của trưởng ban",
  );
  const issues = receptionRuleIssues(
    {
      ...schedule,
      ...next,
      memberNames: {
        ...schedule.memberNames,
        ...Object.fromEntries(
          team.map((person) => [person.memberId, person.name]),
        ),
      },
    },
    team,
  );
  assert.equal(
    issues.some((issue) => issue.date === "2026-12-24"),
    false,
  );
  assert.ok(issues.some((issue) => calendarWeekday(issue.date) === 0));
});
test("extra services reject invalid dates, another month, duplicate sessions and invalid headcounts", () => {
  const { team, schedule } = extraFixture();
  for (const date of ["2026-12-32", "2026-11-24", "2026-12-06"])
    assert.throws(() =>
      addReceptionExtraService(schedule, team, {
        date,
        session: "Tối",
        count: 6,
      }),
    );
  for (const count of [0, -1, 1.5, 11, 31, NaN])
    assert.throws(() =>
      addReceptionExtraService(schedule, team, {
        date: "2026-12-24",
        session: "Tối",
        count,
      }),
    );
  assert.throws(() =>
    addReceptionExtraService(schedule, [], {
      date: "2026-12-24",
      session: "Tối",
      count: 6,
    }),
  );
  const next = addReceptionExtraService(schedule, team, {
    date: "2026-12-24",
    session: "Tối",
    count: 6,
  });
  assert.throws(
    () =>
      addReceptionExtraService({ ...schedule, ...next }, team, {
        date: "2026-12-24",
        session: "Tối",
        count: 6,
      }),
    /Buổi này đã có/,
  );
});

test("extra evening has four positions and editing one preserves other position text and legacy data", () => {
  const { schedule, team } = extraFixture();
  const next = addReceptionExtraService(schedule, team, {
    date: "2026-12-24",
    session: "Tối",
    count: 8,
  });
  const extra = next.events.find((event) => event.date === "2026-12-24")!;
  assert.deepEqual(
    extra.responsibilities.map((duty) => duty.name),
    ["Cửa chính", "Phòng trung lão", "Gác lửng", "Phòng nhóm phụ"],
  );
  assert.deepEqual(
    extra.responsibilities.map((duty) => duty.assignments.length),
    [4, 1, 2, 1],
  );
  let events = editReceptionCell(
    next,
    "2026-12-24",
    "Tối",
    "Cửa chính",
    "Nội dung cửa chính",
  );
  events = editReceptionCell(
    { ...next, events },
    "2026-12-24",
    "Tối",
    "Gác lửng",
    "Nội dung gác lửng",
  );
  const edited = events.find((event) => event.date === "2026-12-24")!;
  assert.equal(edited.responsibilities[0].displayText, "Nội dung cửa chính");
  assert.equal(edited.responsibilities[2].displayText, "Nội dung gác lửng");
  assert.deepEqual(edited.responsibilities[1], extra.responsibilities[1]);
  const legacy = {
    ...extra,
    responsibilities: [
      {
        ...extra.responsibilities[0],
        name: "Buổi tối",
        displayText: "Nội dung cũ",
      },
    ],
  };
  const legacyDraft = { ...next, events: [legacy] };
  const { memberNames, departmentNames } = schedule;
  // Old combined evening contents stay in Cửa chính; editing another position never wipes them.
  const legacyEvents = editReceptionCell(
    legacyDraft,
    "2026-12-24",
    "Tối",
    "Phòng nhóm phụ",
    "Nội dung mới",
  );
  const view = {
    ...schedule,
    ...legacyDraft,
    events: legacyEvents,
    memberNames,
    departmentNames,
  };
  assert.equal(
    receptionCellText(view, legacyEvents, "Cửa chính"),
    "Nội dung cũ",
  );
  assert.equal(
    receptionCellText(view, legacyEvents, "Phòng nhóm phụ"),
    "Nội dung mới",
  );
});

test("extra service display rows reuse four morning positions but preserve true evening session and workload", () => {
  const { schedule, team } = extraFixture();
  let next = addReceptionExtraService(schedule, team, {
    date: "2026-12-24",
    session: "Tối",
    count: 4,
  });
  next = addReceptionExtraService({ ...schedule, ...next }, team, {
    date: "2026-12-24",
    session: "Sáng",
    count: 2,
  });
  const view = { ...schedule, ...next };
  const rows = receptionDisplayRows(view);
  const extras = rows.filter((row) => row.date === "2026-12-24");
  assert.deepEqual(
    extras.map((row) => row.extraSession),
    ["Sáng", "Tối"],
  );
  assert.equal(extras[0].positions[0].session, "Sáng");
  assert.equal(extras[1].positions[0].session, "Tối");
  assert.equal(extras[1].positions[0].responsibilities.length, 4);
  assert.equal(rows.filter((row) => row.extraSession === null).length, 4);
  assert.equal(
    receptionWorkload(view, team).people.reduce(
      (sum, person) => sum + person.evening,
      0,
    ),
    receptionWorkload(schedule, team).people.reduce(
      (sum, person) => sum + person.evening,
      0,
    ) + 4,
  );
});

test("automatic extra evenings satisfy morning position rules and avoid ineligible fillers", () => {
  const { schedule, team } = extraFixture();
  const draft = addReceptionExtraService(schedule, team, {
    date: "2026-12-24",
    session: "Tối",
    count: 10,
  });
  const extra = draft.events.find((event) => event.date === "2026-12-24")!;
  assert.deepEqual(
    extra.responsibilities.map((duty) => duty.assignments.length),
    [4, 2, 3, 1],
  );
  const used = extra.responsibilities.flatMap((duty) =>
    duty.assignments.map((person) => person.memberId),
  );
  assert.equal(new Set(used).size, 10);
  for (const duty of extra.responsibilities) {
    const people = duty.assignments.map((assignment) =>
      team.find((person) => person.memberId === assignment.memberId)!,
    );
    for (const rule of RECEPTION_REQUIREMENTS.filter(
      (rule) => rule.session === "Sáng" && rule.position === duty.name,
    )) {
      const count = people.filter((person) =>
        rule.eligibility === "male"
          ? person.eligibility !== "female"
          : person.eligibility === rule.eligibility,
      ).length;
      assert.ok(count >= rule.count);
    }
    if (duty.name !== "Cửa chính")
      assert.equal(
        people.some((person) => person.eligibility === "female"),
        false,
      );
    if (["Cửa chính", "Phòng nhóm phụ"].includes(duty.name))
      assert.equal(
        people.some((person) => person.eligibility === "male"),
        false,
      );
  }
  const woman = team.find((person) => person.eligibility === "female")!;
  const man = team.find((person) => person.eligibility === "male")!;
  let edited = editReceptionCell(
    draft,
    "2026-12-24",
    "Tối",
    "Phòng nhóm phụ",
    woman.name,
  );
  edited = editReceptionCell(
    { ...draft, events: edited },
    "2026-12-24",
    "Tối",
    "Cửa chính",
    man.name,
  );
  const manualIssues = receptionRuleIssues(
    { ...schedule, ...draft, events: edited },
    team,
  ).filter((issue) => issue.date === "2026-12-24");
  assert.ok(manualIssues.some((issue) => issue.message.includes("xếp lặp")));
  assert.equal(
    manualIssues.some(
      (issue) =>
        issue.message.includes("không thể xếp") ||
        issue.message.includes("Còn thiếu"),
    ),
    false,
  );
  const limited = roster(0, 3, 4);
  const shortage = addReceptionExtraService(schedule, limited, {
    date: "2026-12-24",
    session: "Tối",
    count: 10,
  });
  const duties = shortage.events.find(
    (event) => event.date === "2026-12-24",
  )!.responsibilities;
  assert.deepEqual(
    duties.map((duty) => duty.assignments.length),
    [2, 1, 1, 0],
  );
  const unknown = {
    memberId: randomUUID(),
    name: "Chưa rõ giới tính",
    eligibility: "" as const,
  };
  const unknownDraft = addReceptionExtraService(schedule, [unknown], {
    date: "2026-12-24",
    session: "Tối",
    count: 10,
  });
  assert.equal(
    unknownDraft.events
      .find((event) => event.date === "2026-12-24")!
      .responsibilities.flatMap((duty) => duty.assignments).length,
    0,
  );
});

test("duplicate checking always covers extra-service manual edits, aliases, unknown names and every affected position", () => {
  const { schedule, team } = extraFixture();
  const next = addReceptionExtraService(schedule, team, {
    date: "2026-12-24",
    session: "Tối",
    count: 1,
  });
  const person = next.events.find((event) => event.date === "2026-12-24")!
    .responsibilities[0].assignments[0];
  const name = team.find((item) => item.memberId === person.memberId)!.name;
  let events = editReceptionCell(next, "2026-12-24", "Tối", "Gác lửng", name);
  let issues = receptionRuleIssues(
    { ...schedule, ...next, events },
    team,
  ).filter((issue) => issue.date === "2026-12-24");
  assert.deepEqual(
    issues.map((issue) => issue.position).sort(),
    ["Cửa chính", "Gác lửng"].sort(),
  );
  assert.ok(issues.every((issue) => issue.message.includes("xếp lặp")));
  events = editReceptionCell(
    { ...next, events },
    "2026-12-24",
    "Tối",
    "Gác lửng",
    "Tên chưa liên kết\nTên chưa liên kết",
  );
  issues = receptionRuleIssues({ ...schedule, ...next, events }, team).filter(
    (issue) => issue.date === "2026-12-24",
  );
  assert.equal(issues.length, 1);
  assert.equal(issues[0].position, "Gác lửng");
  events = editReceptionCell(
    { ...next, events },
    "2026-12-24",
    "Tối",
    "Gác lửng",
    "",
  );
  assert.equal(
    receptionRuleIssues({ ...schedule, ...next, events }, team).some(
      (issue) => issue.date === "2026-12-24",
    ),
    false,
  );
  const morning = addReceptionExtraService(
    { ...schedule, ...next, events },
    team,
    { date: "2026-12-24", session: "Sáng", count: 1 },
  );
  assert.equal(
    receptionRuleIssues({ ...schedule, ...morning }, team).some(
      (issue) => issue.date === "2026-12-24",
    ),
    false,
  );
});

test("monthly generation balances each deacon's morning/evening split without sacrificing total fairness or coverage", () => {
  for (const month of ["2026-11", "2026-12", "2027-01"]) {
    const team = roster(10, 2, 4);
    const generated = generateReceptionSchedule(month, team);
    assert.equal(generated.filled, generated.required);
    assert.equal(generated.warnings.length, 0);
    const counts = new Map(
      team.map((person) => [person.memberId, { morning: 0, evening: 0 }]),
    );
    for (const event of generated.draft.events) {
      const used = new Set<string>();
      for (const assignment of event.responsibilities.flatMap(
        (duty) => duty.assignments,
      )) {
        assert.equal(used.has(assignment.memberId), false);
        used.add(assignment.memberId);
        const count = counts.get(assignment.memberId)!;
        if (event.session === "Sáng") count.morning++;
        else count.evening++;
      }
    }
    for (const person of team.filter(
      (person) => person.eligibility === "male_deacon",
    )) {
      const count = counts.get(person.memberId)!;
      assert.ok(count.morning > 0 && count.evening > 0);
      assert.ok(
        Math.abs(count.morning - count.evening) <=
          (month === "2026-12" ? 2 : 1),
        `${month}: ${JSON.stringify(count)}`,
      );
    }
    // Four Sundays require 24 deacon mornings versus 16 evenings. With four
    // total duties each, the best split is six 2/2 and four 3/1 (squared gap 16).
    const squaredGap = team
      .filter((person) => person.eligibility === "male_deacon")
      .reduce((sum, person) => {
        const count = counts.get(person.memberId)!;
        return sum + (count.morning - count.evening) ** 2;
      }, 0);
    assert.equal(squaredGap, month === "2026-12" ? 16 : 10);
    if (month === "2026-11")
      assert.ok(generated.counts.every((person) => person.count === 5));
  }
});

test("extra services prefer the underrepresented session when eligible deacons have equal total workload", () => {
  const { schedule, team } = extraFixture();
  const [morningHeavy, eveningHeavy] = team.filter(
    (person) => person.eligibility === "male_deacon",
  );
  let morning = 0,
    evening = 0;
  const source = {
    ...schedule,
    events: schedule.events.map((event) => ({
      ...event,
      responsibilities: event.responsibilities.map((duty, index) => ({
        ...duty,
        assignments:
          index === 0 &&
          (event.session === "Sáng" ? morning++ < 2 : evening++ < 2)
            ? [
                {
                  memberId:
                    event.session === "Sáng"
                      ? morningHeavy.memberId
                      : eveningHeavy.memberId,
                  notes: "Nam chấp sự",
                },
              ]
            : [],
      })),
    })),
  };
  const original = structuredClone(source);
  for (const session of ["Sáng", "Tối"] as const) {
    const next = addReceptionExtraService(
      source,
      [morningHeavy, eveningHeavy],
      { date: "2026-12-24", session, count: 1 },
    );
    const extra = next.events.find((event) => event.date === "2026-12-24")!;
    assert.equal(
      extra.responsibilities[0].assignments[0].memberId,
      session === "Tối" ? morningHeavy.memberId : eveningHeavy.memberId,
    );
  }
  assert.deepEqual(source, original);
});
