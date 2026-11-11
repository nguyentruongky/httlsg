import { after, afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@org/ui";
import { build } from "esbuild";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
const cache = fileURLToPath(new URL("../../../.local-data/", import.meta.url));
await mkdir(cache, { recursive: true });
const temp = await mkdtemp(join(cache, "department-ui-"));
const output = join(temp, "department.mjs");
await build({
  entryPoints: [
    fileURLToPath(
      new URL(
        "../src/department-members.tsx",
        import.meta.url,
      ),
    ),
  ],
  outfile: output,
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  jsx: "automatic",
});
const { DepartmentMembers } = (await import(
  pathToFileURL(output).href
)) as typeof import("../src/department-members");
const originalFetch = globalThis.fetch;
const originalObserver = globalThis.IntersectionObserver;
afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  globalThis.IntersectionObserver = originalObserver;
});
after(() => rm(temp, { recursive: true, force: true }));
const people = [
  {
    id: "one",
    name: "Nguyễn An",
    phone: "0969876501",
    email: null,
    position: "Ban viên",
  },
  {
    id: "two",
    name: "Trần Bình",
    phone: null,
    email: "binh@example.test",
    position: "Hướng dẫn",
  },
  {
    id: "three",
    name: "Lê Châu",
    phone: "0969876503",
    email: null,
    position: "Ban viên",
  },
];
function setup(
  paginate = false,
  failWrite = false,
  embedded = true,
  onOpenProfile?: (id: string) => void,
) {
  const members = new Set(["one", "two"]);
  const statuses = new Map<string, string>();
  const writes: {
    method: string;
    memberId?: string;
    action?: string;
    memberIds?: string[];
    targetDepartmentId?: string;
  }[] = [];
  const requests: string[] = [];
  const boardYear = Number(
    new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
    }).format(new Date()),
  );
  const boardMembers = new Map([["one", "Thư ký"]]);
  let boardRevision = 1;
  globalThis.fetch = async (input, init) => {
    const path = String(input);
    requests.push(path);
    if (path === "/api/admin/departments/thanh-nien/board") {
      if (init?.method === "PATCH") {
        const payload = JSON.parse(String(init.body));
        writes.push({ method: "PATCH", ...payload });
        if (payload.position === null) boardMembers.delete(payload.id);
        else boardMembers.set(payload.id, payload.position);
        boardRevision++;
        return new Response(JSON.stringify({ revision: boardRevision }));
      }
      return new Response(
        JSON.stringify({
          items: [
            {
              year: boardYear,
              revision: boardRevision,
              members: people
                .filter((person) => boardMembers.has(person.id))
                .map((person) => ({
                  ...person,
                  position: boardMembers.get(person.id),
                })),
            },
            {
              year: boardYear - 1,
              revision: 1,
              members: [{ ...people[1], position: "Ủy viên" }],
            },
          ],
        }),
      );
    }
    if (path === "/api/admin/departments")
      return new Response(
        JSON.stringify({
          departments: [
            { id: "thanh-nien", name: "Ban Thanh niên" },
            { id: "truyen-thong", name: "Ban Truyền thông" },
          ],
        }),
      );
    assert.ok(path.startsWith("/api/admin/departments/thanh-nien/members"));
    const method = init?.method ?? "GET";
    if (method !== "GET") {
      const payload = JSON.parse(String(init?.body));
      if (failWrite)
        return new Response(
          JSON.stringify({ message: "Không thể cập nhật thành viên." }),
          { status: 503 },
        );
      if (method === "PATCH") {
        writes.push({ method, ...payload });
        for (const id of payload.memberIds) {
          if (payload.action === "add") members.add(id);
          else if (payload.action === "status")
            statuses.set(id, payload.status);
          else members.delete(id);
        }
        return new Response(
          JSON.stringify({ ok: true, changedCount: payload.memberIds.length }),
        );
      }
      const { memberId } = payload;
      if (failWrite)
        return new Response(
          JSON.stringify({ message: "Không thể cập nhật thành viên." }),
          { status: 503 },
        );
      writes.push({ method, memberId });
      if (method === "POST") members.add(memberId);
      else members.delete(memberId);
      return new Response(JSON.stringify({ ok: true }));
    }
    const params = new URL(path, "http://localhost").searchParams;
    const available = params.get("mode") === "available",
      all = params.get("mode") === "all",
      q = params.get("q") ?? "",
      page = Number(params.get("page") ?? 1);
    const boardMode = params.get("mode") === "board";
    const filtered = people.filter(
      (person) =>
        (all || members.has(person.id) !== available) &&
        (!boardMode || Boolean(q) || boardMembers.has(person.id)) &&
        [person.name, person.phone, person.email]
          .join(" ")
          .toLocaleLowerCase("vi")
          .includes(q.toLocaleLowerCase("vi")),
    );
    const items =
      (available || all) && !q
        ? []
        : paginate
          ? filtered.slice(page - 1, page)
          : filtered;
    return new Response(
      JSON.stringify({
        items: items.map((person) => ({
          ...person,
          isMember: members.has(person.id),
          isBoardMember: boardMembers.has(person.id),
          position: boardMode
            ? (boardMembers.get(person.id) ?? person.position)
            : person.position,
          churchStatus: statuses.get(person.id),
        })),
        total: filtered.length,
        nextPage: paginate && page < filtered.length ? page + 1 : null,
      }),
    );
  };
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  render(
    <QueryClientProvider client={client}>
      <Toaster>
        <DepartmentMembers
          department={{ id: "thanh-nien", name: "Ban Thanh niên" }}
          embedded={embedded}
          onOpenProfile={onOpenProfile}
          profileHref={
            onOpenProfile
              ? (id) =>
                  "/dashboard/settings/departments/thanh-nien?member=" + id
              : undefined
          }
          onClose={() => {}}
        />
      </Toaster>
    </QueryClientProvider>,
  );
  return { writes, requests };
}

