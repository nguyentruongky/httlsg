import { afterEach, test, mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  render,
  cleanup,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@org/ui";
import {
  generateReceptionSchedule,
  listLocalScheduleDrafts,
  writeLocalScheduleDraft,
  readLocalScheduleDraft,
  clearLocalScheduleDrafts,
  clearBrowserAuth,
  type ScheduleRecord,
} from "@org/core";
import { ScheduleCopy } from "../src/schedules/schedule-copy";
import { ScheduleEditor } from "../src/schedules/schedule-editor";
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  clearLocalScheduleDrafts();
  mock.restoreAll();
});
const person = {
  memberId: randomUUID(),
  name: "Nguyễn Văn An",
  eligibility: "male_deacon" as const,
};
function fixture() {
  const generated = generateReceptionSchedule("2026-11", [person]);
  return {
    generated,
    category: {
      id: "reception" as const,
      name: "Lịch tiếp tân",
      description: "",
      isActive: true,
      version: 0,
      settings: generated.draft.settings,
      definitions: [],
      canManage: true,
    },
  };
}
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
test("local drafts isolate account/version and are removed on logout without touching other storage", () => {
  const ownerId = randomUUID(),
    requestId = randomUUID(),
    { generated } = fixture();
  const value = {
    ownerId,
    authVersion: 0,
    scope: "new:" + requestId,
    baseVersion: null,
    recordId: null,
    requestId,
    draft: generated.draft,
    names: generated.memberNames,
    notify: false,
    savedAt: new Date().toISOString(),
  };
  window.localStorage.setItem("unrelated-preference", "keep");
  assert.equal(writeLocalScheduleDraft(value), true);
  assert.equal(listLocalScheduleDrafts(ownerId, 0).length, 1);
  assert.equal(listLocalScheduleDrafts(randomUUID(), 0).length, 0);
  assert.equal(listLocalScheduleDrafts(ownerId, 1).length, 0);
  assert.equal(
    readLocalScheduleDraft(ownerId, 0, value.scope)?.requestId,
    requestId,
  );
  clearBrowserAuth();
  assert.equal(listLocalScheduleDrafts(ownerId, 0).length, 0);
  assert.equal(window.localStorage.getItem("unrelated-preference"), "keep");
  window.localStorage.removeItem("unrelated-preference");
});
test("reception autosaves, cancellation retains edits, and confirmed back discards the scoped local draft", async () => {
  const ownerId = randomUUID(),
    { generated, category } = fixture();
  let posts = 0,
    back = false;
  mock.method(globalThis, "fetch", async (_path: any, init: any = {}) => {
    if (init.method && init.method !== "GET") posts++;
    return Response.json({ items: [person] });
  });
  mount(
    <ScheduleEditor
      initial={generated.draft}
      initialNames={generated.memberNames}
      draftOwnerId={ownerId}
      category={category}
      departments={[]}
      onBack={() => {
        back = true;
      }}
      onSaved={() => {}}
    />,
  );
  for (const name of ["Lưu bản nháp", "Xóa bản nháp", "Hủy lịch"])
    assert.ok(screen.queryByRole("button", { name }) === null);
  const input = screen.getByRole("textbox", {
    name: "Sáng · Cửa chính · 01/11/2026",
  }) as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value: "CS Bản tạm đã sửa" } });
  await waitFor(() =>
    assert.equal(
      listLocalScheduleDrafts(ownerId, 0)[0]?.draft.events[0]
        .responsibilities[0].displayText,
      "CS Bản tạm đã sửa",
    ),
  );
  assert.equal(posts, 0);
  fireEvent.click(screen.getByRole("button", { name: "Về danh sách lịch" }));
  await screen.findByRole("dialog", { name: "Lịch chưa được gởi" });
  assert.equal(back, false);
  fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
  assert.equal(back, false);
  const cached = listLocalScheduleDrafts(ownerId, 0)[0];
  assert.ok(cached);
  cleanup();
  mount(
    <ScheduleEditor
      initial={cached.draft}
      initialNames={generated.memberNames}
      localDraft={cached}
      draftOwnerId={ownerId}
      category={category}
      departments={[]}
      onBack={() => {
        back = true;
      }}
      onSaved={() => {}}
    />,
  );
  assert.equal(
    (
      screen.getByRole("textbox", {
        name: "Sáng · Cửa chính · 01/11/2026",
      }) as HTMLTextAreaElement
    ).value,
    "CS Bản tạm đã sửa",
  );
  fireEvent.click(screen.getByRole("button", { name: "Về danh sách lịch" }));
  await screen.findByRole("dialog", { name: "Lịch chưa được gởi" });
  assert.ok(screen.getByText(/bản tạm và các thay đổi chưa lưu sẽ bị bỏ/));
  fireEvent.click(screen.getByRole("button", { name: "Rời trang" }));
  assert.equal(back, true);
  assert.equal(listLocalScheduleDrafts(ownerId, 0).length, 0);
  window.dispatchEvent(new Event("pagehide"));
  assert.equal(listLocalScheduleDrafts(ownerId, 0).length, 0);
  cleanup();
  mount(
    <ScheduleEditor
      initial={generated.draft}
      initialNames={generated.memberNames}
      draftOwnerId={ownerId}
      category={category}
      departments={[]}
      onBack={() => {}}
      onSaved={() => {}}
    />,
  );
  assert.notEqual(
    (
      screen.getByRole("textbox", {
        name: "Sáng · Cửa chính · 01/11/2026",
      }) as HTMLTextAreaElement
    ).value,
    "CS Bản tạm đã sửa",
  );
  assert.equal(posts, 0);
});

