import { after, afterEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  render,
  screen,
  cleanup,
  waitFor,
  within,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  AuthSessionProvider,
  todayInChurch,
  calendarWeek,
  calendarMonth,
  displayCalendarDate,
  parseEventText,
  EVENT_PRESETS,
  renderEventPreset,
  composeWorshipInformationRequest,
  WORSHIP_FIELD_LABELS,
  parseBulkEmails,
  calendarExportText,
  type CalendarEvent,
  type EmailGroup,
} from "@org/core";
import { Toaster } from "@org/ui";
import { build } from "esbuild";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const directory = fileURLToPath(
  new URL("../../../.local-data/", import.meta.url),
);
await mkdir(directory, { recursive: true });
const temp = await mkdtemp(join(directory, "calendar-ui-")),
  output = join(temp, "calendar.mjs");
const component = fileURLToPath(
  new URL("../../web-admin/components/calendar/", import.meta.url),
);
await build({
  stdin: {
    contents: `export {WorshipViberDraftPage} from ${JSON.stringify(join(component, "worship-viber-draft-page.tsx"))};export {CalendarPage} from ${JSON.stringify(join(component, "calendar-page.tsx"))}; export {EmailGroupsPage} from ${JSON.stringify(join(component, "email-groups-page.tsx"))};export {CalendarExport} from ${JSON.stringify(join(component, "calendar-export.tsx"))};export {FailureNotifications} from ${JSON.stringify(join(component, "failure-notifications.tsx"))};`,
    resolveDir: component,
    loader: "tsx",
  },
  outfile: output,
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  jsx: "automatic",
});
const {
  CalendarPage,
  EmailGroupsPage,
  CalendarExport,
  FailureNotifications,
  WorshipViberDraftPage,
} = (await import(pathToFileURL(output).href)) as {
  WorshipViberDraftPage: (typeof import("../../web-admin/components/calendar/worship-viber-draft-page"))["WorshipViberDraftPage"];
  CalendarPage: (typeof import("../../web-admin/components/calendar/calendar-page"))["CalendarPage"];
  EmailGroupsPage: (typeof import("../../web-admin/components/calendar/email-groups-page"))["EmailGroupsPage"];
  CalendarExport: (typeof import("../../web-admin/components/calendar/calendar-export"))["CalendarExport"];
  FailureNotifications: (typeof import("../../web-admin/components/calendar/failure-notifications"))["FailureNotifications"];
};
after(() => rm(temp, { recursive: true, force: true }));
const fetchOriginal = globalThis.fetch,
  createOriginal = URL.createObjectURL,
  revokeOriginal = URL.revokeObjectURL,
  clickOriginal = window.HTMLAnchorElement.prototype.click;