test("department rows open profiles and expose avatars without tabs or per-row remove actions", async () => {
  setup();
  await screen.findByText("Nguyễn An");
  assert.equal(screen.queryByRole("dialog"), null);
  assert.equal(
    screen.getByRole("link", { name: "Hồ sơ Nguyễn An" }).getAttribute("href"),
    "/client#/members/one",
  );
  assert.ok(
    screen
      .getByRole("button", { name: "Chọn Nguyễn An" })
      .querySelector("span"),
  );
  assert.equal(screen.queryByRole("button", { name: "Thành viên" }), null);
  assert.equal(
    screen.queryByRole("button", { name: "Chọn danh sách đang hiển thị" }),
    null,
  );
  assert.equal(screen.queryByRole("button", { name: "Gỡ Nguyễn An" }), null);
});
test("department menu focuses search and searches every profile, including existing members", async () => {
  const { requests, writes } = setup();
  const user = userEvent.setup();
  await screen.findByText("Nguyễn An");
  await user.click(screen.getByRole("button", { name: "Tùy chọn Ban ngành" }));
  await user.click(screen.getByRole("menuitem", { name: "Thêm ban viên" }));
  const input = screen.getByRole("textbox", {
    name: "Tìm thành viên Ban ngành",
  });
  await waitFor(() =>
    assert.ok(
      document.activeElement === input,
      "Add-member search should receive focus",
    ),
  );
  assert.ok(input.className.includes("focus-visible:ring-inset"));
  assert.ok(input.className.includes("max-w-full"));
  assert.equal(
    screen.queryByText("Nhập tên, số điện thoại hoặc email để tìm hồ sơ."),
    null,
  );

  assert.equal(input.getAttribute("placeholder"), "Tìm để thêm thành viên mới");
  assert.equal(
    requests.some((path) => path.includes("mode=all")),
    false,
  );
  await user.type(input, "096");
  await screen.findByText("Lê Châu");
  assert.ok(screen.getByRole("link", { name: "Hồ sơ Nguyễn An" }));
  assert.equal(screen.queryByRole("button", { name: "Thêm Nguyễn An" }), null);
  await user.click(screen.getByRole("button", { name: "Thêm Lê Châu" }));
  await screen.findByText("Đã thêm thành viên vào Ban ngành");
  assert.deepEqual(writes, [{ method: "POST", memberId: "three" }]);
  await waitFor(() =>
    assert.equal(screen.queryByRole("button", { name: "Thêm Lê Châu" }), null),
  );
});
test("avatar starts selection mode, hides search, toggles selection without opening the profile", async () => {
  setup();
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Chọn Nguyễn An" }),
  );
  assert.equal(
    screen.queryByRole("textbox", { name: "Tìm thành viên Ban ngành" }),
    null,
  );
  assert.equal(screen.queryByRole("link", { name: "Hồ sơ Nguyễn An" }), null);
  assert.equal(
    screen
      .getByRole("button", { name: "Chọn Nguyễn An" })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.ok(screen.getByRole("button", { name: "Chuyển" }));
  assert.ok(screen.getByRole("button", { name: "Xóa khỏi danh sách" }));
  await user.click(
    screen.getByRole("button", { name: "Chọn hồ sơ Trần Bình" }),
  );
  await screen.findByRole("heading", { name: "Đã chọn 2 thành viên" });
  await user.click(
    screen.getByRole("button", { name: "Thoát chọn thành viên" }),
  );
  assert.ok(screen.getByRole("textbox", { name: "Tìm thành viên Ban ngành" }));
  assert.ok(screen.getByRole("link", { name: "Hồ sơ Nguyễn An" }));
  assert.equal(
    screen
      .getByRole("button", { name: "Chọn Nguyễn An" })
      .getAttribute("aria-pressed"),
    "false",
  );
});
test("selected members across pages can be moved together", async () => {
  const { writes } = setup(true);
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Chọn Nguyễn An" }),
  );
  await user.click(screen.getByRole("button", { name: "Tải thêm" }));
  await user.click(
    await screen.findByRole("button", { name: "Chọn Trần Bình" }),
  );
  await user.click(screen.getByRole("button", { name: "Chuyển" }));
  const confirm = screen.getByRole("button", {
    name: "Xác nhận chuyển",
  }) as HTMLButtonElement;
  assert.equal(confirm.disabled, true);
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Ban ngành đích" }),
    "truyen-thong",
  );
  await user.click(confirm);
  await screen.findByText("Đã chuyển Ban ngành cho các thành viên đã chọn");
  assert.deepEqual(writes, [
    {
      method: "PATCH",
      action: "move",
      memberIds: ["one", "two"],
      targetDepartmentId: "truyen-thong",
    },
  ]);
  assert.ok(screen.getByRole("textbox", { name: "Tìm thành viên Ban ngành" }));
});
test("selection delete removes memberships, while errors preserve the selection and rows", async () => {
  const { writes } = setup(false, true);
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Chọn Nguyễn An" }),
  );
  await user.click(screen.getByRole("button", { name: "Xóa khỏi danh sách" }));
  await screen.findByText("Không thể cập nhật thành viên.");
  assert.equal(
    screen
      .getByRole("button", { name: "Chọn Nguyễn An" })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.deepEqual(writes, []);
});
test("all-profile candidates can be selected and added without offering unsafe move/remove actions", async () => {
  const { writes } = setup();
  const user = userEvent.setup();
  await screen.findByText("Nguyễn An");
  await user.click(screen.getByRole("button", { name: "Tùy chọn Ban ngành" }));
  await user.click(screen.getByRole("menuitem", { name: "Thêm ban viên" }));
  await user.type(
    screen.getByRole("textbox", { name: "Tìm thành viên Ban ngành" }),
    "Châu",
  );
  await user.click(await screen.findByRole("button", { name: "Chọn Lê Châu" }));
  assert.equal(
    (screen.getByRole("button", { name: "Chuyển" }) as HTMLButtonElement)
      .disabled,
    true,
  );
  assert.equal(
    (
      screen.getByRole("button", {
        name: "Xóa khỏi danh sách",
      }) as HTMLButtonElement
    ).disabled,
    true,
  );
  await user.click(screen.getByRole("button", { name: "Thêm vào Ban ngành" }));
  await screen.findByText("Đã thêm các thành viên đã chọn");
  assert.deepEqual(writes, [
    { method: "PATCH", action: "add", memberIds: ["three"] },
  ]);
});
test("department roster still auto-loads pages after the simplified navigation", async () => {
  let callback: IntersectionObserverCallback | undefined;
  globalThis.IntersectionObserver = class {
    constructor(cb: IntersectionObserverCallback) {
      callback = cb;
    }
    observe() {}
    disconnect() {}
    unobserve() {}
  } as unknown as typeof IntersectionObserver;
  const { requests } = setup(true);
  await screen.findByText("Nguyễn An");
  await waitFor(() => assert.ok(callback));
  await act(async () =>
    callback!(
      [{ isIntersecting: true }] as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    ),
  );
  await screen.findByText("Trần Bình");
  assert.ok(requests.some((path) => path.includes("page=2")));
});