test("official plan cancellation and printing remain available; printing uses submitted content despite local edits", async () => {
  const { generated, category } = fixture();
  mock.method(globalThis, "fetch", async () =>
    Response.json({ items: [person] }),
  );
  const printed = mock.method(window, "print", () => {});
  const initial = {
    ...generated.draft,
    id: randomUUID(),
    version: 1,
    status: "published",
    createdBy: null,
    updatedBy: null,
    publishedAt: new Date().toISOString(),
    cancelledAt: null,
    memberNames: generated.memberNames,
    departmentNames: {},
  } as ScheduleRecord;
  mount(
    <ScheduleEditor
      initial={initial}
      category={category}
      departments={[]}
      onBack={() => {}}
      onSaved={() => {}}
    />,
  );
  assert.ok(screen.getByRole("button", { name: "Hủy lịch" }));
  assert.ok(screen.queryByRole("button", { name: "Xóa bản nháp" }) === null);
  fireEvent.change(
    screen.getByRole("textbox", { name: "Sáng · Cửa chính · 01/11/2026" }),
    { target: { value: "CS Bản tạm chưa nộp" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "In lịch chính thức" }));
  await waitFor(() => assert.equal(printed.mock.callCount(), 1));
  const printTable = screen.getAllByRole("table", {
    name: "Lịch tiếp tân",
  })[0];
  assert.equal(printTable.textContent?.includes("Bản tạm chưa nộp"), false);
  assert.ok(printTable.textContent?.includes("CS Văn An"));
});

test("submission clears the temporary copy and exposes official controls without a manual server draft save", async () => {
  const ownerId = randomUUID(),
    team = [
      ...Array.from({ length: 6 }, (_, i) => ({
        memberId: randomUUID(),
        name: `Nguyễn Chấp ${i}`,
        eligibility: "male_deacon" as const,
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        memberId: randomUUID(),
        name: `Trần Viên ${i}`,
        eligibility: "male" as const,
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        memberId: randomUUID(),
        name: `Lê Nữ ${i}`,
        eligibility: "female" as const,
      })),
    ],
    generated = generateReceptionSchedule("2026-11", team),
    category = {
      id: "reception" as const,
      name: "Lịch tiếp tân",
      description: "",
      isActive: true,
      version: 0,
      settings: generated.draft.settings,
      definitions: [],
      canManage: true,
    };
  const posts: string[] = [];
  let submitted = false,
    back = false;
  mock.method(globalThis, "fetch", async (path: any, init: any = {}) => {
    if (String(path) === "/api/reception-team")
      return Response.json({ items: team });
    posts.push(String(path));
    return Response.json({
      ...JSON.parse(init.body),
      id: randomUUID(),
      version: 1,
      status: "published",
      createdBy: null,
      updatedBy: null,
      publishedAt: new Date().toISOString(),
      cancelledAt: null,
      memberNames: generated.memberNames,
      departmentNames: {},
    });
  });
  mount(
    <ScheduleEditor
      initial={generated.draft}
      initialNames={generated.memberNames}
      draftOwnerId={ownerId}
      category={category}
      departments={[]}
      onBack={() => {
        back = true;
      }}
      onSaved={() => {
        submitted = true;
      }}
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
  assert.equal(listLocalScheduleDrafts(ownerId, 0).length, 1);
  assert.equal(posts.length, 0);
  fireEvent.click(screen.getByRole("button", { name: "Gởi lịch tiếp tân" }));
  fireEvent.click(await screen.findByRole("button", { name: "Xác nhận" }));
  await waitFor(() => assert.ok(submitted));
  assert.deepEqual(posts, ["/api/schedules/submit"]);
  assert.equal(listLocalScheduleDrafts(ownerId, 0).length, 0);
  assert.ok(screen.getByRole("button", { name: "Hủy lịch" }));
  assert.ok(screen.getByRole("button", { name: "In lịch chính thức" }));
  fireEvent.click(screen.getByRole("button", { name: "Về danh sách lịch" }));
  assert.ok(back);
});

test("storage failure is visible and never discards the edited draft", async () => {
  const ownerId = randomUUID(),
    { generated, category } = fixture();
  mock.method(globalThis, "fetch", async () =>
    Response.json({ items: [person] }),
  );
  mock.method(Object.getPrototypeOf(window.localStorage), "setItem", () => {
    throw new Error("quota");
  });
  mount(
    <ScheduleEditor
      initial={generated.draft}
      initialNames={generated.memberNames}
      draftOwnerId={ownerId}
      category={category}
      departments={[]}
      onBack={() => {}}
      onSaved={() => {}}
    />,
  );
  await screen.findByRole("alert");
  const input = screen.getByRole("textbox", {
    name: "Sáng · Cửa chính · 01/11/2026",
  }) as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value: "CS Nội dung còn nguyên" } });
  assert.equal(input.value, "CS Nội dung còn nguyên");
  assert.equal(listLocalScheduleDrafts(ownerId, 0).length, 0);
  fireEvent.click(screen.getByRole("button", { name: "Về danh sách lịch" }));
  await screen.findByRole("dialog", { name: "Lịch chưa được gởi" });
  assert.ok(screen.getByText(/bản tạm và các thay đổi chưa lưu sẽ bị bỏ/));
});