afterEach(() => {
  cleanup();
  globalThis.fetch = fetchOriginal;
  URL.createObjectURL = createOriginal;
  URL.revokeObjectURL = revokeOriginal;
  window.HTMLAnchorElement.prototype.click = clickOriginal;
});
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
function setup(
  role = "admin",
  view?: React.ReactNode,
  number = 1,
  fail = false,
  mailFailure = false,
  worshipGroup = false,
  worshipEvent: false | "missing" | "complete" = false,
  failureKind: "calendar" | "worship_viber" = "calendar",
) {
  const date = todayInChurch(),
    calls: { path: string; method: string; body: any }[] = [],
    saved: any[] = [],
    downloads: string[] = [],
    revoked: string[] = [];
  const groups: EmailGroup[] = [
    {
      id: "60000000-0000-4000-8000-000000000001",
      name: "Nhóm A",
      description: "Sinh hoạt thanh niên",
      memberCount: 2,
      version: 0,
    },
    {
      id: "60000000-0000-4000-8000-000000000002",
      name: "Nhóm B",
      description: "",
      memberCount: 2,
      version: 0,
    },
  ];
  if (worshipGroup)
    groups.push({
      id: "60000000-0000-4000-8000-000000000003",
      name: "Chương trình thờ phượng",
      description: "",
      memberCount: 3,
      version: 0,
    });
  const members = [{ id: "member-one", email: "old@example.test" }];
  const events: CalendarEvent[] = Array.from({ length: number }, (_, i) => ({
    id: `event-${i}`,
    eventDate: date,
    title: `Sinh hoạt ${i + 1}`,
    timeText: i === 0 ? "08:00" : null,
    startTime: i === 0 ? "08:00" : null,
    endTime: null,
    details: "Kinh Thánh 🙏",
    originalText: `Sinh hoạt ${i + 1}\n${i === 0 ? "08:00\n" : ""}Kinh Thánh 🙏`,
    groupIds: [],
    version: 0,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  }));
  if (worshipEvent && events[0]) {
    const content =
      worshipEvent === "complete"
        ? "LỊCH TRỰC NGÀY 08/11/2026 – LỄ 1\n" +
          Object.values(WORSHIP_FIELD_LABELS)
            .map((label) => `${label}: Nội dung đã điền`)
            .join("\n")
        : renderEventPreset(EVENT_PRESETS[0], { date });
    Object.assign(events[0], {
      presetId: "worship-program",
      originalText: content,
      ...parseEventText(content),
    });
  }
  URL.createObjectURL = () => "blob:calendar-test";
  URL.revokeObjectURL = (url) => {
    revoked.push(url);
  };
  window.HTMLAnchorElement.prototype.click = function () {
    downloads.push(this.download);
  };
  globalThis.fetch = async (input, init) => {
    const path = String(input),
      method = init?.method ?? "GET",
      body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ path, method, body });
    if (path === "/api/auth/me")
      return json({
        user: {
          id: "calendar-admin",
          name: "Quản trị lịch",
          role,
          roles: [role],
          permissions: [
            "calendar.read",
            "calendar.write",
            "calendar.export",
            "calendar.groups",
            "calendar.notify",
          ],
          requiresPasswordSetup: false,
          authVersion: 1,
        },
      });
    if (path === "/api/catalog") return json({ departments: [] });
    if (path.endsWith("/worship-information-request")) {
      if (method === "GET")
        return json({
          ...composeWorshipInformationRequest(events[0].originalText),
          eventId: events[0].id,
          version: events[0].version,
          recipient: "nguyentruongky33@gmail.com",
          previewHash: "b".repeat(64),
        });
      if (method === "POST") {
        saved.push(body);
        return json({ success: true, status: "sent" });
      }
    }
    if (path.endsWith("/worship-viber-email") && method === "POST") {
      saved.push(body);
      return json({ success: true, status: "sent" });
    }
    if (path.startsWith("/api/worship-viber-drafts/draft-one")) {
      const info = composeWorshipInformationRequest(events[0].originalText);
      return json({
        ...info,
        viberLink:
          "viber://chat?number=%2B84397092176&draft=" +
          encodeURIComponent(info.message),
        version: 0,
      });
    }
    if (path.startsWith("/api/events?"))
      return fail
        ? json({ message: "Không thể tải lịch thử nghiệm." }, 503)
        : json({ items: events });
    if (path === "/api/events" && method === "POST") {
      saved.push(body);
      return json({
        id: "new-event",
        delivery: {
          sent: mailFailure ? 2 : 3,
          failed: mailFailure ? 1 : 0,
          uncertain: 0,
          pending: 0,
          sending: 0,
          cancelled: 0,
        },
      });
    }
    if (path.startsWith("/api/events/event-") && method === "DELETE")
      return json({ message: "Sinh hoạt đã được cập nhật. Hãy tải lại." }, 409);
    if (path.startsWith("/api/events/event-") && method === "PATCH") {
      saved.push(body);
      return json({
        id: "event-0",
        delivery: {
          sent: mailFailure ? 2 : 3,
          failed: mailFailure ? 1 : 0,
          uncertain: 0,
          pending: 0,
          sending: 0,
          cancelled: 0,
        },
      });
    }
    if (path === "/api/email-groups" && method === "POST") {
      const group = {
        id: crypto.randomUUID(),
        name: body.name,
        description: body.description,
        memberCount: 0,
        version: 0,
      };
      groups.push(group);
      return json({ ...group, members: [] });
    }
    if (path === "/api/email-groups" && method === "GET")
      return json({ items: groups });
    if (path === "/api/email-groups/recipients") return json({ count: 3 });
    if (
      path.startsWith("/api/email-groups/") &&
      path.endsWith("/members") &&
      method === "POST"
    ) {
      const report = parseBulkEmails(
        body.text,
        members.map((m) => m.email),
      );
      members.push(...report.valid.map((email) => ({ id: email, email })));
      groups[0].version++;
      return json({ ...report, added: report.valid.length });
    }
    if (
      path.startsWith(`/api/email-groups/${groups[0].id}/members/`) &&
      method === "DELETE"
    ) {
      const index = members.findIndex((m) => m.id === path.split("/").at(-1));
      if (index >= 0) members.splice(index, 1);
      groups[0].version++;
      return json({ ok: true });
    }
    const targetGroup = groups.find(
      (g) => path === `/api/email-groups/${g.id}`,
    );
    if (targetGroup) {
      if (method === "DELETE") {
        groups.splice(groups.indexOf(targetGroup), 1);
        return json({ ok: true });
      }
      if (method === "PATCH") {
        Object.assign(targetGroup, body, { version: targetGroup.version + 1 });
        saved.push(body);
        return json(targetGroup);
      }
      return json({
        ...targetGroup,
        members: targetGroup === groups[0] ? members : [],
      });
    }
    if (path.startsWith("/api/events/export?")) {
      const p = new URL(path, "http://localhost").searchParams,
        range = { from: p.get("from")!, to: p.get("to")! };
      return json({
        ...range,
        text: calendarExportText(events, range),
        count: events.length,
      });
    }
    if (path === "/api/events/export/docx") {
      saved.push(body);
      return new Response("PK-word-file", {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      });
    }
    if (path.startsWith("/api/notifications/failures?"))
      return json({
        items: saved.length
          ? []
          : [
              {
                id: "batch-one",
                kind: failureKind,
                title: "Sinh hoạt lịch sử",
                eventDate: "2026-11-08",
                createdAt: "2026-11-02T01:00:00Z",
                failed: 1,
                retryable: 1,
                uncertain: 0,
              },
            ],
        total: saved.length ? 0 : 1,
      });
    if (path.startsWith("/api/notifications?"))
      return json({
        items: [
          {
            id: "batch-one",
            title: "Sinh hoạt lịch sử",
            kind: "created",
            createdAt: "2026-11-02T01:00:00Z",
            groupNames: ["Nhóm A"],
            counts: { sent: 1, failed: 1, pending: 1 },
          },
        ],
        total: 1,
      });
    if (path.startsWith("/api/notifications/batch-one/deliveries"))
      return json({
        items: [
          {
            id: "delivery-one",
            email: "sent@example.test",
            status: "sent",
            attempts: 1,
            error: null,
          },
          {
            id: "delivery-two",
            email: "failed@example.test",
            status: "failed",
            attempts: 1,
            error: "Máy chủ từ chối.",
          },
        ],
        total: 2,
      });
    if (
      path === "/api/notifications/batch-one/retry" ||
      path === "/api/worship-viber-drafts/batch-one/retry"
    ) {
      saved.push(body);
      return json({ count: 1 });
    }
    throw new Error(`Unexpected calendar request: ${path} ${method}`);
  };
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  render(
    <QueryClientProvider client={client}>
      <AuthSessionProvider>
        <Toaster>{view ?? <CalendarPage />}</Toaster>
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
  return { date, calls, saved, events, downloads, revoked };
}
test("calendar shows Sunday-first month, changes views/date ranges, and expands crowded days", async () => {
  const { date, calls } = setup("admin", undefined, 5),
    user = userEvent.setup();
  await screen.findByRole("heading", { name: "Lịch sinh hoạt" });
  await screen.findByRole("button", { name: /\+2 sinh hoạt khác/ });
  const weekday = screen.getByText("Chúa nhật");
  const weekdays = weekday.parentElement!.parentElement!;
  assert.ok(weekdays.children[0].textContent?.includes("Chúa nhật"));
  assert.ok(weekdays.children[6].textContent?.includes("Thứ bảy"));
  const month = calendarMonth(date);
  assert.ok(
    calls.some(
      (c) => c.path === `/api/events?from=${month.from}&to=${month.to}`,
    ),
  );
  await user.click(screen.getByRole("button", { name: "+2 sinh hoạt khác" }));
  await screen.findByText("Sinh hoạt 5");
  assert.equal(
    screen.getByRole("button", { name: "Ngày" }).getAttribute("aria-pressed"),
    "true",
  );
  await user.click(screen.getByRole("button", { name: "Tuần" }));
  await waitFor(() =>
    assert.ok(
      calls.some(
        (c) =>
          c.path ===
          `/api/events?from=${calendarWeek(date).from}&to=${calendarWeek(date).to}`,
      ),
    ),
  );
  const before = calls.filter((c) => c.path.startsWith("/api/events?")).length;
  await user.click(screen.getByRole("button", { name: "Khoảng sau" }));
  await waitFor(() =>
    assert.ok(
      calls.filter((c) => c.path.startsWith("/api/events?")).length > before,
    ),
  );
  await user.click(screen.getByRole("button", { name: "Hôm nay" }));
});
test("date selection saves selected groups directly without recipient preview or confirmation", async () => {
  const { date, saved, calls } = setup(),
    user = userEvent.setup();
  await screen.findByRole("button", {
    name: `Tạo sinh hoạt ${displayCalendarDate(date)}`,
  });
  fireEvent.click(document.querySelector(`[data-calendar-date="${date}"]`)!);
  const input = await screen.findByRole("textbox", {
    name: "Nội dung sinh hoạt",
  });
  fireEvent.change(input, {
    target: { value: "Buổi nhóm 🙏\n08h00 - 10h00\nNội dung\n\n- Cầu nguyện" },
  });
  assert.equal(
    (input as HTMLTextAreaElement).value,
    "Buổi nhóm 🙏\n08h00 - 10h00\nNội dung\n\n- Cầu nguyện",
  );
  await user.click(await screen.findByRole("checkbox", { name: /Nhóm A/ }));
  const button = screen.getByRole("button", { name: "Lưu sinh hoạt" });
  assert.equal((button as HTMLButtonElement).disabled, false);
  assert.equal(
    screen.queryByRole("checkbox", {
      name: "Tôi xác nhận gửi thông báo khi tạo sinh hoạt",
    }),
    null,
  );
  assert.equal(screen.queryByText(/người nhận duy nhất/), null);
  assert.equal(screen.queryByText(/địa chỉ$/), null);
  assert.equal(
    calls.some((call) => call.path === "/api/email-groups/recipients"),
    false,
  );
  await user.click(button);
  await waitFor(() => assert.equal(saved.length, 1));
  assert.equal(saved[0].eventDate, date);
  assert.equal(saved[0].groupIds.length, 1);
  assert.ok(saved[0].originalText.includes("🙏"));
  assert.ok(saved[0].requestId);
  await screen.findByText("Đã lưu sinh hoạt");
});
for (const preset of EVENT_PRESETS) {
  test(`new event applies and saves editable preset: ${preset.name}`, async () => {
    const { date, saved, calls } = setup(),
      user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", {
        name: `Tạo sinh hoạt ${displayCalendarDate(date)}`,
      }),
    );
    const input = (await screen.findByRole("textbox", {
      name: "Nội dung sinh hoạt",
    })) as HTMLTextAreaElement;
    assert.equal(input.value, "");
    await user.click(screen.getByRole("button", { name: "Mẫu chương trình" }));
    assert.equal(screen.getAllByRole("option").length, 4);
    assert.ok(screen.getByText("Chương trình Hội Thánh"));
    assert.ok(screen.getByText("Sinh hoạt Ban ngành"));
    await user.click(
      screen.getByRole("option", {
        name: (name) => name.startsWith(preset.name),
      }),
    );
    await waitFor(() =>
      assert.equal(input.value, renderEventPreset(preset, { date })),
    );
    assert.equal(
      screen.queryByRole("dialog", { name: "Thay thế nội dung?" }),
      null,
    );
    assert.equal(saved.length, 0, "selecting a preset never saves an event");
    const edited = input.value + "\nThông tin bổ sung: cầu nguyện 🙏";
    fireEvent.change(input, { target: { value: edited } });
    await user.click(screen.getByRole("button", { name: "Lưu sinh hoạt" }));
    await waitFor(() => assert.equal(saved.length, 1));
    assert.equal(saved[0].originalText, edited);
    assert.equal(saved[0].eventDate, date);
    assert.equal(saved[0].presetId, preset.id);
    assert.equal(
      calls.filter((c) => c.path === "/api/events" && c.method === "POST")
        .length,
      1,
    );
  });
}
test("worship preset selects its existing group, preserves other groups and allows manual deselection", async () => {
  const { date, saved } = setup("admin", undefined, 1, false, false, true),
    user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", {
      name: `Tạo sinh hoạt ${displayCalendarDate(date)}`,
    }),
  );
  await user.click(await screen.findByRole("checkbox", { name: "Nhóm A" }));
  const group = screen.getByRole("checkbox", {
    name: "Chương trình thờ phượng",
  });
  assert.equal(group.getAttribute("aria-checked"), "false");
  await user.click(screen.getByRole("button", { name: "Mẫu chương trình" }));
  await user.click(
    screen.getByRole("option", {
      name: (name) => name.startsWith(EVENT_PRESETS[0].name),
    }),
  );
  assert.equal(group.getAttribute("aria-checked"), "true");
  assert.equal(
    screen
      .getByRole("checkbox", { name: "Nhóm A" })
      .getAttribute("aria-checked"),
    "true",
  );
  await user.click(group);
  assert.equal(group.getAttribute("aria-checked"), "false");
  // A cancelled replacement must not reselect the group.
  await user.click(screen.getByRole("button", { name: "Mẫu chương trình" }));
  await user.click(
    screen.getByRole("option", {
      name: (name) => name.startsWith(EVENT_PRESETS[0].name),
    }),
  );
  await user.click(
    within(
      await screen.findByRole("dialog", { name: "Thay thế nội dung?" }),
    ).getByRole("button", { name: "Hủy" }),
  );
  assert.equal(group.getAttribute("aria-checked"), "false");
  for (let i = 0; i < 2; i++) {
    await user.click(screen.getByRole("button", { name: "Mẫu chương trình" }));
    await user.click(
      screen.getByRole("option", {
        name: (name) => name.startsWith(EVENT_PRESETS[0].name),
      }),
    );
    await user.click(
      within(
        await screen.findByRole("dialog", { name: "Thay thế nội dung?" }),
      ).getByRole("button", { name: "Thay thế nội dung" }),
    );
  }
  await user.click(screen.getByRole("button", { name: "Lưu sinh hoạt" }));
  await waitFor(() => assert.equal(saved.length, 1));
  assert.deepEqual(saved[0].groupIds, [
    "60000000-0000-4000-8000-000000000001",
    "60000000-0000-4000-8000-000000000003",
  ]);
});
test("preset replacement confirms, cancellation retains edits, and search supports keyboard selection", async () => {
  const { date, saved } = setup(),
    user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", {
      name: `Tạo sinh hoạt ${displayCalendarDate(date)}`,
    }),
  );
  const input = (await screen.findByRole("textbox", {
    name: "Nội dung sinh hoạt",
  })) as HTMLTextAreaElement;
  fireEvent.change(input, {
    target: { value: "Nội dung tự viết\nKhông được xóa 🙏" },
  });
  const original = input.value;
  await user.click(screen.getByRole("button", { name: "Mẫu chương trình" }));
  await user.type(
    screen.getByRole("combobox", { name: "Tìm mẫu chương trình" }),
    "TVCS",
  );
  await waitFor(() => assert.equal(screen.getAllByRole("option").length, 1));
  await user.keyboard("{Enter}");
  const confirm = await screen.findByRole("dialog", {
    name: "Thay thế nội dung?",
  });
  assert.ok(
    within(confirm).getByText(
      "Bạn có muốn thay thế nội dung hiện tại bằng mẫu mới không?",
    ),
  );
  assert.equal(input.value, original);
  await user.click(within(confirm).getByRole("button", { name: "Hủy" }));
  assert.equal(input.value, original);
  await user.click(screen.getByRole("button", { name: "Mẫu chương trình" }));
  await user.click(
    screen.getByRole("option", {
      name: (name) => name.startsWith(EVENT_PRESETS[0].name),
    }),
  );
  await user.click(
    within(
      await screen.findByRole("dialog", { name: "Thay thế nội dung?" }),
    ).getByRole("button", { name: "Thay thế nội dung" }),
  );
  assert.equal(input.value, renderEventPreset(EVENT_PRESETS[0], { date }));
  fireEvent.change(input, {
    target: { value: input.value + "\nGhi chú riêng" },
  });
  const amended = input.value;
  await user.click(screen.getByRole("button", { name: "Mẫu chương trình" }));
  await user.click(
    screen.getByRole("option", {
      name: (name) => name.startsWith(EVENT_PRESETS[1].name),
    }),
  );
  await user.keyboard("{Escape}");
  assert.equal(input.value, amended);
  assert.equal(saved.length, 0);
});
test("worship uses the current selected date without rewriting text on later date edits", async () => {
  const { date } = setup(),
    user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", {
      name: `Tạo sinh hoạt ${displayCalendarDate(date)}`,
    }),
  );
  const dateField = screen.getByRole("textbox", { name: "Ngày sinh hoạt" });
  fireEvent.change(dateField, { target: { value: "08/11/2026" } });
  await user.click(screen.getByRole("button", { name: "Mẫu chương trình" }));
  await user.click(
    screen.getByRole("option", {
      name: (name) => name.startsWith(EVENT_PRESETS[0].name),
    }),
  );
  const input = screen.getByRole("textbox", {
    name: "Nội dung sinh hoạt",
  }) as HTMLTextAreaElement;
  assert.ok(input.value.startsWith("LỊCH TRỰC NGÀY 08/11/2026 – LỄ ..."));
  fireEvent.change(dateField, { target: { value: "09/11/2026" } });
  assert.ok(input.value.startsWith("LỊCH TRỰC NGÀY 08/11/2026 – LỄ ..."));
});
test("editing an existing event sends on save without a separate notification action", async () => {
  const { saved, calls } = setup(),
    user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: /08:00 Sinh hoạt 1/ }),
  );
  const input = await screen.findByRole("textbox", {
    name: "Nội dung sinh hoạt",
  });
  assert.equal(
    screen.queryByRole("button", { name: "Mẫu chương trình" }),
    null,
  );
  fireEvent.change(input, {
    target: { value: "Tên mới\nKhông có thời gian\nNội dung giữ nguyên" },
  });
  assert.equal(screen.queryByText(/Chưa có giờ/), null);
  await user.click(await screen.findByRole("checkbox", { name: "Nhóm A" }));
  assert.equal(
    screen.queryByRole("button", { name: "Gửi thông báo cập nhật" }),
    null,
  );
  await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await waitFor(() => assert.equal(saved.length, 1));
  assert.equal(saved[0].version, 0);
  await screen.findByText("Đã gửi thông báo.");
  assert.ok(saved[0].originalText.includes("Không có thời gian"));
  assert.equal(
    screen.queryByRole("button", { name: "Mẫu chương trình" }),
    null,
  );
  assert.equal(
    calls.some((c) => c.path.endsWith("/notifications") && c.method === "POST"),
    false,
  );
});
test("saved edits report partial email failure without asking for another save", async () => {
  const { saved } = setup("admin", undefined, 1, false, true);
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: /08:00 Sinh hoạt 1/ }),
  );
  await user.click(await screen.findByRole("checkbox", { name: "Nhóm A" }));
  await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await screen.findByText(
    "Email chưa gửi đầy đủ. Mở chuông thông báo để thử lại.",
  );
  assert.equal(saved.length, 1);
  assert.equal(
    screen.queryByRole("textbox", { name: "Nội dung sinh hoạt" }),
    null,
  );
});
test("worship editor retains live missing information without manual notification actions", async () => {
  const { events, calls } = setup(
      "admin",
      undefined,
      1,
      false,
      false,
      false,
      "missing",
    ),
    user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: /LỊCH TRỰC NGÀY/ }),
  );
  const summary = await screen.findByRole("region", {
    name: "Thông tin chương trình thờ phượng",
  });
  assert.ok(within(summary).getByText("Thông tin còn thiếu:"));
  assert.equal(within(summary).getAllByRole("listitem").length, 7);
  for (const label of [
    "Gửi email yêu cầu bổ sung thông tin",
    "Gửi email bản nháp Viber",
    "Mở Viber để gửi yêu cầu",
    "Sao chép nội dung",
  ]) {
    assert.equal(screen.queryByRole("button", { name: label }), null);
    assert.equal(screen.queryByRole("link", { name: label }), null);
  }
  fireEvent.change(
    screen.getByRole("textbox", { name: "Nội dung sinh hoạt" }),
    {
      target: {
        value: events[0].originalText.replace(
          /Chủ đề: */u,
          "Chủ đề: Cầu nguyện",
        ),
      },
    },
  );
  assert.equal(within(summary).getAllByRole("listitem").length, 6);
  assert.equal(
    calls.some(
      (call) =>
        call.path.endsWith("/worship-information-request") ||
        call.path.endsWith("/worship-viber-email"),
    ),
    false,
  );
});
test("worship edits use only the normal save endpoint and selected groups without confirmation", async () => {
  const { saved, calls } = setup(
      "admin",
      undefined,
      1,
      false,
      false,
      true,
      "missing",
    ),
    user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: /LỊCH TRỰC NGÀY/ }),
  );
  await user.click(await screen.findByRole("checkbox", { name: "Nhóm A" }));
  const input = screen.getByRole("textbox", {
    name: "Nội dung sinh hoạt",
  }) as HTMLTextAreaElement;
  fireEvent.change(input, {
    target: { value: input.value + "\nThông tin cập nhật" },
  });
  await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await waitFor(() => assert.equal(saved.length, 1));
  assert.deepEqual(saved[0].groupIds, ["60000000-0000-4000-8000-000000000001"]);
  assert.ok(saved[0].originalText.includes("Thông tin cập nhật"));
  assert.equal(calls.filter((call) => call.method === "POST").length, 0);
  assert.equal(calls.filter((call) => call.method === "PATCH").length, 1);
  await screen.findByText("Đã lưu sinh hoạt");
  assert.equal(screen.queryByText("Đã gửi email bản nháp Viber"), null);
});
test("phone handoff opens the full saved message and copy/Viber actions without email controls", async () => {
  const launches: string[] = [];
  const { events, saved, calls } = setup(
      "admin",
      <WorshipViberDraftPage requestId="draft-one" />,
      1,
      false,
      false,
      false,
      "missing",
    ),
    user = userEvent.setup();
  window.HTMLAnchorElement.prototype.click = function () {
    launches.push(this.href);
  };
  const full = (await screen.findByRole("textbox", {
    name: "Nội dung đầy đủ",
  })) as HTMLTextAreaElement;
  const message = composeWorshipInformationRequest(
    events[0].originalText,
  ).message;
  assert.equal(full.value, message);
  assert.equal(
    launches.length,
    0,
    "opening the page must not launch an incomplete draft",
  );
  const link = screen.getByRole("link", { name: "Mở Viber để gửi yêu cầu" });
  const href = link.getAttribute("href")!;
  assert.equal(new URL(href).searchParams.get("number"), "+84397092176");
  assert.equal(new URL(href).searchParams.get("draft"), message);
  assert.equal(decodeURIComponent(href.split("&draft=")[1]), message);
  const before = await navigator.clipboard.readText();
  let directDefaultAllowed = false;
  document.addEventListener(
    "click",
    (event) => {
      // Runs after the anchor handler: app must leave native navigation intact.
      directDefaultAllowed = !event.defaultPrevented;
      event.preventDefault(); // Test-only: do not try OS navigation in jsdom.
    },
    { once: true },
  );
  const requestsBeforeOpen = calls.length;
  await user.click(link);
  assert.equal(
    calls.length,
    requestsBeforeOpen,
    "no async fetch inserted before native navigation",
  );
  assert.equal(directDefaultAllowed, true);
  assert.equal(launches.length, 0, "no scripted anchor.click launches");
  assert.equal(
    await navigator.clipboard.readText(),
    before,
    "opening must not require clipboard",
  );
  events[0].originalText += "\nThông tin vừa lưu & + % # ? 🙏";
  const latest = composeWorshipInformationRequest(
    events[0].originalText,
  ).message;
  assert.equal(
    screen.queryByRole("button", {
      name: "Gửi email yêu cầu bổ sung thông tin",
    }),
    null,
  );
  assert.equal(
    screen.queryByRole("button", { name: "Gửi email bản nháp Viber" }),
    null,
  );
  await user.click(screen.getByRole("button", { name: "Sao chép nội dung" }));
  assert.equal(await navigator.clipboard.readText(), latest);
  assert.equal(
    new URL(
      screen
        .getByRole("link", { name: "Mở Viber để gửi yêu cầu" })
        .getAttribute("href")!,
    ).searchParams.get("draft"),
    latest,
  );
  assert.equal(full.value, latest);
  assert.equal(saved.length, 0);
});
test("non-Admin phone visitors do not request the saved Viber message", async () => {
  const { calls } = setup(
    "secretary",
    <WorshipViberDraftPage requestId="draft-one" />,
  );
  await screen.findByText("Chỉ Admin có quyền xem bản nháp này.");
  assert.equal(
    calls.some((call) => call.path.startsWith("/api/worship-viber-drafts/")),
    false,
  );
});
test("complete worship program keeps its complete-state notice and no action buttons", async () => {
  setup("admin", undefined, 1, false, false, false, "complete");
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: /LỊCH TRỰC NGÀY/ }),
  );
  await screen.findByText(
    "Chương trình thờ phượng đã có đầy đủ thông tin. Không cần gửi yêu cầu bổ sung.",
  );
  assert.equal(
    screen.queryByRole("button", {
      name: "Gửi email yêu cầu bổ sung thông tin",
    }),
    null,
  );
  assert.equal(
    screen.queryByRole("button", { name: "Gửi email bản nháp Viber" }),
    null,
  );
});
test("clipboard denial provides selectable complete message without sending email", async () => {
  const { events, saved } = setup(
      "admin",
      <WorshipViberDraftPage requestId="draft-one" />,
      1,
      false,
      false,
      false,
      "missing",
    ),
    user = userEvent.setup();

  const launches: string[] = [];
  window.HTMLAnchorElement.prototype.click = function () {
    launches.push(this.href);
  };
  const copy = await screen.findByRole("button", {
    name: "Sao chép nội dung",
  });
  await waitFor(() =>
    assert.equal((copy as HTMLButtonElement).disabled, false),
  );
  const descriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: undefined,
  });
  try {
    await user.click(copy);
    const fallback = (await screen.findByRole("textbox", {
      name: "Nội dung để sao chép",
    })) as HTMLTextAreaElement;
    assert.equal(
      fallback.value,
      composeWorshipInformationRequest(events[0].originalText).message,
    );
    assert.equal(saved.length, 0);
    assert.equal(launches.length, 0);
  } finally {
    if (descriptor) Object.defineProperty(navigator, "clipboard", descriptor);
  }
});
test("LAN HTTP clipboard fallback copies the full latest text without opening Viber", async () => {
  const { events } = setup(
    "admin",
    <WorshipViberDraftPage requestId="draft-one" />,
    1,
    false,
    false,
    false,
    "missing",
  );
  const user = userEvent.setup();
  const button = await screen.findByRole("button", {
    name: "Sao chép nội dung",
  });
  const clipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  const command = Object.getOwnPropertyDescriptor(document, "execCommand");
  const order: string[] = [];
  let copied = "";
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: (name: string) => {
      assert.equal(name, "copy");
      copied = (document.activeElement as HTMLTextAreaElement).value;
      order.push("copy");
      return true;
    },
  });
  window.HTMLAnchorElement.prototype.click = function () {
    assert.equal(this.href, "viber://chat?number=%2B84397092176");
    order.push("open");
  };
  try {
    await user.click(button);
    await waitFor(() => assert.deepEqual(order, ["copy"]));
    assert.equal(
      copied,
      composeWorshipInformationRequest(events[0].originalText).message,
    );
  } finally {
    if (clipboard) Object.defineProperty(navigator, "clipboard", clipboard);
    else Reflect.deleteProperty(navigator, "clipboard");
    if (command) Object.defineProperty(document, "execCommand", command);
    else Reflect.deleteProperty(document, "execCommand");
  }
});
test("a failed copy refresh never opens Viber or copies stale content", async () => {
  setup(
    "admin",
    <WorshipViberDraftPage requestId="draft-one" />,
    1,
    false,
    false,
    false,
    "missing",
  );
  const user = userEvent.setup();
  const button = await screen.findByRole("button", {
    name: "Sao chép nội dung",
  });
  const originalFetch = globalThis.fetch;
  const previousClipboard = await navigator.clipboard.readText();
  let opened = false;
  window.HTMLAnchorElement.prototype.click = function () {
    opened = true;
  };
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "Unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  try {
    await user.click(button);
    await screen.findByText(
      "Không thể tải nội dung mới nhất. Vui lòng thử lại.",
    );
    assert.equal(opened, false);
    assert.equal(await navigator.clipboard.readText(), previousClipboard);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("Secretary can view/export but cannot mutate, inspect email groups, or see send actions", async () => {
  setup("secretary");
  const user = userEvent.setup();
  await screen.findByRole("heading", { name: "Lịch sinh hoạt" });
  assert.equal(screen.queryByRole("button", { name: "Tạo sinh hoạt" }), null);
  assert.ok(screen.getByRole("button", { name: "Xuất Word" }));
  assert.equal(screen.queryByRole("link", { name: "Nhóm email" }), null);
  await user.click(
    await screen.findByRole("button", { name: /08:00 Sinh hoạt 1/ }),
  );
  assert.equal(
    (
      (await screen.findByRole("textbox", {
        name: "Nội dung sinh hoạt",
      })) as HTMLTextAreaElement
    ).readOnly,
    true,
  );
  assert.equal(screen.queryByRole("button", { name: "Lưu thay đổi" }), null);
});
test("calendar denies other roles even with forged calendar feature flags", async () => {
  const { calls } = setup("user");
  await screen.findByRole("alert");
  assert.equal(
    calls.some((c) => c.path.startsWith("/api/events?")),
    false,
  );
});
test("calendar shows an actionable error and an empty range state", async () => {
  setup("admin", undefined, 0, true);
  await screen.findByText("Không thể tải lịch thử nghiệm.");
  assert.ok(screen.getByRole("button", { name: "Thử lại" }));
});
test("email group bulk entry reports invalid/duplicate/existing values and preserves invalid text for correction", async () => {
  const { saved } = setup("admin", <EmailGroupsPage />),
    user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: /Nhóm A Sinh hoạt thanh niên/ }),
  );
  const input = await screen.findByRole("textbox", {
    name: "Danh sách email cần thêm",
  });
  fireEvent.change(input, {
    target: {
      value:
        "NEW@example.test;new@example.test\nold@example.test;invalid-address",
    },
  });
  assert.ok(screen.getByText("Không hợp lệ: 1"));
  assert.ok(screen.getByText("Trùng trong nội dung: 1"));
  assert.ok(screen.getByText("Đã có trong nhóm: 1"));
  await user.click(
    screen.getByRole("button", { name: "Thêm 1 địa chỉ hợp lệ" }),
  );
  await screen.findByText("Đã thêm 1 địa chỉ");
  await waitFor(() =>
    assert.equal(
      (
        screen.getByRole("textbox", {
          name: "Danh sách email cần thêm",
        }) as HTMLTextAreaElement
      ).value,
      "invalid-address",
    ),
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Tên nhóm" }), {
    target: { value: "Nhóm được đổi tên" },
  });
  await user.click(screen.getByRole("button", { name: "Lưu nhóm" }));
  await waitFor(() => assert.equal(saved.length, 1));
  assert.equal(saved[0].version, 1);
});
test("export uses edited preview, confirms regeneration, validates range and revokes the download URL", async () => {
  const date = todayInChurch(),
    { saved, events, downloads, revoked } = setup(
      "admin",
      <CalendarExport date={date} onClose={() => {}} />,
    ),
    user = userEvent.setup();
  const input = await screen.findByRole("textbox", {
    name: "Bản xem trước xuất Word",
  });
  assert.ok(
    screen.getByRole("button", { name: "Tuần đã chọn (Chúa nhật – thứ bảy)" }),
  );
  fireEvent.change(input, {
    target: { value: "Bản xuất đã sửa 🙏\nGiữ nguyên văn bản" },
  });
  await user.click(
    screen.getByRole("button", { name: "Tạo lại bản xem trước" }),
  );
  await screen.findByRole("dialog", { name: "Thay thế bản xem trước?" });
  await user.click(screen.getByRole("button", { name: "Giữ bản đang sửa" }));
  assert.equal(
    (input as HTMLTextAreaElement).value,
    "Bản xuất đã sửa 🙏\nGiữ nguyên văn bản",
  );
  await user.click(screen.getByRole("button", { name: "Tải Word (.docx)" }));
  await waitFor(() => assert.equal(saved.length, 1));
  assert.equal(saved[0].text, "Bản xuất đã sửa 🙏\nGiữ nguyên văn bản");
  assert.deepEqual(
    { from: saved[0].from, to: saved[0].to },
    calendarWeek(date),
  );
  assert.equal(events[0].title, "Sinh hoạt 1");
  assert.match(
    downloads[0],
    /^lich-sinh-hoat-\d{4}-\d{2}-\d{2}-den-\d{4}-\d{2}-\d{2}\.docx$/,
  );
  await waitFor(() => assert.equal(revoked.length, 1), { timeout: 2000 });
  fireEvent.change(screen.getByRole("textbox", { name: "Xuất đến ngày" }), {
    target: { value: "01/01/1900" },
  });
  await screen.findByRole("alert");
  assert.equal(
    (
      screen.getByRole("button", {
        name: "Tải Word (.docx)",
      }) as HTMLButtonElement
    ).disabled,
    true,
  );
});
test("Admin retries failed email from the notification bell", async () => {
  const { saved } = setup("admin", <FailureNotifications />),
    user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", {
      name: "Thông báo: 1 sinh hoạt gửi email thất bại",
    }),
  );
  await screen.findByText("Sinh hoạt lịch sử");
  assert.equal(screen.queryByText("sent@example.test"), null);
  await user.click(screen.getByRole("button", { name: "Thử lại" }));
  await waitFor(() => assert.equal(saved.length, 1));
  assert.ok(saved[0].requestId);
  await screen.findByText("Không có thông báo gửi email thất bại.");
});

