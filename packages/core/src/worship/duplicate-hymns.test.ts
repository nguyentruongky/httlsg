import { test } from "node:test";
import assert from "node:assert/strict";
import { findDuplicateWorshipHymns, parseWorshipProgram } from "./index";
const example =
  "NKTP (Hát dẫn):\n1. TC 47 (1,2–3,4)\n2. TC 674 (1,2–3)\nBan Hát Lễ: Ban Tráng Niên tôn vinh Chúa – TC 674";
test("flags the repeated TC 674 across NKTP/Hát dẫn and choir with line locations", () => {
  assert.deepEqual(findDuplicateWorshipHymns(example), [
    {
      hymn: "TC 674",
      occurrences: [
        { section: "Hát dẫn", lineNumber: 3 },
        { section: "Ban Hát Lễ", lineNumber: 4 },
      ],
    },
  ]);
  assert.ok(parseWorshipProgram(example).songs.includes("TC 674"));
  assert.equal(example.endsWith("TC 674"), true);
});
test("duplicate warnings normalize case, whitespace, Unicode labels and leading zeroes", () => {
  const text = "Hát dẫn:\r\nTC047\r\nBan Hát Lễ： tc 00047";
  assert.deepEqual(findDuplicateWorshipHymns(text.normalize("NFD")), [
    {
      hymn: "TC 47",
      occurrences: [
        { section: "Hát dẫn", lineNumber: 2 },
        { section: "Ban Hát Lễ", lineNumber: 3 },
      ],
    },
  ]);
});
test("multiple and same-line hymn repetitions are counted without confusing verse numbers", () => {
  const result = findDuplicateWorshipHymns(
    "Hát dẫn: TC 47 (1,2–3) và TC 47\nDâng hiến: TC 674\nBan Hát Lễ: TC 674",
  );
  assert.deepEqual(
    result.map((item) => [item.hymn, item.occurrences.length]),
    [
      ["TC 47", 2],
      ["TC 674", 2],
    ],
  );
});
test("different hymn numbers, Bible references, numbered slots and partial prefixes are not duplicates", () => {
  assert.deepEqual(
    findDuplicateWorshipHymns(
      "1. TC 47 (1,2–3)\n2. TC 674\nThi Thiên 47:1–3\nCâu gốc: 47:1\nATC 47, TC 47a, 674",
    ),
    [],
  );
  assert.deepEqual(findDuplicateWorshipHymns(""), []);
});
test("removing or changing a duplicate clears the warning and leaves original text untouched", () => {
  assert.deepEqual(
    findDuplicateWorshipHymns(
      example.replace("Chúa – TC 674", "Chúa – TC 675"),
    ),
    [],
  );
  assert.deepEqual(
    findDuplicateWorshipHymns(example.split("\n").slice(0, 3).join("\n")),
    [],
  );
});
