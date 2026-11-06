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
        "../../web-admin/components/department-members.tsx",
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
)) as typeof import("../../web-admin/components/department-members");
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
  globalThis.fetch = async (input, init) => {
    const path = String(input);
    requests.push(path);
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
    const filtered = people.filter(
      (person) =>
        (all || members.has(person.id) !== available) &&
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
test("plus focuses search and searches every profile, including existing members", async () => {
  const { requests, writes } = setup();
  const user = userEvent.setup();
  await screen.findByText("Nguyễn An");
  await user.click(screen.getByRole("button", { name: "Thêm thành viên" }));
  const input = screen.getByRole("textbox", {
    name: "Tìm thành viên Ban ngành",
  });
  assert.equal(document.activeElement, input);
  assert.ok(input.className.includes("focus-visible:ring-inset"));
  assert.ok(input.className.includes("max-w-full"));
  assert.equal(
    screen.queryByText("Nhập tên, số điện thoại hoặc email để tìm hồ sơ."),
    null,
  );

  assert.equal(
    input.getAttribute("placeholder"),
    "Tìm theo tên, số điện thoại hoặc email",
  );
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
  await user.click(screen.getByRole("button", { name: "Thêm thành viên" }));
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
  await screen.findByText("Ban viên · Không đi nhóm");
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