test("selected department members can update church status in one batch", async () => {
  const { writes } = setup();
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Chọn Nguyễn An" }),
  );
  await user.click(screen.getByRole("button", { name: "Chọn Trần Bình" }));
  await user.click(screen.getByRole("button", { name: "Tình trạng" }));
  const save = screen.getByRole("button", {
    name: "Cập nhật tình trạng",
  }) as HTMLButtonElement;
  assert.equal(save.disabled, true);
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Tình trạng mới" }),
    "Không đi nhóm",
  );
  await user.click(save);
  await screen.findByText("Đã cập nhật tình trạng các thành viên đã chọn");
  await screen.findByRole("link", { name: "Hồ sơ Nguyễn An" });
  assert.ok(screen.getByRole("link", { name: "Hồ sơ Trần Bình" }));
  await screen.findByText("Không đi nhóm", { exact: true });
  assert.deepEqual(writes, [
    {
      method: "PATCH",
      action: "status",
      memberIds: ["one", "two"],
      status: "Không đi nhóm",
    },
  ]);
});
test("profile links stay in the department navigation context when hosted by its workspace", async () => {
  const opened: string[] = [];
  setup(false, false, true, (id) => opened.push(id));
  const user = userEvent.setup();
  const link = await screen.findByRole("link", { name: "Hồ sơ Nguyễn An" });
  assert.equal(
    link.getAttribute("href"),
    "/dashboard/settings/departments/thanh-nien?member=one",
  );
  await user.click(link);
  assert.deepEqual(opened, ["one"]);
});

