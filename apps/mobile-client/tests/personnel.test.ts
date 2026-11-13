import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { formatCsv } from "../src/csv-export";
import {
  personnelCsv,
  sortPersonnelDepartments,
} from "../src/personnel/formatting";
import {
  getPersonnel,
  getPersonnelMissions,
  savePersonnelMissions,
} from "../src/personnel/api";
import type { AssignedMember } from "../src/personnel/types";

const member: AssignedMember = {
  id: "member-1",
  name: 'Example "Member"',
  email: null,
  phone: "+84901234567",
  role: "deacon",
  hasAccount: true,
  departmentId: null,
  roles: [],
  allDepartments: [],
  departmentIds: ["thieu-nien"],
  departmentNames: ["Ban Thiếu niên"],
  departmental: true,
  personnelRoles: ["Chấp sự"],
};

test("CSV quoting preserves quotes, newlines, and formula protection", () => {
  for (const [value, expected] of [
    ['A,"B"', '"A,""B"""'],
    ["line\nbreak", '"line\nbreak"'],
    ["=1+1", '"\'=1+1"'],
    ["+84901234567", '"\'+84901234567"'],
    ["-1", '"\'-1"'],
    ["@name", '"\'@name"'],
    ["\tname", '"\'\tname"'],
    ["\rname", '"\'\rname"'],
  ])
    assert.equal(formatCsv([[value]]), expected);
  assert.equal(formatCsv([["a"], ["b"]]), '"a"\r\n"b"');
});

test("personnel CSV preserves headers, fallback assignments and column order", () => {
  assert.equal(
    personnelCsv([member]),
    '"Họ tên","Số điện thoại","Email","Công tác","Ban ngành"\r\n' +
      '"Example ""Member""","\'+84901234567","","Chấp sự","Ban Thiếu niên"',
  );
  assert.ok(
    personnelCsv([
      {
        ...member,
        personnelAssignments: [
          { role: "Trưởng ban ngành", departmentName: "Ban Thiếu niên" },
        ],
      },
    ]).endsWith('"Trưởng ban ngành Ban Thiếu niên","Ban Thiếu niên"'),
  );
});

test("personnel department order is stable and does not mutate input", () => {
  const departments = [
    { id: "z", name: "Z custom" },
    { id: "t", name: "Ban Thiếu niên" },
    { id: "a", name: "A custom" },
    { id: "n", name: "Ban Thanh niên" },
  ];
  assert.deepEqual(
    sortPersonnelDepartments(departments).map((item) => item.id),
    ["n", "t", "a", "z"],
  );
  assert.deepEqual(
    departments.map((item) => item.id),
    ["z", "t", "a", "n"],
  );
});

test("personnel API preserves pagination, export filters, cancellation and mission payloads", async () => {
  const requests: { path: string; init?: RequestInit }[] = [];
  const fetch = mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ path: String(input), init });
      return new Response(JSON.stringify({ items: [], total: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  );
  try {
    const params = {
      q: "Tên + email",
      roles: "deacon,leader",
      departments: "thieu-nien,thanh-nien",
    };
    const controller = new AbortController();
    await getPersonnel(params, 2, controller.signal);
    await getPersonnel(params);
    await getPersonnelMissions("member-1", controller.signal);
    await savePersonnelMissions("member-1", "a".repeat(64), [
      { kind: "deacon", departmentId: null },
    ]);
    const page = new URL(requests[0].path, "https://example.test");
    assert.equal(page.pathname, "/api/admin/roles/assigned");
    assert.equal(page.searchParams.get("page"), "2");
    for (const [key, value] of Object.entries(params))
      assert.equal(page.searchParams.get(key), value);
    assert.equal(requests[0].init?.signal, controller.signal);
    assert.equal(
      new URL(requests[1].path, "https://example.test").searchParams.has(
        "page",
      ),
      false,
    );
    assert.equal(requests[2].path, "/api/admin/personnel/member-1/missions");
    assert.equal(requests[2].init?.signal, controller.signal);
    assert.equal(requests[3].init?.method, "PUT");
    assert.deepEqual(JSON.parse(String(requests[3].init?.body)), {
      revision: "a".repeat(64),
      missions: [{ kind: "deacon", departmentId: null }],
    });
    assert.throws(() =>
      savePersonnelMissions("member-1", "a".repeat(64), [
        { kind: "leader", departmentId: null },
      ]),
    );
    assert.equal(requests.length, 4);
  } finally {
    fetch.mock.restore();
  }
});
