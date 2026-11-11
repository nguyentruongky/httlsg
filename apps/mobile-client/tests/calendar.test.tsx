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
  calendarExportPreview,
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
const component = fileURLToPath(new URL("../src/calendar/", import.meta.url));
await build({
  stdin: {
    contents: `export {EventEditor} from ${JSON.stringify(join(component, "event-editor.tsx"))};export {WorshipViberDraftPage} from ${JSON.stringify(join(component, "worship-viber-draft-page.tsx"))};export {CalendarPage} from ${JSON.stringify(join(component, "calendar-page.tsx"))}; export {EmailGroupsPage} from ${JSON.stringify(join(component, "email-groups-page.tsx"))};export {CalendarExport} from ${JSON.stringify(join(component, "calendar-export.tsx"))};export {FailureNotifications} from ${JSON.stringify(join(component, "failure-notifications.tsx"))};`,
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
  EventEditor,
  CalendarPage,
  EmailGroupsPage,
  CalendarExport,
  FailureNotifications,
  WorshipViberDraftPage,
} = (await import(pathToFileURL(output).href)) as {
  EventEditor: (typeof import("../src/calendar/event-editor"))["EventEditor"];
  WorshipViberDraftPage: (typeof import("../src/calendar/worship-viber-draft-page"))["WorshipViberDraftPage"];
  CalendarPage: (typeof import("../src/calendar/calendar-page"))["CalendarPage"];
  EmailGroupsPage: (typeof import("../src/calendar/email-groups-page"))["EmailGroupsPage"];
  CalendarExport: (typeof import("../src/calendar/calendar-export"))["CalendarExport"];
  FailureNotifications: (typeof import("../src/calendar/failure-notifications"))["FailureNotifications"];
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
  fixtureDate = todayInChurch(),
) {
  const date = fixtureDate,
    calls: { path: string; method: string; body: any }[] = [],
    saved: any[] = [],
    downloads: string[] = [],
    revoked: string[] = [];
  const groups: EmailGroup[] = [
    {
      id: "60000000-0000-4000-8000-000000000001",
      name: "Nhóm A",
      description: "Chương trình thanh niên",
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
    title: `Chương trình ${i + 1}`,
    timeText: i === 0 ? "08:00" : null,
    startTime: i === 0 ? "08:00" : null,
    endTime: null,
    details: "Kinh Thánh 🙏",
    originalText: `Chương trình ${i + 1}\n${i === 0 ? "08:00\n" : ""}Kinh Thánh 🙏`,
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
      return json(
        { message: "Chương trình đã được cập nhật. Hãy tải lại." },
        409,
      );
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
        ...calendarExportPreview(events, range),
        count: events.length,
      });
    }
    if (path === "/api/events/export/email") {
      saved.push(body);
      return json({
        sent: 2,
        failed: 0,
        uncertain: 0,
        sending: 0,
        exhausted: false,
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
                title: "Chương trình lịch sử",
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
            title: "Chương trình lịch sử",
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
test("calendar shows a Sunday-first month, changes months, and expands crowded days", async () => {
  const { date, calls } = setup("admin", undefined, 5),
    user = userEvent.setup();
  await screen.findByRole("heading", { name: "Lịch sinh hoạt" });
  await screen.findByRole("button", { name: /\+2 chương trình khác/ });
  const weekday = screen.getByText("CN");
  const weekdays = weekday.parentElement!.parentElement!;
  assert.equal(weekdays.children[0].textContent, "CN");
  assert.equal(weekdays.children[6].textContent, "T7");
  assert.equal(screen.queryByRole("button", { name: "Hôm nay" }), null);
  assert.equal(screen.queryByRole("button", { name: "Tuần" }), null);
  const month = calendarMonth(date);
  assert.ok(
    calls.some(
      (c) => c.path === `/api/events?from=${month.from}&to=${month.to}`,
    ),
  );
  await user.click(
    screen.getByRole("button", { name: "+2 chương trình khác" }),
  );
  await screen.findByText("Chương trình 5");
  const before = calls.filter((c) => c.path.startsWith("/api/events?")).length;
  const nextMonth = new Date(date.slice(0, 7) + "-01T12:00:00Z");
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const nextRange = calendarMonth(nextMonth.toISOString().slice(0, 10));
  await user.click(screen.getByRole("button", { name: "Tháng sau" }));
  await waitFor(() =>
    assert.ok(
      calls.some(
        (call) =>
          call.path === `/api/events?from=${nextRange.from}&to=${nextRange.to}`,
      ) &&
        calls.filter((call) => call.path.startsWith("/api/events?")).length >
          before,
    ),
  );
  await user.click(screen.getByRole("button", { name: "Tháng trước" }));
});
test("date selection saves selected groups directly without recipient preview or confirmation", async () => {
  const { date, saved, calls } = setup(),
    user = userEvent.setup();
  await screen.findByRole("button", {
    name: `Tạo chương trình ${displayCalendarDate(date)}`,
  });
  fireEvent.click(document.querySelector(`[data-calendar-date="${date}"]`)!);
  const input = await screen.findByRole("textbox", {
    name: "Nội dung chương trình",
  });
  fireEvent.change(input, {
    target: { value: "Buổi nhóm 🙏\n08h00 - 10h00\nNội dung\n\n- Cầu nguyện" },
  });
  assert.equal(
    (input as HTMLTextAreaElement).value,
    "Buổi nhóm 🙏\n08h00 - 10h00\nNội dung\n\n- Cầu nguyện",
  );
  await user.click(await screen.findByRole("checkbox", { name: /Nhóm A/ }));
  const button = screen.getByRole("button", { name: "Lưu chương trình" });
  assert.equal((button as HTMLButtonElement).disabled, false);
  assert.equal(
    screen.queryByRole("checkbox", {
      name: "Tôi xác nhận gửi thông báo khi tạo chương trình",
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
  await screen.findByText("Đã lưu chương trình");
});
test("worship uses the current selected date without rewriting text on later date edits", async () => {
  const { date } = setup(),
    user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", {
      name: `Tạo chương trình ${displayCalendarDate(date)}`,
    }),
  );
  const dateField = screen.getByRole("textbox", { name: "Ngày chương trình" });
  fireEvent.change(dateField, { target: { value: "08/11/2026" } });
  const input = screen.getByRole("textbox", {
    name: "Nội dung chương trình",
  }) as HTMLTextAreaElement;
  await waitFor(() =>
    assert.ok(
      input.value.startsWith(
        renderEventPreset(EVENT_PRESETS[0], {
          date: "2026-11-08",
          service_number: "1",
        }).split("\n")[0],
      ),
    ),
  );
  assert.equal(
    screen.queryByRole("button", { name: "Mẫu chương trình" }),
    null,
  );
  fireEvent.change(dateField, { target: { value: "12/11/2026" } });
  assert.equal(screen.queryByRole("option"), null);
  assert.ok(
    input.value.startsWith(
      renderEventPreset(EVENT_PRESETS[0], {
        date: "2026-11-08",
        service_number: "1",
      }).split("\n")[0],
    ),
  );
});
test("editing an existing event sends on save without a separate notification action", async () => {
  const { saved, calls } = setup(),
    user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: /08:00 Chương trình 1/ }),
  );
  const input = await screen.findByRole("textbox", {
    name: "Nội dung chương trình",
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
    await screen.findByRole("button", { name: /08:00 Chương trình 1/ }),
  );
  await user.click(await screen.findByRole("checkbox", { name: "Nhóm A" }));
  await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await screen.findByText(
    "Email chưa gửi đầy đủ. Mở chuông thông báo để thử lại.",
  );
  assert.equal(saved.length, 1);
  assert.equal(
    screen.queryByRole("textbox", { name: "Nội dung chương trình" }),
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
    await screen.findByRole("button", {
      name: /LỊCH TRỰC NGÀY|Chương trình thờ phượng Chúa ngày/,
    }),
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
    screen.getByRole("textbox", { name: "Nội dung chương trình" }),
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
test("worship editor flags duplicate hymns live, clears corrected duplicates and still allows saving", async () => {
  const { saved, calls } = setup(
    "admin",
    undefined,
    1,
    false,
    false,
    false,
    "missing",
  );
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", {
      name: /LỊCH TRỰC NGÀY|Chương trình thờ phượng Chúa ngày/,
    }),
  );
  const input = screen.getByRole("textbox", {
    name: "Nội dung chương trình",
  }) as HTMLTextAreaElement;
  const text =
    "LỊCH TRỰC NGÀY 08/11/2026 – LỄ 2\nNKTP (Hát dẫn):\n1. TC 47 (1,2–3,4)\n2. TC 674 (1,2–3)\nBan Hát Lễ: Ban Tráng Niên tôn vinh Chúa – TC 674";
  fireEvent.change(input, { target: { value: text } });
  const warning = await screen.findByRole("alert", {
    name: "Cảnh báo Thánh Ca trùng",
  });
  assert.ok(within(warning).getByText("TC 674 xuất hiện 2 lần"));
  assert.ok(
    within(warning).getByText("Hát dẫn (dòng 4) · Ban Hát Lễ (dòng 5)"),
  );
  assert.ok(warning.className.includes("text-destructive"));
  assert.equal(saved.length, 0);
  assert.equal(
    calls.filter((call) => ["POST", "PATCH"].includes(call.method)).length,
    0,
  );
  fireEvent.change(input, {
    target: { value: text.replace("Chúa – TC 674", "Chúa – TC 675") },
  });
  assert.equal(
    screen.queryByRole("alert", { name: "Cảnh báo Thánh Ca trùng" }),
    null,
  );
  fireEvent.change(input, { target: { value: text } });
  await screen.findByRole("alert", { name: "Cảnh báo Thánh Ca trùng" });
  const save = screen.getByRole("button", {
    name: "Lưu thay đổi",
  }) as HTMLButtonElement;
  assert.equal(save.disabled, false);
  await user.click(save);
  await waitFor(() => assert.equal(saved.length, 1));
  assert.equal(saved[0].originalText, text);
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
    await screen.findByRole("button", {
      name: /LỊCH TRỰC NGÀY|Chương trình thờ phượng Chúa ngày/,
    }),
  );
  await user.click(await screen.findByRole("checkbox", { name: "Nhóm A" }));
  const input = screen.getByRole("textbox", {
    name: "Nội dung chương trình",
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
  await screen.findByText("Đã lưu chương trình");
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
    await screen.findByRole("button", {
      name: /LỊCH TRỰC NGÀY|Chương trình thờ phượng Chúa ngày/,
    }),
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
  assert.equal(
    screen.queryByRole("button", { name: "Tạo chương trình" }),
    null,
  );
  assert.ok(screen.getByRole("button", { name: "Tải thông báo" }));
  assert.equal(screen.queryByRole("link", { name: "Nhóm email" }), null);
  await user.click(
    await screen.findByRole("button", { name: /08:00 Chương trình 1/ }),
  );
  await screen.findByRole("dialog", { name: "Chương trình 1" });
  assert.equal(screen.queryByRole("button", { name: "Chỉnh sửa" }), null);
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
    await screen.findByRole("button", {
      name: /Nhóm A Chương trình thanh niên/,
    }),
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
    name: /Bản xem trước xuất (file )?Word/,
  });
  assert.equal(
    screen.queryByRole("button", {
      name: "Tuần đã chọn (Chúa nhật – thứ bảy)",
    }),
    null,
  );
  const previous = screen.getByRole("button", { name: "Tuần trước" });
  const next = screen.getByRole("button", { name: "Tuần sau" });
  const navigation = previous.parentElement!;
  assert.equal(navigation.children[0], previous);
  assert.equal(navigation.children[2], next);
  assert.ok(navigation.children[1].textContent?.includes(" – "));
  assert.equal(screen.queryByText(/ · \d+ chương trình/), null);
  assert.ok((input as HTMLTextAreaElement).value.includes("1. "));
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
  await user.click(
    screen.getByRole("button", { name: /Tải (file )?Word \(.docx\)/ }),
  );
  await waitFor(() => assert.equal(saved.length, 1));
  assert.equal(saved[0].text, "Bản xuất đã sửa 🙏\nGiữ nguyên văn bản");
  assert.deepEqual(
    { from: saved[0].from, to: saved[0].to },
    calendarWeek(date),
  );
  assert.equal(events[0].title, "Chương trình 1");
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
        name: /Tải (file )?Word \(.docx\)/,
      }) as HTMLButtonElement
    ).disabled,
    true,
  );
});
test("export moves between Sunday-first weeks across year boundaries and downloads the displayed week", async () => {
  const { saved, calls } = setup(
    "admin",
    <CalendarExport date="2026-12-31" onClose={() => {}} />,
  );
  const user = userEvent.setup();
  await screen.findByRole("textbox", {
    name: /Bản xem trước xuất (file )?Word/,
  });
  await user.click(screen.getByRole("button", { name: "Tuần sau" }));
  await waitFor(() => {
    assert.equal(
      (
        screen.getByRole("textbox", {
          name: "Xuất từ ngày",
        }) as HTMLInputElement
      ).value,
      "03/01/2027",
    );
    assert.equal(
      (
        screen.getByRole("button", {
          name: /Tải (file )?Word \(.docx\)/,
        }) as HTMLButtonElement
      ).disabled,
      false,
    );
  });
  assert.ok(
    calls.some(
      (call) =>
        call.path === "/api/events/export?from=2027-01-03&to=2027-01-09",
    ),
  );
  await user.click(
    screen.getByRole("button", { name: /Tải (file )?Word \(.docx\)/ }),
  );
  await waitFor(() => assert.equal(saved.length, 1));
  assert.equal(saved[0].from, "2027-01-03");
  assert.equal(saved[0].to, "2027-01-09");
  await user.click(screen.getByRole("button", { name: "Tuần trước" }));
  await waitFor(() =>
    assert.equal(
      (
        screen.getByRole("textbox", {
          name: "Xuất từ ngày",
        }) as HTMLInputElement
      ).value,
      "27/12/2026",
    ),
  );
  await user.click(screen.getByRole("button", { name: "Tuần trước" }));
  await waitFor(() =>
    assert.equal(
      (
        screen.getByRole("textbox", {
          name: "Xuất từ ngày",
        }) as HTMLInputElement
      ).value,
      "20/12/2026",
    ),
  );
  await user.click(screen.getByRole("button", { name: "Tuần sau" }));
  await waitFor(() =>
    assert.equal(
      (
        screen.getByRole("textbox", {
          name: "Xuất từ ngày",
        }) as HTMLInputElement
      ).value,
      "27/12/2026",
    ),
  );
});
test("changing export week keeps the same dialog and preview visible until the response arrives", async () => {
  const { events } = setup(
    "admin",
    <CalendarExport date="2026-11-01" onClose={() => {}} />,
  );
  const user = userEvent.setup();
  const input = (await screen.findByRole("textbox", {
    name: /Bản xem trước xuất (file )?Word/,
  })) as HTMLTextAreaElement;
  const dialog = screen.getByRole("dialog", { name: "Xuất lịch chương trình" });
  const originalText = input.value;
  const originalFetch = globalThis.fetch;
  let release: (() => void) | undefined;
  globalThis.fetch = async (url, init) => {
    if (String(url) === "/api/events/export?from=2026-11-08&to=2026-11-14")
      return new Promise<Response>((resolve) => {
        release = () =>
          resolve(
            json({
              from: "2026-11-08",
              to: "2026-11-14",
              text: calendarExportText(events, {
                from: "2026-11-08",
                to: "2026-11-14",
              }),
              count: events.length,
            }),
          );
      });
    return originalFetch(url, init);
  };
  try {
    await user.click(screen.getByRole("button", { name: "Tuần sau" }));
    await waitFor(() => assert.ok(release));
    assert.equal(
      screen.getByRole("dialog", { name: "Xuất lịch chương trình" }),
      dialog,
    );
    assert.equal(
      screen.getByRole("textbox", { name: /Bản xem trước xuất (file )?Word/ }),
      input,
    );
    assert.equal(input.value, originalText);
    assert.equal(input.disabled, false);
    assert.equal(input.readOnly, true);
    assert.equal(
      (
        screen.getByRole("textbox", {
          name: "Xuất từ ngày",
        }) as HTMLInputElement
      ).value,
      "01/11/2026",
    );
    assert.equal(screen.queryByText(/Khoảng ngày đã thay đổi/), null);
    release!();
    await waitFor(() =>
      assert.equal(
        (
          screen.getByRole("textbox", {
            name: "Xuất từ ngày",
          }) as HTMLInputElement
        ).value,
        "08/11/2026",
      ),
    );
    assert.equal(
      screen.getByRole("dialog", { name: "Xuất lịch chương trình" }),
      dialog,
    );
    assert.equal(
      screen.getByRole("textbox", { name: /Bản xem trước xuất (file )?Word/ }),
      input,
    );
    assert.equal(input.readOnly, false);
    assert.equal(
      input.value,
      calendarExportText(events, { from: "2026-11-08", to: "2026-11-14" }),
    );
  } finally {
    release?.();
    globalThis.fetch = originalFetch;
  }
});
test("export week navigation preserves edited text on cancel and regenerates only after confirmation", async () => {
  const { calls } = setup(
    "admin",
    <CalendarExport date="2026-11-08" onClose={() => {}} />,
  );
  const user = userEvent.setup();
  const preview = (await screen.findByRole("textbox", {
    name: /Bản xem trước xuất (file )?Word/,
  })) as HTMLTextAreaElement;
  fireEvent.change(preview, { target: { value: "Bản đang sửa" } });
  const count = calls.filter((call) =>
    call.path.startsWith("/api/events/export?"),
  ).length;
  await user.click(screen.getByRole("button", { name: "Tuần sau" }));
  await screen.findByRole("dialog", { name: "Thay thế bản xem trước?" });
  await user.click(screen.getByRole("button", { name: "Giữ bản đang sửa" }));
  assert.equal(preview.value, "Bản đang sửa");
  assert.equal(
    (screen.getByRole("textbox", { name: "Xuất từ ngày" }) as HTMLInputElement)
      .value,
    "08/11/2026",
  );
  assert.equal(
    calls.filter((call) => call.path.startsWith("/api/events/export?")).length,
    count,
  );
  await user.click(screen.getByRole("button", { name: "Tuần sau" }));
  await user.click(
    await screen.findByRole("button", { name: "Xác nhận tạo lại" }),
  );
  await waitFor(() =>
    assert.equal(
      (
        screen.getByRole("textbox", {
          name: "Xuất từ ngày",
        }) as HTMLInputElement
      ).value,
      "15/11/2026",
    ),
  );
  await waitFor(() =>
    assert.equal(
      screen.queryByRole("dialog", { name: "Thay thế bản xem trước?" }),
      null,
    ),
  );
  assert.notEqual(preview.value, "Bản đang sửa");
  assert.ok(
    calls.some(
      (call) =>
        call.path === "/api/events/export?from=2026-11-15&to=2026-11-21",
    ),
  );
});
test("deleting an export event immediately renumbers the remaining events in the preview, email and Word payloads", async () => {
  const { events, saved } = setup(
    "admin",
    <CalendarExport date="2026-11-01" onClose={() => {}} />,
    3,
  );
  const user = userEvent.setup();
  const input = (await screen.findByRole("textbox", {
    name: /Bản xem trước xuất (file )?Word/,
  })) as HTMLTextAreaElement;
  const initial = calendarExportPreview(events, calendarWeek("2026-11-01"));
  const middle = initial.headingRanges[1];
  const end = initial.text.indexOf("\n\n", middle.end) + 2;
  fireEvent.change(input, {
    target: {
      value: initial.text.slice(0, middle.start) + initial.text.slice(end),
    },
  });
  const headings = input.value
    .split("\n")
    .filter((line) => /^\d+\. /.test(line));
  assert.equal(headings.length, 2);
  assert.ok(headings[0].startsWith("1. "));
  assert.ok(headings[1].startsWith("2. "));
  const text = input.value;
  await user.click(
    screen.getByRole("button", { name: "Gửi email Ban Trình chiếu" }),
  );
  await waitFor(() => assert.equal(saved.length, 1));
  assert.equal(saved[0].preview.text, text);
  await user.click(
    screen.getByRole("button", { name: /Tải (file )?Word \(.docx\)/ }),
  );
  await waitFor(() => assert.equal(saved.length, 2));
  assert.equal(saved[1].text, text);
});
test("Admin sends the edited export preview to Ban Trình chiếu once and Secretary cannot see the action", async () => {
  const { saved } = setup(
    "admin",
    <CalendarExport date="2026-11-01" onClose={() => {}} />,
  );
  const user = userEvent.setup();
  const preview = await screen.findByRole("textbox", {
    name: /Bản xem trước xuất (file )?Word/,
  });
  fireEvent.change(preview, {
    target: { value: "Bản gửi đã chỉnh sửa 🙏\n1. Thờ phượng" },
  });
  await user.click(
    screen.getByRole("button", { name: "Gửi email Ban Trình chiếu" }),
  );
  await screen.findByText("Đã gửi email đến Ban Trình chiếu (2/2 địa chỉ).");
  assert.equal(saved.length, 1);
  assert.deepEqual(saved[0].preview, {
    from: "2026-11-01",
    to: "2026-11-07",
    text: "Bản gửi đã chỉnh sửa 🙏\n1. Thờ phượng",
  });
  assert.ok(saved[0].requestId);
  assert.equal(
    (
      screen.getByRole("button", {
        name: "Đã gửi Ban Trình chiếu",
      }) as HTMLButtonElement
    ).disabled,
    true,
  );
  cleanup();
  setup("secretary", <CalendarExport date="2026-11-01" onClose={() => {}} />);
  await screen.findByRole("textbox", {
    name: /Bản xem trước xuất (file )?Word/,
  });
  assert.equal(
    screen.queryByRole("button", { name: "Gửi email Ban Trình chiếu" }),
    null,
  );
});
test("export email partial failure retries the same snapshot and request ID", async () => {
  const { saved } = setup(
    "admin",
    <CalendarExport date="2026-11-01" onClose={() => {}} />,
  );
  const user = userEvent.setup();
  await screen.findByRole("textbox", {
    name: /Bản xem trước xuất (file )?Word/,
  });
  const original = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async (input, init) => {
    if (String(input) === "/api/events/export/email") {
      attempts++;
      saved.push(JSON.parse(String(init?.body)));
      return json({
        sent: attempts === 1 ? 1 : 2,
        failed: attempts === 1 ? 1 : 0,
        uncertain: 0,
        sending: 0,
        exhausted: false,
      });
    }
    return original(input, init);
  };
  await user.click(
    screen.getByRole("button", { name: "Gửi email Ban Trình chiếu" }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Thử gửi lại Ban Trình chiếu" }),
  );
  await screen.findByText("Đã gửi email đến Ban Trình chiếu (2/2 địa chỉ).");
  assert.equal(saved.length, 2);
  assert.deepEqual(saved[0], saved[1]);
});
test("Admin retries failed email from the notification bell", async () => {
  const { saved } = setup("admin", <FailureNotifications />),
    user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", {
      name: "Thông báo: 1 chương trình gửi email thất bại",
    }),
  );
  await screen.findByText("Chương trình lịch sử");
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
      name: "Thông báo: 1 chương trình gửi email thất bại",
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
    "Chưa có chương trình trong khoảng ngày này. Chọn một ngày để thêm.",
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
    screen.getByRole("button", { name: /Nhóm A Chương trình thanh niên/ }),
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
    await screen.findByRole("button", { name: /08:00 Chương trình 1/ }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Xóa chương trình" }),
  );
  const dialog = await screen.findByRole("dialog", {
    name: "Xóa chương trình?",
  });
  await user.click(
    within(dialog).getByRole("button", { name: "Xác nhận xóa" }),
  );
  await within(dialog).findByText(
    "Chương trình đã được cập nhật. Hãy tải lại.",
  );
});