test("the failure bell retries a Viber draft through its own endpoint", async () => {
  const { saved, calls } = setup(
      "admin",
      <FailureNotifications />,
      1,
      false,
      false,
      false,
      false,
      "worship_viber",
    ),
    user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", {
      name: "Thông báo: 1 sinh hoạt gửi email thất bại",
    }),
  );
  await screen.findByText("Email bản nháp Viber");
  await user.click(screen.getByRole("button", { name: "Thử lại" }));
  await waitFor(() => assert.equal(saved.length, 1));
  assert.equal(
    calls.some(
      (call) =>
        call.path === "/api/worship-viber-drafts/batch-one/retry" &&
        call.method === "POST",
    ),
    true,
  );
  assert.equal(
    calls.some(
      (call) =>
        call.path === "/api/notifications/batch-one/retry" &&
        call.method === "POST",
    ),
    false,
  );
});
test("empty calendar offers date selection without inventing an event", async () => {
  const { saved } = setup("admin", undefined, 0);
  await screen.findByText(
    "Chưa có sinh hoạt trong khoảng ngày này. Chọn một ngày để thêm.",
  );
  assert.equal(saved.length, 0);
});

test("group creation and destructive group/address actions require explicit confirmation", async () => {
  const { calls } = setup("admin", <EmailGroupsPage />),
    user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Tạo nhóm" }));
  fireEvent.change(await screen.findByRole("textbox", { name: "Tên nhóm" }), {
    target: { value: "Nhóm mới cần xóa" },
  });
  await user.click(screen.getByRole("button", { name: "Lưu nhóm" }));
  await user.click(
    await screen.findByRole("button", { name: /Nhóm mới cần xóa/ }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Xóa nhóm email" }),
  );
  assert.equal(
    calls.filter(
      (c) => c.path.startsWith("/api/email-groups/") && c.method === "DELETE",
    ).length,
    0,
  );
  await user.click(
    await screen.findByRole("button", { name: "Xác nhận xóa nhóm" }),
  );
  await waitFor(() =>
    assert.equal(
      screen.queryByRole("button", { name: /Nhóm mới cần xóa/ }),
      null,
    ),
  );
  await user.click(
    screen.getByRole("button", { name: /Nhóm A Sinh hoạt thanh niên/ }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Xóa old@example.test" }),
  );
  assert.equal(
    calls.filter((c) => c.path.includes("/members/") && c.method === "DELETE")
      .length,
    0,
  );
  await user.click(
    await screen.findByRole("button", { name: "Xác nhận xóa địa chỉ" }),
  );
  await waitFor(() =>
    assert.equal(
      calls.filter((c) => c.path.includes("/members/") && c.method === "DELETE")
        .length,
      1,
    ),
  );
});

test("event deletion conflicts are visible inside the confirmation rather than hidden behind it", async () => {
  setup();
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: /08:00 Sinh hoạt 1/ }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Xóa sinh hoạt" }),
  );
  const dialog = await screen.findByRole("dialog", { name: "Xóa sinh hoạt?" });
  await user.click(
    within(dialog).getByRole("button", { name: "Xác nhận xóa" }),
  );
  await within(dialog).findByText("Sinh hoạt đã được cập nhật. Hãy tải lại.");
});