test("selection uses X instead of department back and a fixed-height non-wrapping toolbar", async () => {
  setup();
  const user = userEvent.setup();
  const input = await screen.findByRole("textbox", {
    name: "Tìm thành viên Ban ngành",
  });
  const slot = input.closest("[data-department-action-slot]");
  assert.ok(slot?.className.includes("h-11"));
  await user.click(
    await screen.findByRole("button", { name: "Chọn Nguyễn An" }),
  );
  assert.equal(
    screen.queryByRole("link", { name: "Quay lại quản lý Ban ngành" }),
    null,
  );
  const exit = screen.getByRole("button", { name: "Thoát chọn thành viên" });
  assert.equal(exit.parentElement?.firstElementChild, exit);
  const toolbar = screen.getByRole("toolbar", {
    name: "Thao tác thành viên đã chọn",
  });
  assert.ok(toolbar.className.includes("h-11"));
  assert.ok(toolbar.className.includes("overflow-x-auto"));
  assert.ok(!toolbar.className.includes("flex-wrap"));
  assert.equal(
    toolbar.closest("[data-department-action-slot]")?.className,
    slot?.className,
  );
  assert.ok(screen.getByRole("button", { name: "Xóa khỏi danh sách" }));
  assert.equal(screen.queryByText(/Xóa chỉ gỡ khỏi Ban ngành/), null);
  await user.click(screen.getByRole("button", { name: "Tình trạng" }));
  await screen.findByRole("dialog", { name: "Cập nhật tình trạng" });
  assert.equal(
    toolbar.closest("[data-department-action-slot]")?.className,
    slot?.className,
  );
  await user.click(screen.getByRole("button", { name: "Đóng tình trạng" }));
  await user.click(exit);
  assert.ok(screen.getByRole("textbox", { name: "Tìm thành viên Ban ngành" }));
  assert.ok(screen.getByRole("link", { name: "Quay lại quản lý Ban ngành" }));
});

