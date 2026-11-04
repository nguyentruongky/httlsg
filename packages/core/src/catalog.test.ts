import test from "node:test";
import assert from "node:assert/strict";
import { departments, areas, locations } from "./catalog";
import { DepartmentIdSchema, AreaSchema, LocationSchema } from "./schemas";
test("catalog includes the supplied departments, KV1–KV13, and distinct location labels", () => {
  assert.deepEqual(
    departments.map((d) => d.name),
    [
      "Ban Lão niên",
      "Ban Trung niên",
      "Ban Tráng niên",
      "Ban Thanh tráng",
      "Ban Thanh niên",
      "Ban Thiếu niên",
      "Ban Thiếu nhi",
      "Ban Ấu nhi",
      "Ban Thăm viếng",
      "Ban Truyền giảng",
      "Ban Trường Chúa nhật",
      "Ban Truyền thông",
      "Ban Giữ xe",
    ],
  );
  assert.deepEqual(
    areas,
    Array.from({ length: 13 }, (_, i) => `KV${i + 1}`),
  );
  assert.equal(locations.length, new Set(locations).size);
  assert.equal(locations[0], "Phường Sài Gòn");
  assert.equal(locations.at(-1), "Đặc khu Côn Đảo");
  for (const label of [
    "Phường Cây Trường II",
    "Phường Tân Phước Khánh",
    "Xã Trung Lập Hạ",
    "Phường Tân Định",
  ])
    assert.ok(locations.includes(label));
  assert.equal(AreaSchema.safeParse("KV14").success, false);
  assert.equal(LocationSchema.safeParse("Random location").success, false);
});
test("a new catalog department is valid without modifying schemas", () => {
  const extra = { id: "am-thuc", name: "Ban Ẩm thực" };
  departments.push(extra);
  try {
    assert.equal(DepartmentIdSchema.safeParse(extra.id).success, true);
  } finally {
    departments.pop();
  }
});
