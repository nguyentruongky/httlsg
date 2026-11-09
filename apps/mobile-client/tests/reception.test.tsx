import { afterEach, test, mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@org/ui";
import {
  AuthSessionProvider,
  generateReceptionSchedule,
  type ScheduleRecord,
} from "@org/core";
import { ScheduleManager } from "../src/schedules/schedule-manager";
import { ReceptionWorkloadSummary } from "../src/schedules/reception-workload";
import { ScheduleEditor } from "../src/schedules/schedule-editor";
import { ScheduleTable } from "../src/schedules/schedule-views";
import {
  ReceptionPlanner,
  type ReceptionPreview,
} from "../src/schedules/reception-planner";
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  mock.restoreAll();
});
const id = randomUUID();
const person = {
  memberId: id,
  name: "Nguyễn Văn An",
  eligibility: "male_deacon" as const,
};
function mount(node: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <Toaster>{node}</Toaster>
    </QueryClientProvider>,
  );
}

test("reception table has one row per Sunday, grouped Sáng/Tối headers and four morning columns with editable cells", () => {
  const result = generateReceptionSchedule("2026-11", [person]);
  let edited: unknown;
  const schedule = {
    ...result.draft,
    id: randomUUID(),
    version: 1,
    status: "draft",
    createdBy: null,
    updatedBy: null,
    publishedAt: null,
    cancelledAt: null,
    memberNames: result.memberNames,
    departmentNames: {},
  } as ScheduleRecord;
  mount(
    <ScheduleTable
      schedule={schedule}
      onCellChange={(...change) => {
        edited = change;
      }}
    />,
  );
  const table = screen.getByRole("table", {
    name: "Lịch tiếp tân",
  }) as HTMLTableElement;
  assert.equal(table.tBodies[0].rows.length, 5);
  assert.equal(table.tHead!.rows.length, 2);
  assert.equal(
    screen.getByRole("columnheader", { name: "Sáng" }).getAttribute("colspan"),
    "4",
  );
  assert.equal(
    screen.getByRole("columnheader", { name: "Tối" }).getAttribute("rowspan"),
    "2",
  );
  for (const name of [
    "Cửa chính",
    "Phòng trung lão",
    "Gác lửng",
    "Phòng nhóm phụ",
  ])
    assert.ok(screen.getByRole("columnheader", { name }));
  assert.equal(screen.getAllByRole("textbox").length, 25);
  fireEvent.change(
    screen.getByRole("textbox", { name: "Sáng · Cửa chính · 01/11/2026" }),
    { target: { value: "CS Minh Quân\nÔ. Tấn Kiệt" } },
  );
  assert.deepEqual(edited, [
    "2026-11-01",
    "Sáng",
    "Cửa chính",
    "CS Minh Quân\nÔ. Tấn Kiệt",
  ]);
  assert.ok(screen.queryByRole("button", { name: /Sửa tiếp tân/ }) === null);
});
test("month picker generates and immediately opens the editable board without saving a schedule", async () => {
  const result = generateReceptionSchedule("2026-11", [person]),
    requests: { path: string; body: any }[] = [];
  let opened: ReceptionPreview | undefined;
  mock.method(globalThis, "fetch", async (input: any, init: any = {}) => {
    const path = String(input);
    requests.push({ path, body: init.body ? JSON.parse(init.body) : null });
    if (path === "/api/reception-team")
      return Response.json({
        items: [{ ...person, available: true }],
        token: "a".repeat(64),
      });
    if (path === "/api/schedules/reception-generate")
      return Response.json(result);
    throw new Error("Unexpected API " + path);
  });
  mount(
    <ReceptionPlanner
      onClose={() => {}}
      onGenerated={(value) => {
        opened = value;
      }}
    />,
  );
  assert.equal(requests.length, 0);
  fireEvent.click(screen.getByRole("button", { name: "Tháng 11" }));
  await waitFor(() => assert.ok(opened));
  assert.equal(opened?.draft.events.length, 10);
  assert.equal(
    requests.some((request) => request.path === "/api/schedules"),
    false,
  );
  assert.deepEqual(
    requests.find((request) => request.path.endsWith("reception-generate"))!
      .body,
    { month: "2026-11", token: "a".repeat(64) },
  );
});
test("month picker resumes an existing schedule without generating another one", async () => {
  let selected = "";
  mock.method(globalThis, "fetch", async () => {
    throw new Error("No generation expected");
  });
  mount(
    <ReceptionPlanner
      onClose={() => {}}
      onGenerated={() => {
        assert.fail("Must resume");
      }}
      onOpenMonth={async (month) => {
        selected = month;
        return true;
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Tháng 11" }));
  await waitFor(() => assert.equal(selected, "2026-11"));
  assert.equal(screen.queryByText("Nguyễn Văn An"), null);
});

test("direct textarea edits mark the draft dirty and save through the existing schedule action", async () => {
  const generated = generateReceptionSchedule("2026-11", [person]);
  let submitted: any, saved: any;
  mock.method(globalThis, "fetch", async (path: any, init: any) => {
    if (String(path) === "/api/reception-team")
      return Response.json({
        items: [
          person,
          {
            memberId: randomUUID(),
            name: "Nguyễn Hữu An",
            eligibility: "male_deacon",
          },
          {
            memberId: randomUUID(),
            name: "Nguyễn Thùy Linh",
            eligibility: "female",
          },
          {
            memberId: randomUUID(),
            name: "Trần Ngọc Ánh",
            eligibility: "female",
          },
          {
            memberId: randomUUID(),
            name: "Lê Minh Quân",
            eligibility: "male_deacon",
          },
          {
            memberId: randomUUID(),
            name: "Nguyễn Tấn Kiệt",
            eligibility: "male",
          },
        ],
      });
    assert.equal(String(path), "/api/schedules/submit");
    submitted = JSON.parse(init.body);
    return Response.json({
      ...generated.draft,
      ...submitted,
      id: randomUUID(),
      version: 0,
      status: "published",
      createdBy: null,
      updatedBy: null,
      publishedAt: null,
      cancelledAt: null,
      memberNames: generated.memberNames,
      departmentNames: {},
    });
  });
  mount(
    <ScheduleEditor
      initial={generated.draft}
      initialNames={generated.memberNames}
      category={{
        id: "reception",
        name: "Lịch tiếp tân",
        description: "",
        isActive: true,
        version: 0,
        settings: generated.draft.settings,
        definitions: [],
        canManage: true,
      }}
      departments={[]}
      onBack={() => {}}
      onSaved={(value) => {
        saved = value;
      }}
    />,
  );
  const input = screen.getByRole("textbox", {
    name: "Sáng · Cửa chính · 01/11/2026",
  }) as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value: "CS Minh Quân\nÔ. Tấn Kiệt" } });
  assert.equal(input.value, "CS Minh Quân\nÔ. Tấn Kiệt");
  assert.equal(submitted, undefined);
  await waitFor(() =>
    assert.equal(
      (
        screen.getByRole("button", {
          name: "Gởi lịch tiếp tân",
        }) as HTMLButtonElement
      ).disabled,
      false,
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Gởi lịch tiếp tân" }));
  fireEvent.click(await screen.findByRole("button", { name: "Xác nhận" }));
  await screen.findByRole("dialog", {
    name: "Vẫn lưu phân công cần kiểm tra?",
  });
  assert.equal(submitted, undefined);
  assert.equal(input.getAttribute("aria-invalid"), "true");
  const cell = input.closest("td") as HTMLElement;
  assert.ok(within(cell).getByText("Còn thiếu 1 nam chấp sự."));
  assert.ok(within(cell).getByText("Ô. Tấn Kiệt không thể xếp ở vị trí này."));
  assert.ok(!/\(\+\d+\)|\d+\/\d+/.test(cell.textContent ?? ""));
  fireEvent.click(screen.getByRole("button", { name: "Quay lại chỉnh sửa" }));
  assert.equal(input.value, "CS Minh Quân\nÔ. Tấn Kiệt");
  fireEvent.change(input, {
    target: { value: "CS Minh Quân\nCS Hữu An\nCS Thùy Linh\nCS Ngọc Ánh" },
  });
  assert.equal(input.getAttribute("aria-invalid"), null);
  fireEvent.change(input, { target: { value: "CS Minh Quân\nÔ. Tấn Kiệt" } });
  fireEvent.click(screen.getByRole("button", { name: "Gởi lịch tiếp tân" }));
  fireEvent.click(await screen.findByRole("button", { name: "Xác nhận" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Vẫn lưu thay đổi" }),
  );
  await waitFor(() => assert.ok(saved !== undefined));
  assert.equal(
    (submitted as any).events[0].responsibilities[0].displayText,
    "CS Minh Quân\nÔ. Tấn Kiệt",
  );
});

test("reception shows only the table and live summary, and valid staffing saves without confirmation", async () => {
  const roster = [
      ...Array.from({ length: 8 }, (_, i) => ({
        memberId: randomUUID(),
        name: `Nguyễn Chấp ${i}`,
        eligibility: "male_deacon" as const,
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        memberId: randomUUID(),
        name: `Trần Viên ${i}`,
        eligibility: "male" as const,
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        memberId: randomUUID(),
        name: `Lê Nữ ${i}`,
        eligibility: "female" as const,
      })),
    ],
    generated = generateReceptionSchedule("2026-11", roster);
  let saved = false;
  mock.method(globalThis, "fetch", async (path: any, init: any = {}) => {
    if (String(path) === "/api/reception-team")
      return Response.json({ items: roster });
    const data = JSON.parse(init.body);
    saved = true;
    return Response.json({
      ...data,
      id: randomUUID(),
      version: 0,
      status: "published",
      createdBy: null,
      updatedBy: null,
      publishedAt: null,
      cancelledAt: null,
      memberNames: generated.memberNames,
      departmentNames: {},
    });
  });
  mount(
    <ScheduleEditor
      initial={generated.draft}
      initialNames={generated.memberNames}
      category={{
        id: "reception",
        name: "Lịch tiếp tân",
        description: "",
        isActive: true,
        version: 0,
        settings: generated.draft.settings,
        definitions: [],
        canManage: true,
      }}
      departments={[]}
      onBack={() => {}}
      onSaved={() => {}}
    />,
  );
  await waitFor(() =>
    assert.equal(
      (
        screen.getByRole("button", {
          name: "Gởi lịch tiếp tân",
        }) as HTMLButtonElement
      ).disabled,
      false,
    ),
  );
  for (const name of ["Bảng phân công", "Tháng", "Tuần", "Thêm chương trình"])
    assert.ok(screen.queryByRole("button", { name }) === null);
  assert.ok(screen.queryByText("Danh sách chương trình") === null);
  assert.ok(screen.queryByText("Tên lịch") === null);
  assert.ok(screen.getByRole("region", { name: "Phân công từng người" }));
  const summary = screen.getByRole("region", { name: "Phân công từng người" });
  fireEvent.click(
    within(summary).getByRole("button", { name: "Xem tất cả 16 người" }),
  );
  const originalSummary = summary.textContent;
  assert.ok(screen.queryByText("Tổng quan phân công") === null);
  const input = screen.getByRole("textbox", {
      name: "Sáng · Cửa chính · 01/11/2026",
    }) as HTMLTextAreaElement,
    original = input.value;
  fireEvent.change(input, {
    target: { value: original.split("\n").slice(1).join("\n") },
  });
  assert.equal(input.getAttribute("aria-invalid"), "true");
  assert.notEqual(summary.textContent, originalSummary);
  fireEvent.change(input, {
    target: { value: original.split("\n").reverse().join("\n") },
  });
  fireEvent.blur(input);
  assert.equal(input.value, original);
  assert.equal(input.getAttribute("aria-invalid"), null);
  assert.equal(summary.textContent, originalSummary);
  fireEvent.click(screen.getByRole("button", { name: "Gởi lịch tiếp tân" }));
  fireEvent.click(await screen.findByRole("button", { name: "Xác nhận" }));
  await waitFor(() => assert.ok(saved));
  assert.ok(
    screen.queryByRole("dialog", {
      name: "Vẫn lưu phân công cần kiểm tra?",
    }) === null,
  );
});

test("person list uses compact table names and plain morning-evening counts without overview cards", () => {
  const member = {
      memberId: randomUUID(),
      name: "Nguyễn Linh Công",
      eligibility: "male_deacon" as const,
    },
    generated = generateReceptionSchedule("2026-11", [member]);
  const schedule = {
    ...generated.draft,
    events: generated.draft.events.filter((event) =>
      event.session === "Sáng"
        ? event.date <= "2026-11-15"
        : event.date === "2026-11-01",
    ),
    id: randomUUID(),
    version: 0,
    status: "published",
    createdBy: null,
    updatedBy: null,
    publishedAt: null,
    cancelledAt: null,
    memberNames: generated.memberNames,
    departmentNames: {},
  } as ScheduleRecord;
  mount(<ReceptionWorkloadSummary schedule={schedule} team={[member]} />);
  assert.ok(screen.getByRole("heading", { name: "Phân công từng người" }));
  assert.ok(
    screen.getByText(
      (_, node) =>
        node?.tagName === "P" &&
        node.textContent === "CS Linh Công: 3 sáng - 1 tối",
    ),
  );
  assert.ok(screen.queryByText("Nguyễn Linh Công") === null);
  assert.ok(screen.queryByText("Tổng quan phân công") === null);
  assert.ok(screen.queryByText("Phân bổ từng người") === null);
});

test("table paste trims each line and replaces only the selection while respecting the cell limit", () => {
  const generated = generateReceptionSchedule("2026-11", [person]);
  const schedule = {
    ...generated.draft,
    id: randomUUID(),
    version: 0,
    status: "published",
    createdBy: null,
    updatedBy: null,
    publishedAt: null,
    cancelledAt: null,
    memberNames: generated.memberNames,
    departmentNames: {},
  } as ScheduleRecord;
  let edited = "",
    calls = 0;
  mount(
    <ScheduleTable
      schedule={schedule}
      onCellChange={(_date, _session, _position, value) => {
        edited = value;
        calls++;
      }}
    />,
  );
  const field = screen.getByRole("textbox", {
    name: "Sáng · Cửa chính · 01/11/2026",
  }) as HTMLTextAreaElement;
  field.setSelectionRange(0, field.value.length);
  fireEvent.paste(field, {
    clipboardData: {
      getData: () => " \r\n  CS Minh Quân  \r\n  Ô. Tấn Kiệt \r\n  ",
    },
  });
  assert.equal(edited, "CS Minh Quân\nÔ. Tấn Kiệt");
  field.value = "CS Minh Quân\nB. Thùy Linh\nÔ. Tấn Kiệt";
  const start = field.value.indexOf("B. Thùy Linh");
  field.setSelectionRange(start, start + "B. Thùy Linh".length);
  fireEvent.paste(field, {
    clipboardData: { getData: () => "  CS Thùy Linh \r\n " },
  });
  assert.equal(edited, "CS Minh Quân\nCS Thùy Linh\nÔ. Tấn Kiệt");
  const previousCalls = calls;
  fireEvent.paste(field, { clipboardData: { getData: () => " \n\t " } });
  assert.equal(calls, previousCalls);
  field.value = "a".repeat(3999);
  field.setSelectionRange(3999, 3999);
  fireEvent.paste(field, { clipboardData: { getData: () => " xyz " } });
  assert.equal(edited, "a".repeat(3999) + "x");
});

test("reception manager hides redundant controls and month selection reopens the official board", async () => {
  const generated = generateReceptionSchedule("2026-11", [person]);
  const scheduleId = randomUUID();
  const record = {
    ...generated.draft,
    id: scheduleId,
    version: 1,
    status: "published",
    createdBy: null,
    updatedBy: null,
    publishedAt: "2026-11-01T00:00:00Z",
    cancelledAt: null,
    memberNames: generated.memberNames,
    departmentNames: {},
  };
  const category = {
    id: "reception",
    name: "Lịch tiếp tân",
    description: "",
    isActive: true,
    version: 0,
    settings: generated.draft.settings,
    definitions: [],
    canManage: true,
  };
  const requests: string[] = [];
  mock.method(globalThis, "fetch", async (input: any) => {
    const path = String(input);
    requests.push(path);
    if (path === "/api/auth/me")
      return Response.json({
        user: {
          id: randomUUID(),
          role: "admin",
          permissions: [],
          authVersion: 1,
          requiresPasswordSetup: false,
        },
      });
    if (path === "/api/catalog") return Response.json({ departments: [] });
    if (path === "/api/schedule-categories")
      return Response.json({ items: [category], departments: [] });
    if (path.startsWith("/api/schedules?"))
      return Response.json({
        items: [{ ...record, eventCount: 10 }],
        nextPage: null,
      });
    if (path === "/api/schedules/" + scheduleId) return Response.json(record);
    if (path === "/api/reception-team")
      return Response.json({ items: [person], token: "a".repeat(64) });
    throw new Error("Unexpected API " + path);
  });
  mount(
    <AuthSessionProvider>
      <ScheduleManager />
    </AuthSessionProvider>,
  );
  await screen.findByRole("heading", { name: "Lịch tiếp tân tháng 11/2026" });
  for (const text of [
    "Sao chép sang kỳ khác",
    "Bản tạm trên thiết bị",
    "Đội tiếp tân / Tạo lịch tháng",
    "Kỳ lịch từ ngày",
    "Đến ngày",
    "10 chương trình",
  ])
    assert.equal(screen.queryByText(text), null);
  fireEvent.click(screen.getByRole("button", { name: "Tạo lịch phân công" }));
  fireEvent.click(screen.getByRole("button", { name: "Tháng 11" }));
  await screen.findAllByRole("table", { name: "Lịch tiếp tân" });
  assert.ok(screen.getByRole("button", { name: "In lịch chính thức" }));
  assert.equal(
    requests.some((path) => path.includes("reception-generate")),
    false,
  );
  assert.ok(
    requests.some(
      (path) =>
        path.includes("status=published") &&
        path.includes("from=2026-11-01") &&
        path.includes("to=2026-11-30"),
    ),
  );
});

test("month picker shows twelve Vietnamese months in four columns with year navigation", () => {
  mount(<ReceptionPlanner onClose={() => {}} onGenerated={() => {}} />);
  const group = screen.getByRole("group", { name: "Tháng phân công năm 2026" });
  assert.ok(group.classList.contains("grid-cols-4"));
  assert.equal(within(group).getAllByRole("button").length, 12);
  fireEvent.click(screen.getByRole("button", { name: "Năm sau" }));
  assert.ok(screen.getByRole("group", { name: "Tháng phân công năm 2027" }));
  fireEvent.click(screen.getByRole("button", { name: "Năm trước" }));
  assert.ok(screen.getByRole("group", { name: "Tháng phân công năm 2026" }));
});

test("leader adds and edits an extra weekday evening without staffing warnings and can remove it", async () => {
  const generated = generateReceptionSchedule("2026-12", [person]);
  let exported: any;
  mock.method(URL, "createObjectURL", () => "blob:assignment-test");
  mock.method(URL, "revokeObjectURL", () => {});
  mock.method(window.HTMLAnchorElement.prototype, "click", () => {});
  mock.method(globalThis, "fetch", async (input: any, init: any = {}) => {
    if (String(input) === "/api/schedules/export-preview") {
      exported = JSON.parse(init.body);
      return new Response("word-document");
    }
    if (String(input) === "/api/reception-team")
      return Response.json({ items: [person] });
    throw new Error("Unexpected API " + input);
  });
  mount(
    <ScheduleEditor
      initial={generated.draft}
      initialNames={generated.memberNames}
      category={{
        id: "reception",
        name: "Lịch tiếp tân",
        description: "",
        isActive: true,
        version: 0,
        settings: generated.draft.settings,
        definitions: [],
        canManage: true,
      }}
      departments={[]}
      onBack={() => {}}
      onSaved={() => {}}
    />,
  );
  await waitFor(() =>
    assert.equal(
      (
        screen.getByRole("button", {
          name: "Gởi lịch tiếp tân",
        }) as HTMLButtonElement
      ).disabled,
      false,
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Thêm ngày bổ sung" }));
  assert.equal(screen.getByLabelText("Ngày bổ sung").tagName, "INPUT");
  assert.equal(screen.getByLabelText("Ngày bổ sung").getAttribute("max"), "31");
  fireEvent.change(screen.getByLabelText("Ngày bổ sung"), {
    target: { value: "24" },
  });
  fireEvent.change(screen.getByLabelText("Số người tự điền"), {
    target: { value: "1" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Thêm vào bảng" }));
  const input = await screen.findByRole("textbox", {
    name: "Tối · Cửa chính · 24/12/2026",
  });
  assert.equal((input as HTMLTextAreaElement).value, "CS Văn An");
  const extraRow = input.closest("tr")!;
  assert.equal(extraRow.cells.length, 6);
  assert.equal(input.closest("td"), extraRow.cells[1]);
  assert.equal(extraRow.cells[5].textContent, "—");
  const badge = within(extraRow.cells[0]).getByText("Tối", { exact: true });
  assert.ok(badge.classList.contains("rounded-full"));
  assert.ok(within(extraRow.cells[0]).getByText("Thứ năm"));
  for (const position of [
    "Cửa chính",
    "Phòng trung lão",
    "Gác lửng",
    "Phòng nhóm phụ",
  ])
    assert.ok(
      screen.getByRole("textbox", { name: `Tối · ${position} · 24/12/2026` }),
    );
  fireEvent.change(
    screen.getByRole("textbox", { name: "Tối · Gác lửng · 24/12/2026" }),
    { target: { value: "Nội dung riêng" } },
  );
  assert.equal((input as HTMLTextAreaElement).value, "CS Văn An");
  const otherPosition = screen.getByRole("textbox", {
    name: "Tối · Gác lửng · 24/12/2026",
  });
  fireEvent.change(otherPosition, { target: { value: "Nguyễn Văn An" } });
  assert.equal(input.getAttribute("aria-invalid"), "true");
  assert.equal(otherPosition.getAttribute("aria-invalid"), "true");
  assert.ok(input.closest("td")!.className.includes("bg-rose-100"));
  fireEvent.change(otherPosition, { target: { value: "Nội dung riêng" } });
  assert.notEqual(otherPosition.getAttribute("aria-invalid"), "true");
  assert.notEqual(input.getAttribute("aria-invalid"), "true");
  assert.equal(
    screen.queryByRole("textbox", { name: "Sáng · Cửa chính · 24/12/2026" }),
    null,
  );
  fireEvent.change(input, { target: { value: "Ô. Tấn Kiệt" } });
  assert.notEqual(input.getAttribute("aria-invalid"), "true");
  fireEvent.click(screen.getByRole("button", { name: "Xuất Word" }));
  await waitFor(() => assert.ok(exported));
  assert.equal(
    exported.draft.events
      .find((event: any) => event.date === "2026-12-24")
      .responsibilities.find((duty: any) => duty.name === "Gác lửng")
      .displayText,
    "Nội dung riêng",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Gỡ buổi tối ngày 24/12/2026" }),
  );
  assert.equal(
    screen.queryByRole("textbox", { name: "Tối · Cửa chính · 24/12/2026" }),
    null,
  );
});