test("desktop department menu exposes management actions and rename dialog", async () => {
  setup();
  const user = userEvent.setup();
  await screen.findByText("Nguyễn An");
  await user.click(screen.getByRole("button", { name: "Tùy chọn Ban ngành" }));
  for (const name of [
    "Thêm ban viên",
    "Đổi tên ban",
    "Xóa ban",
    "Cập nhật Ban điều hành",
  ])
    assert.ok(screen.getByRole("menuitem", { name }));
  await user.click(screen.getByRole("menuitem", { name: "Đổi tên ban" }));
  await screen.findByRole("dialog", { name: "Đổi tên ban" });
  assert.equal(
    (screen.getByRole("textbox", { name: "Tên Ban ngành" }) as HTMLInputElement)
      .value,
    "Ban Thanh niên",
  );
});
test("mobile department menu opens a bottom sheet and add action focuses member search", async () => {
  const original = window.matchMedia;
  window.matchMedia = (() => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
  try {
    setup();
    const user = userEvent.setup();
    await screen.findByText("Nguyễn An");
    await user.click(
      screen.getByRole("button", { name: "Tùy chọn Ban ngành" }),
    );
    const sheet = await screen.findByRole("dialog", { name: "Ban Thanh niên" });
    assert.ok(sheet.className.includes("!bottom-0"));
    assert.equal(screen.queryByRole("menuitem"), null);
    await user.click(screen.getByRole("button", { name: "Thêm ban viên" }));
    const input = screen.getByRole("textbox", {
      name: "Tìm thành viên Ban ngành",
    });
    await waitFor(() => assert.ok(document.activeElement === input));
    assert.equal(
      input.getAttribute("placeholder"),
      "Tìm để thêm thành viên mới",
    );
  } finally {
    cleanup();
    window.matchMedia = original;
  }
});

test("Ban viên is hidden while detailed department titles remain visible", async () => {
  setup();
  await screen.findByText("Nguyễn An");
  assert.equal(screen.queryByText("Ban viên"), null);
  assert.ok(screen.getByText("Hướng dẫn"));
});
test("board management filters the same roster, searches candidates and assigns a selected title", async () => {
  const { requests, writes } = setup();
  const user = userEvent.setup();
  await screen.findByText("Nguyễn An");
  await user.click(screen.getByRole("button", { name: "Tùy chọn Ban ngành" }));
  await user.click(
    screen.getByRole("menuitem", { name: "Cập nhật Ban điều hành" }),
  );
  await screen.findByText(/Ban điều hành năm/);
  await waitFor(() => assert.ok(screen.queryByText("Trần Bình") === null));
  assert.ok(screen.getByText("Nguyễn An"));
  assert.equal(
    screen.queryByRole("dialog", { name: "Cập nhật Ban điều hành" }),
    null,
  );
  assert.ok(
    requests.some(
      (path) => path.includes("mode=board") && path.includes("year="),
    ),
  );
  await user.type(
    screen.getByRole("textbox", { name: "Tìm thành viên Ban ngành" }),
    "Bình",
  );
  await user.click(
    await screen.findByRole("button", { name: "Chức vụ Trần Bình" }),
  );
  const popup = await screen.findByRole("dialog", {
    name: "Phân công Ban điều hành",
  });
  assert.ok(popup);
  await user.click(screen.getByRole("radio", { name: "Thủ quỹ" }));
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() =>
    assert.ok(
      writes.some(
        (item: any) =>
          item.id === "two" &&
          item.position === "Thủ quỹ" &&
          Number.isInteger(item.year),
      ),
    ),
  );
  await user.clear(
    screen.getByRole("textbox", { name: "Tìm thành viên Ban ngành" }),
  );
  await waitFor(() => assert.ok(screen.getByText("Thủ quỹ")));
  await user.click(
    screen.getByRole("button", { name: "Danh sách BĐH các năm" }),
  );
  await screen.findByRole("dialog", { name: "Danh sách BĐH các năm" });
  const previousYear =
    Number(
      new Intl.DateTimeFormat("en", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
      }).format(new Date()),
    ) - 1;
  await user.click(screen.getByRole("button", { name: String(previousYear) }));
  assert.ok(screen.getByText("Ủy viên"));
  assert.equal(screen.queryByText(/Phiên bản/), null);
});

test("search clear button restores the list and keeps the search focused", async () => {
  setup();
  const user = userEvent.setup();
  await screen.findByText("Nguyễn An");
  const input = screen.getByRole("textbox", {
    name: "Tìm thành viên Ban ngành",
  }) as HTMLInputElement;
  assert.equal(
    screen.queryByRole("button", { name: "Xóa nội dung tìm kiếm" }),
    null,
  );
  await user.type(input, "Nguyễn");
  await waitFor(() => assert.ok(screen.queryByText("Trần Bình") === null));
  await user.click(
    screen.getByRole("button", { name: "Xóa nội dung tìm kiếm" }),
  );
  assert.equal(input.value, "");
  assert.ok(document.activeElement === input);
  await screen.findByText("Trần Bình");
  assert.equal(
    screen.queryByRole("button", { name: "Xóa nội dung tìm kiếm" }),
    null,
  );
});
