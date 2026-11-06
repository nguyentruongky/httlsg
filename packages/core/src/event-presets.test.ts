import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EVENT_PRESETS,
  renderEventPreset,
  type EventPreset,
} from "./event-presets";
import { parseEventText } from "./event-parser";
import { EventInput } from "./calendar";

const worship = EVENT_PRESETS[0];
test("four uniquely identified presets have names, categories and descriptions", () => {
  assert.equal(EVENT_PRESETS.length, 4);
  assert.equal(new Set(EVENT_PRESETS.map((p) => p.id)).size, 4);
  assert.deepEqual(
    [...new Set(EVENT_PRESETS.map((p) => p.category))].sort(),
    ["Chương trình Hội Thánh", "Sinh hoạt Ban ngành"].sort(),
  );
  for (const preset of EVENT_PRESETS) {
    assert.ok(
      preset.id && preset.name && preset.category && preset.description,
    );
  }
});
test("worship renders the selected church date and preserves every label and numbered song", () => {
  assert.equal(
    renderEventPreset(worship, { date: "2026-11-08" }),
    `LỊCH TRỰC NGÀY 08/11/2026 – LỄ ...
Chủ đề:
Diễn giả:
Kinh Thánh nền tảng:
Câu gốc:
HDCT:
Kinh Thánh đầu giờ:
Hát dẫn:
1.
2.
KTĐĐ:
Ban Hát Lễ:
Dâng hiến:`,
  );
  for (const service_number of [undefined, "", "  "]) {
    assert.ok(
      renderEventPreset(worship, {
        date: "2026-11-08",
        service_number,
      }).startsWith("LỊCH TRỰC NGÀY 08/11/2026 – LỄ ...\n"),
    );
  }
  assert.ok(
    renderEventPreset(worship, {
      date: "2026-11-08",
      service_number: "2",
    }).startsWith("LỊCH TRỰC NGÀY 08/11/2026 – LỄ 2\n"),
  );
});
test("renderer replaces only exact recognized tokens in one pass, retaining unknown and missing-date tokens", () => {
  const preset: EventPreset = {
    ...worship,
    template: "{{date}}\r\n{{unknown}} {{service_number}} {date} {{full_date}}",
  };
  assert.equal(
    renderEventPreset(preset, { service_number: "{{date}}" }),
    "{{date}}\r\n{{unknown}} {{date}} {date} {{full_date}}",
  );
  assert.throws(() => renderEventPreset(worship, { date: "2026-02-30" }));
  assert.throws(() => renderEventPreset(worship, { date: "08/11/2026" }));
});
test("date rendering is stable across device zones including the Sunday boundary", () => {
  const original = process.env.TZ;
  try {
    for (const zone of [
      "UTC",
      "America/Los_Angeles",
      "Pacific/Kiritimati",
      "Asia/Ho_Chi_Minh",
    ]) {
      process.env.TZ = zone;
      assert.ok(
        renderEventPreset(worship, { date: "2026-11-08" }).startsWith(
          "LỊCH TRỰC NGÀY 08/11/2026 – LỄ ...",
        ),
      );
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
test("single-line presets retain exact Vietnamese wording, 18g00 and the empty Bible study topic", () => {
  const expected = [
    "18g00: bồi linh - sinh hoạt định kỳ của Ban Truyền Giảng HT tại phòng Ban Trung niên.",
    "18g00: bồi linh - sinh hoạt định kỳ của Ban TVCS HT tại phòng Ban Trung niên.",
    "18g00: Chương trình học Kinh Thánh hàng tuần của HT tiếp tục với loạt bài chủ đề:",
  ];
  for (const [index, preset] of EVENT_PRESETS.slice(1).entries()) {
    assert.equal(
      renderEventPreset(preset, { date: "2026-11-08" }),
      expected[index],
    );
    assert.equal(preset.template.includes("\n"), false);
    assert.equal(parseEventText(preset.template).timeText, null);
    assert.equal(parseEventText(preset.template).title, expected[index]);
  }
  assert.ok(EVENT_PRESETS[3].template.endsWith("chủ đề:"));
});
test("all rendered presets are normal valid event input and retain original text through parsing", () => {
  for (const preset of EVENT_PRESETS) {
    const originalText = renderEventPreset(preset, { date: "2026-11-08" });
    const input = EventInput.parse({
      eventDate: "2026-11-08",
      originalText,
      requestId: "00000000-0000-4000-8000-000000000001",
    });
    assert.equal(input.originalText, originalText);
    const parsed = parseEventText(originalText);
    assert.equal(parsed.timeText, null);
    assert.equal(
      [parsed.title, ...(parsed.details ? [parsed.details] : [])].join("\n"),
      originalText,
    );
  }
});