test("reception copying opens a local working draft without invoking the server copy endpoint", async () => {
  const { generated } = fixture(),
    sourceId = randomUUID(),
    paths: string[] = [];
  let copied = false;
  mock.method(globalThis, "fetch", async (path: any) => {
    paths.push(String(path));
    if (String(path).endsWith("/copy-preview"))
      return Response.json({ draft: generated.draft, issues: [] });
    return Response.json({ version: 1, memberNames: generated.memberNames });
  });
  mount(
    <ScheduleCopy
      source={{
        id: sourceId,
        categoryId: "reception",
        title: "Lịch gốc",
        version: 1,
        periodStart: "2026-11-01",
        periodEnd: "2026-11-30",
      }}
      onClose={() => {}}
      onCopied={() => {
        throw new Error("Must not create server draft");
      }}
      onLocalCopied={(draft, names) => {
        assert.equal(draft.events.length, 10);
        assert.deepEqual(names, generated.memberNames);
        copied = true;
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Xem trước ngày mới" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Tiếp tục chỉnh sửa bản sao" }),
  );
  await waitFor(() => assert.ok(copied));
  assert.ok(paths.every((path) => !path.endsWith("/copy")));
});

test("confirmed back discards pending official edits while preserving the official record and other local drafts", async () => {
  const ownerId = randomUUID();
  const { generated, category } = fixture();
  const record = {
    ...generated.draft,
    id: randomUUID(),
    version: 1,
    status: "published",
    createdBy: null,
    updatedBy: null,
    publishedAt: new Date().toISOString(),
    cancelledAt: null,
    memberNames: generated.memberNames,
    departmentNames: {},
  } as ScheduleRecord;
  const original = structuredClone(record);
  let mutations = 0;
  mock.method(globalThis, "fetch", async (_path: any, init: any = {}) => {
    if (init.method && init.method !== "GET") mutations++;
    return Response.json({ items: [person] });
  });
  mount(
    <ScheduleEditor
      initial={record}
      draftOwnerId={ownerId}
      category={category}
      departments={[]}
      onBack={() => {}}
      onSaved={() => {}}
    />,
  );
  fireEvent.change(
    screen.getByRole("textbox", { name: "Sáng · Cửa chính · 01/11/2026" }),
    { target: { value: "Thay đổi chưa lưu" } },
  );
  await waitFor(() =>
    assert.equal(listLocalScheduleDrafts(ownerId, 0).length, 1),
  );
  const anotherId = randomUUID();
  const another = {
    ...listLocalScheduleDrafts(ownerId, 0)[0],
    scope: "new:" + anotherId,
    requestId: anotherId,
    recordId: null,
    baseVersion: null,
  };
  writeLocalScheduleDraft(another);
  fireEvent.click(screen.getByRole("button", { name: "Về danh sách lịch" }));
  await screen.findByRole("dialog", { name: "Thay đổi chưa được gởi" });
  fireEvent.click(screen.getByRole("button", { name: "Rời trang" }));
  window.dispatchEvent(new Event("pagehide"));
  assert.equal(
    readLocalScheduleDraft(ownerId, 0, "record:" + record.id),
    undefined,
  );
  assert.ok(readLocalScheduleDraft(ownerId, 0, another.scope));
  assert.deepEqual(record, original);
  assert.equal(mutations, 0);
  cleanup();
  mount(
    <ScheduleEditor
      initial={record}
      draftOwnerId={ownerId}
      category={category}
      departments={[]}
      onBack={() => {}}
      onSaved={() => {}}
    />,
  );
  assert.notEqual(
    (
      screen.getByRole("textbox", {
        name: "Sáng · Cửa chính · 01/11/2026",
      }) as HTMLTextAreaElement
    ).value,
    "Thay đổi chưa lưu",
  );
});
