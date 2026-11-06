import { test } from "node:test";
import assert from "node:assert/strict";
import { DEPARTMENT_DISPLAY_ORDER, sortDepartments } from "./catalog";

test("departments use the requested priority followed by Vietnamese alphabetical order", () => {
  const extra = ["Ban Truyền thông", "Ban Giữ xe", "Ban Thăm viếng"];
  const source = [...extra, ...[...DEPARTMENT_DISPLAY_ORDER].reverse()].map(
    (name, id) => ({ id, name }),
  );
  const before = [...source];
  assert.deepEqual(
    sortDepartments(source).map((item) => item.name),
    [
      ...DEPARTMENT_DISPLAY_ORDER,
      ...extra.sort((a, b) => a.localeCompare(b, "vi")),
    ],
  );
  assert.deepEqual(source, before);
  assert.equal(
    sortDepartments(source)[0],
    source.find((item) => item.name === "Ban Lão niên"),
  );
});

test("department priorities tolerate capitalization, whitespace and decomposed Unicode", () => {
  assert.deepEqual(
    sortDepartments([
      { name: "Ban ABC" },
      { name: "  BAN   PHỤ NỮ ".normalize("NFD") },
      { name: "Ban Lão niên" },
    ]).map((item) => item.name.trim()),
    ["Ban Lão niên", "BAN   PHỤ NỮ".normalize("NFD"), "Ban ABC"],
  );
  assert.deepEqual(sortDepartments([]), []);
});
