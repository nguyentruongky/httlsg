import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseEventText,
  formatEventText,
  isValidEventTime,
} from "./event-parser";
import {
  CalendarRange,
  CalendarDate,
  calendarWeek,
  calendarWeekday,
  displayCalendarDate,
  calendarDateInChurch,
  calendarMonth,
  todayInChurch,
  addCalendarDays,
  parseBulkEmails,
  calendarExportText,
  sortCalendarEvents,
  type CalendarEvent,
} from "./calendar";
for (const [label, input, expected] of [
  ["empty", "", { title: "", timeText: null, details: "" }],
  ["whitespace", " \n \r\n", { title: "", timeText: null, details: "" }],
  [
    "title only",
    "  Sinh hoạt  ",
    { title: "Sinh hoạt", timeText: null, details: "" },
  ],
  [
    "details",
    "Tiêu đề\nKinh Thánh: Giăng 3:16\n- Mục 1",
    {
      title: "Tiêu đề",
      timeText: null,
      details: "Kinh Thánh: Giăng 3:16\n- Mục 1",
    },
  ],
  [
    "single time",
    "Tiêu đề\n08:00",
    {
      title: "Tiêu đề",
      timeText: "08:00",
      startTime: "08:00",
      endTime: null,
      details: "",
    },
  ],
  [
    "range",
    "Tiêu đề\n08:00 - 10:00\nNội dung\n\n- 🙏 Cầu nguyện!",
    {
      timeText: "08:00 - 10:00",
      startTime: "08:00",
      endTime: "10:00",
      details: "Nội dung\n\n- 🙏 Cầu nguyện!",
    },
  ],
  [
    "invalid clock",
    "Tiêu đề\n25:90\n1. Giữ nguyên",
    { timeText: null, details: "25:90\n1. Giữ nguyên" },
  ],
  [
    "ordinary second line",
    "Tiêu đề\nKhông có giờ\nNội dung",
    { timeText: null, details: "Không có giờ\nNội dung" },
  ],
  [
    "blank sections",
    "\nTiêu đề\n\n08h00 – 10h00\n\nChi tiết\n\n",
    { startTime: "08:00", endTime: "10:00", details: "\nChi tiết\n\n" },
  ],
  [
    "CRLF",
    "Tiêu đề\r\n8:00 AM - 1:30 PM\r\nChi tiết\r\n\r\n• Mục",
    { startTime: "08:00", endTime: "13:30", details: "Chi tiết\r\n\r\n• Mục" },
  ],
  [
    "AM PM",
    "Đêm\n12:00 AM – 12:00 PM\n🌟",
    { startTime: "00:00", endTime: "12:00", details: "🌟" },
  ],
  [
    "no invented date",
    "Ngày 01/01\nThứ hai\n08:00",
    { timeText: null, details: "Thứ hai\n08:00" },
  ],
  [
    "invalid range preserved",
    "Đêm\n23:00 - 01:00\nChi tiết",
    { timeText: null, details: "23:00 - 01:00\nChi tiết" },
  ],
] as const)
  test(`event parser: ${label}`, () => {
    const parsed = parseEventText(input);
    for (const [key, value] of Object.entries(expected))
      assert.deepEqual(parsed[key as keyof typeof parsed], value);
  });
for (const time of [
  "08:00",
  "8:00",
  "08:00–10:00",
  "08h00 - 10h00",
  "8:00 AM",
  "8:00 AM - 10:00 AM",
  "23:59",
])
  test(`valid time: ${time}`, () => assert.equal(isValidEventTime(time), true));
for (const time of [
  "24:00",
  "12:60",
  "0:00 AM",
  "13:00 PM",
  "8:0",
  "08:00 - 08:00",
  "no time",
  "08:00 - 10:00 - 11:00",
])
  test(`invalid time: ${time}`, () =>
    assert.equal(isValidEventTime(time), false));