test("8 November 2026 stays under Sunday in the month grid", async () => {
  const { date } = setup("admin", undefined, 0),
    user = userEvent.setup();
  await screen.findByRole("heading", { name: "Lịch sinh hoạt" });
  const months =
    (2026 - Number(date.slice(0, 4))) * 12 + 11 - Number(date.slice(5, 7));
  for (let index = 0; index < Math.abs(months); index++)
    await user.click(
      screen.getByRole("button", {
        name: months > 0 ? "Tháng sau" : "Tháng trước",
      }),
    );
  if (months === 0) {
    await user.click(screen.getByRole("button", { name: "Tháng trước" }));
    await user.click(screen.getByRole("button", { name: "Tháng sau" }));
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
  assert.equal(screen.getByText("CN").textContent, "CN");
  assert.equal(screen.getByText("T7").textContent, "T7");
});

for (const [date, presetId] of [
  ["2026-11-08", "worship-program"],
  ["2026-11-10", "tvcs-fellowship"],
  ["2026-11-09", "evangelism-fellowship"],
  ["2026-11-11", "weekly-bible-study"],
]) {
  test(
    "new editor hides the single preset and automatically selects " + presetId,
    async () => {
      const { saved } = setup(
        "admin",
        <EventEditor date={date} onClose={() => {}} />,
        0,
        false,
        false,
        true,
        false,
        "calendar",
        date,
      );
      const input = (await screen.findByRole("textbox", {
        name: "Nội dung chương trình",
      })) as HTMLTextAreaElement;
      const preset = EVENT_PRESETS.find((p) => p.id === presetId)!;
      await waitFor(() =>
        assert.equal(
          input.value,
          renderEventPreset(preset, {
            date,
            service_number: presetId === "worship-program" ? "1" : undefined,
          }),
        ),
      );
      if (presetId === "worship-program" || presetId === "weekly-bible-study") {
        const lines = input.value.split("\n");
        const position =
          presetId === "worship-program"
            ? lines[0].length + 1 + lines[1].length
            : lines[0].length;
        await waitFor(() => {
          assert.ok(
            document.activeElement === input,
            "Composer should have focus",
          );
          assert.equal(input.selectionStart, position);
          assert.equal(input.selectionEnd, position);
        });
        input.setSelectionRange(1, 1);
        fireEvent.change(input, {
          target: { value: input.value + "\nChỉnh sửa" },
        });
        input.setSelectionRange(1, 1);
        await new Promise((resolve) => setTimeout(resolve, 0));
        assert.equal(
          input.selectionStart,
          1,
          "editing must not reset the cursor",
        );
      }
      assert.equal(screen.queryByRole("option"), null);
      assert.equal(
        screen.queryByRole("button", { name: "Mẫu chương trình" }),
        null,
      );
      assert.equal(
        screen.queryByRole("dialog", { name: "Chọn mẫu chương trình" }),
        null,
      );
      if (presetId === "worship-program")
        assert.equal(
          screen
            .getByRole("checkbox", { name: "Chương trình thờ phượng" })
            .getAttribute("aria-checked"),
          "true",
        );
      assert.equal(saved.length, 0);
      fireEvent.change(input, {
        target: { value: input.value + "\nChi tiết thêm" },
      });
      const edited = input.value;
      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: "Lưu chương trình" }));
      await waitFor(() => assert.equal(saved.length, 1));
      assert.equal(saved[0].originalText, edited);
    },
  );
}
test("Sunday editor counts saved worship events before filling Lễ 2", async () => {
  const date = "2026-11-08";
  const { calls } = setup(
    "admin",
    <EventEditor date={date} onClose={() => {}} />,
    1,
    false,
    false,
    true,
    "complete",
    "calendar",
    date,
  );
  const input = (await screen.findByRole("textbox", {
    name: "Nội dung chương trình",
  })) as HTMLTextAreaElement;
  await waitFor(() =>
    assert.ok(
      input.value.startsWith(
        renderEventPreset(EVENT_PRESETS[0], {
          date: "2026-11-08",
          service_number: "2",
        }).split("\n")[0],
      ),
    ),
  );
  assert.ok(
    calls.some(
      (call) => call.path === "/api/events?from=" + date + "&to=" + date,
    ),
  );
});

