import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarExportPreview, type CalendarEvent } from "./calendar";
import { updateExportEventOrders } from "./export-orders";
const range = { from: "2026-11-01", to: "2026-11-07" };
function events(count = 4) {
  return Array.from(
    { length: count },
    (_, i) =>
      ({
        id: String(i),
        eventDate: i < 2 ? "2026-11-01" : "2026-11-02",
        startTime: null,
        timeText: null,
        createdAt: "2026-01-01T00:00:00Z",
        title: "Chương trình " + (i + 1),
        details: "Hát dẫn:\n1. TC 47\n2. TC 674\nNội dung 🙏",
      }) as CalendarEvent,
  );
}
test("export metadata points only to event headings, never numbered song entries", () => {
  const draft = calendarExportPreview(events(), range);
  assert.deepEqual(
    draft.headingRanges.map((h) => draft.text.slice(h.start, h.end)),
    [
      "1. Chương trình 1",
      "2. Chương trình 2",
      "3. Chương trình 3",
      "4. Chương trình 4",
    ],
  );
});
test("deleting any event block renumbers across dates and preserves all remaining song numbers", () => {
  for (let index = 0; index < 4; index++) {
    const draft = calendarExportPreview(events(), range);
    const item = draft.headingRanges[index];
    const boundary = draft.text.indexOf("\n\n", item.end);
    const nextStart = boundary < 0 ? draft.text.length : boundary + 2;
    const updated = updateExportEventOrders(
      draft,
      draft.text.slice(0, item.start) + draft.text.slice(nextStart),
    );
    assert.deepEqual(
      updated.headingRanges.map(
        (h) => updated.text.slice(h.start, h.end).match(/^\d+/)![0],
      ),
      ["1", "2", "3"],
    );
    assert.equal(updated.text.includes("Chương trình " + (index + 1)), false);
    assert.equal(updated.text.split("1. TC 47\n2. TC 674").length - 1, 3);
  }
});
test("repeated deletion, manual title edits and details edits retain heading anchors", () => {
  let draft = calendarExportPreview(events(), range);
  draft = updateExportEventOrders(
    draft,
    draft.text.replace("Chương trình 3", "Tên mới – 🙏"),
  );
  const second = draft.headingRanges[1];
  draft = updateExportEventOrders(
    draft,
    draft.text.slice(0, second.start) +
      draft.text.slice(draft.text.indexOf("\n\n", second.end) + 2),
  );
  assert.ok(draft.text.includes("2. Tên mới – 🙏"));
  const first = draft.headingRanges[0];
  draft = updateExportEventOrders(
    draft,
    draft.text.slice(0, first.start) +
      draft.text.slice(draft.text.indexOf("\n\n", first.end) + 2),
  );
  assert.ok(draft.text.includes("1. Tên mới – 🙏"));
  assert.ok(draft.text.includes("2. Chương trình 4"));
});
test("cursor mapping accounts for double-digit event numbers becoming single-digit numbers", () => {
  const draft = calendarExportPreview(events(12), range);
  const first = draft.headingRanges[0];
  const text =
    draft.text.slice(0, first.start) +
    draft.text.slice(draft.text.indexOf("\n\n", first.end) + 2);
  const result = updateExportEventOrders(draft, text, text.length, text.length);
  assert.equal(result.selectionStart, result.text.length);
  assert.equal(result.selectionEnd, result.text.length);
  assert.deepEqual(
    result.headingRanges.map(
      (h) => result.text.slice(h.start, h.end).match(/^\d+/)![0],
    ),
    Array.from({ length: 11 }, (_, i) => String(i + 1)),
  );
});
test("arbitrary full-text replacement is preserved without guessing new headings", () => {
  const draft = calendarExportPreview(events(), range);
  const text = "Bản xuất tự soạn\n1. Một danh sách\n2. Giữ nguyên";
  const result = updateExportEventOrders(draft, text);
  assert.equal(result.text, text);
  assert.deepEqual(result.headingRanges, []);
});