test("formatter is stable and preserves details", () => {
  const input = {
    title: "Sinh hoạt",
    timeText: "08h00",
    details: "Đức tin 🙏\n\n- Một\n2. Hai\n",
  };
  const text = formatEventText(input);
  assert.equal(formatEventText(parseEventText(text)), text);
});
test("church dates and inclusive Sunday-first ranges remain stable across UTC boundaries", () => {
  assert.equal(todayInChurch(new Date("2026-11-01T18:00:00Z")), "2026-11-02");
  assert.deepEqual(calendarWeek("2026-11-08"), {
    from: "2026-11-08",
    to: "2026-11-14",
  });
  assert.deepEqual(calendarWeek("2026-11-02"), {
    from: "2026-11-01",
    to: "2026-11-07",
  });
  assert.deepEqual(calendarWeek("2026-11-07"), {
    from: "2026-11-01",
    to: "2026-11-07",
  });
  assert.deepEqual(calendarWeek("2027-01-01"), {
    from: "2026-12-27",
    to: "2027-01-02",
  });
  assert.deepEqual(calendarMonth("2026-11-20"), {
    from: "2026-11-01",
    to: "2026-12-05",
  });
  assert.deepEqual(calendarMonth("2026-08-20"), {
    from: "2026-07-26",
    to: "2026-09-05",
  });
  assert.equal(addCalendarDays("2026-12-31", 1), "2027-01-01");
  assert.equal(CalendarDate.safeParse("2026-02-30").success, false);
  assert.equal(CalendarDate.safeParse("2024-02-29").success, true);
  assert.equal(
    CalendarRange.safeParse({ from: "2026-11-08", to: "2026-11-02" }).success,
    false,
  );
  assert.equal(
    CalendarRange.safeParse({ from: "2026-11-02", to: "2026-11-02" }).success,
    true,
  );
  assert.equal(
    CalendarRange.safeParse({ from: "2020-01-01", to: "2026-01-01" }).success,
    false,
  );
});
test("bulk recipients normalize and distinguish invalid, duplicate, and existing addresses", () => {
  assert.deepEqual(
    parseBulkEmails(
      " ONE@example.test;one@example.test\ninvalid, OLD@example.test; two@example.test",
      ["old@example.test"],
    ),
    {
      valid: ["one@example.test", "two@example.test"],
      invalid: ["invalid"],
      duplicates: ["one@example.test"],
      alreadyExisting: ["old@example.test"],
    },
  );
});
test("export includes Unicode, long multiline details, no-time events and stable chronological ordering", () => {
  const event = (
    id: string,
    eventDate: string,
    startTime: string | null,
    createdAt = "2026-01-01T00:00:00Z",
  ) =>
    ({
      id,
      eventDate,
      startTime,
      createdAt,
      title: `Sinh hoạt ${id}`,
      timeText: startTime,
      details: "Kinh Thánh 🙏\n" + "Nội dung\n".repeat(500),
    }) as CalendarEvent;
  const events = [
    event("c", "2026-11-03", null),
    event("b", "2026-11-02", null),
    event("z", "2026-11-02", "08:00"),
    event("a", "2026-11-02", "08:00"),
  ];
  assert.deepEqual(
    sortCalendarEvents(events).map((e) => e.id),
    ["a", "z", "b", "c"],
  );
  const result = calendarExportText(events, {
    from: "2026-11-02",
    to: "2026-11-08",
  });
  assert.ok(result.includes("02/11/2026"));
  assert.ok(result.includes("08/11/2026"));
  assert.ok(result.includes("🙏"));
  assert.ok(result.includes(events[0].details));
  assert.ok(result.indexOf("Sinh hoạt a") < result.indexOf("Sinh hoạt b"));
  assert.match(
    calendarExportText([], { from: "2026-11-02", to: "2026-11-08" }),
    /Không có sinh hoạt/,
  );
});

test("8 November 2026 is Sunday in GMT+7 regardless of the device/server timezone", () => {
  const previous = process.env.TZ;
  try {
    for (const zone of [
      "UTC",
      "Pacific/Honolulu",
      "America/Los_Angeles",
      "Pacific/Kiritimati",
      "Asia/Ho_Chi_Minh",
    ]) {
      process.env.TZ = zone;
      assert.equal(
        calendarDateInChurch("2026-11-08").toISOString(),
        "2026-11-08T05:00:00.000Z",
      );
      assert.equal(calendarWeekday("2026-11-08"), 0, zone);
      assert.equal(calendarWeekday("2026-11-07"), 6, zone);
      assert.equal(
        displayCalendarDate("2026-11-08", true),
        "Chúa nhật, 08/11/2026",
        zone,
      );
      assert.equal(
        displayCalendarDate("2026-11-07", true),
        "Thứ bảy, 07/11/2026",
        zone,
      );
      assert.equal(
        todayInChurch(new Date("2026-11-07T16:59:59Z")),
        "2026-11-07",
        zone,
      );
      assert.equal(
        todayInChurch(new Date("2026-11-07T17:00:00Z")),
        "2026-11-08",
        zone,
      );
      assert.deepEqual(calendarWeek("2026-11-08"), {
        from: "2026-11-08",
        to: "2026-11-14",
      });
      const month = calendarMonth("2026-11-08");
      assert.equal(calendarWeekday(month.from), 0, zone);
      assert.equal(calendarWeekday(month.to), 6, zone);
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