test("new program focuses its composer and blank nested day regions open creation", async () => {
  const { date } = setup("admin", undefined, 0);
  await screen.findByRole("heading", { name: "Lịch sinh hoạt" });
  await waitFor(() =>
    assert.ok(document.querySelector('[data-calendar-date="' + date + '"]')),
  );
  const cell = document.querySelector('[data-calendar-date="' + date + '"]')!;
  const blankRegion = cell.querySelector(".space-y-2")!;
  fireEvent.click(blankRegion);
  const composer = await screen.findByRole("textbox", {
    name: "Nội dung chương trình",
  });
  await waitFor(() =>
    assert.ok(
      document.activeElement === composer,
      "Composer should have focus",
    ),
  );
  assert.ok(screen.getByRole("dialog", { name: "Tạo chương trình" }));
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Đóng chương trình" }));
  fireEvent.click(blankRegion);
  await screen.findByRole("dialog", { name: "Tạo chương trình" });
});
test("clicking an existing event opens its detail before editing", async () => {
  setup();
  const user = userEvent.setup();
  const button = await screen.findByRole("button", {
    name: /08:00 Chương trình 1/,
  });
  await user.click(button);
  await screen.findByRole("dialog", { name: "Chương trình 1" });
  assert.equal(screen.queryByRole("button", { name: "Lưu thay đổi" }), null);
  await user.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
  await screen.findByRole("button", { name: "Lưu thay đổi" });
  assert.equal(
    screen.queryByRole("dialog", { name: "Tạo chương trình" }),
    null,
  );
});

for (const date of ["2026-11-12", "2026-11-13", "2026-11-14"]) {
  test(
    "preset selector remains hidden on unrestricted date " + date,
    async () => {
      setup(
        "admin",
        <EventEditor date={date} onClose={() => {}} />,
        0,
        false,
        false,
        false,
        false,
        "calendar",
        date,
      );
      const composer = (await screen.findByRole("textbox", {
        name: "Nội dung chương trình",
      })) as HTMLTextAreaElement;
      await screen.findByRole("checkbox", { name: "Nhóm A" });
      assert.equal(composer.value, "");
      assert.equal(
        screen.queryByRole("button", { name: "Mẫu chương trình" }),
        null,
      );
      assert.equal(screen.queryByRole("option"), null);
      assert.equal(screen.queryByText("Chọn mẫu chương trình"), null);
      fireEvent.change(composer, { target: { value: "Nội dung tự nhập" } });
      assert.equal(composer.value, "Nội dung tự nhập");
    },
  );
}