test("8 November 2026 stays under Sunday in the month and week grids and has the correct day label", async () => {
  const { date } = setup("admin", undefined, 0),
    user = userEvent.setup();
  await screen.findByRole("heading", { name: "Lịch sinh hoạt" });
  const months =
    (2026 - Number(date.slice(0, 4))) * 12 + 11 - Number(date.slice(5, 7));
  for (let index = 0; index < Math.abs(months); index++)
    await user.click(
      screen.getByRole("button", {
        name: months > 0 ? "Khoảng sau" : "Khoảng trước",
      }),
    );
  if (months === 0) {
    await user.click(screen.getByRole("button", { name: "Khoảng trước" }));
    await user.click(screen.getByRole("button", { name: "Khoảng sau" }));
  }
  await waitFor(() =>
    assert.ok(document.querySelector('[data-calendar-date="2026-11-08"]')),
  );
  const sunday = document.querySelector(
    '[data-calendar-date="2026-11-08"]',
  ) as HTMLElement;
  const saturday = document.querySelector(
    '[data-calendar-date="2026-11-07"]',
  ) as HTMLElement;
  assert.equal(sunday.style.gridColumnStart, "1");
  assert.equal(saturday.style.gridColumnStart, "7");
  const cells = [
    ...sunday.parentElement!.querySelectorAll("[data-calendar-date]"),
  ];
  assert.equal(cells.indexOf(sunday) % 7, 0);
  assert.equal(cells.indexOf(saturday) % 7, 6);
  await user.click(screen.getByRole("button", { name: "Tuần" }));
  // A month navigation sets the anchor to its first day. In November 2026 the
  // second week therefore starts on Sunday 8 November.
  if (!document.querySelector('[data-calendar-date="2026-11-08"]'))
    await user.click(screen.getByRole("button", { name: "Khoảng sau" }));
  await waitFor(() =>
    assert.ok(document.querySelector('[data-calendar-date="2026-11-08"]')),
  );
  const weekSunday = document.querySelector(
    '[data-calendar-date="2026-11-08"]',
  ) as HTMLElement;
  assert.equal(weekSunday.style.gridColumnStart, "1");
  assert.equal(
    weekSunday.parentElement!.firstElementChild?.getAttribute(
      "data-calendar-date",
    ),
    "2026-11-08",
  );
  await user.click(screen.getByRole("button", { name: "Ngày" }));
  await screen.findByRole("heading", { name: "Chúa nhật, 08/11/2026" });
});
