import { afterEach, test, mock } from "node:test";
import assert from "node:assert/strict";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { orgs, listDirectory, DirectoryQuerySchema, demo } from "@org/core";
import userEvent from "@testing-library/user-event";
import { MemberDirectory } from "../src/member-directory";
class Observer {
  static instances: Observer[] = [];
  node: Element | null = null;
  active = false;
  constructor(private callback: IntersectionObserverCallback) {
    Observer.instances.push(this);
  }
  observe(node: Element) {
    this.node = node;
    this.active = true;
  }
  unobserve() {
    this.active = false;
  }
  disconnect() {
    this.active = false;
  }
  emit() {
    if (this.active && this.node)
      this.callback(
        [
          {
            target: this.node,
            isIntersecting: true,
          } as IntersectionObserverEntry,
        ],
        this as unknown as IntersectionObserver,
      );
  }
}
afterEach(() => {
  cleanup();
  mock.restoreAll();
  Observer.instances = [];
  Reflect.deleteProperty(window, "IntersectionObserver");
  Reflect.deleteProperty(globalThis, "IntersectionObserver");
});
function renderDirectory(active = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemberDirectory org={orgs[0].id} active={active} onOpen={() => {}} />
      </QueryClientProvider>,
    ),
  };
}
function observers() {
  Object.defineProperty(window, "IntersectionObserver", {
    value: Observer,
    configurable: true,
  });
  Object.defineProperty(globalThis, "IntersectionObserver", {
    value: Observer,
    configurable: true,
  });
}
async function searchAll() {
  const user = userEvent.setup();
  await user.type(
    screen.getByRole("searchbox", { name: "Tìm thành viên" }),
    "@example.org",
  );
  await screen.findByText("Đã hiển thị 12 / 96 thành viên");
}
test("scroll observation remains armed across quickly resolved local pages", async () => {
  observers();
  renderDirectory();
  await searchAll();
  await screen.findByText("Đã hiển thị 12 / 96 thành viên");
  await waitFor(() => assert.ok(Observer.instances.some((o) => o.active)));
  act(() => {
    Observer.instances.filter((o) => o.active).forEach((o) => o.emit());
  });
  await screen.findByText("Đã hiển thị 24 / 96 thành viên");
  await waitFor(() =>
    assert.ok(
      Observer.instances.some((o) => o.active),
      "No observer remains to load the following page",
    ),
  );
  act(() => {
    Observer.instances.filter((o) => o.active).forEach((o) => o.emit());
  });
  await screen.findByText("Đã hiển thị 36 / 96 thành viên");
});

test("captured scroll events load the next page when IntersectionObserver is unavailable", async () => {
  renderDirectory();
  await searchAll();
  await screen.findByText("Đã hiển thị 12 / 96 thành viên");
  const footer = screen.getByText(
    "Đã hiển thị 12 / 96 thành viên",
  ).parentElement!;
  footer.getBoundingClientRect = () => ({
    top:
      document.querySelectorAll("li").length === 12
        ? window.innerHeight - 40
        : window.innerHeight + 1000,
    bottom: window.innerHeight + 40,
    width: 400,
    height: 80,
    left: 0,
    right: 400,
    x: 0,
    y: 0,
    toJSON() {},
  });
  act(() => {
    screen
      .getByRole("region", { name: "Kết quả danh sách" })
      .dispatchEvent(new Event("scroll"));
  });
  await screen.findByText("Đã hiển thị 24 / 96 thành viên");
});

test("duplicate observer notifications do not skip pages and the loader stops at the end", async () => {
  observers();
  renderDirectory();
  await searchAll();
  await screen.findByText("Đã hiển thị 12 / 96 thành viên");
  for (let count = 24; count <= 96; count += 12) {
    await waitFor(() => assert.ok(Observer.instances.some((o) => o.active)));
    act(() => {
      const current = Observer.instances.filter((o) => o.active);
      for (let i = 0; i < 3; i++) current.forEach((o) => o.emit());
    });
    await screen.findByText(`Đã hiển thị ${count} / 96 thành viên`);
    assert.equal(document.querySelectorAll("li").length, count);
  }
  await screen.findByText("Bạn đã xem hết danh sách.");
  await waitFor(() =>
    assert.equal(
      Observer.instances.some((o) => o.active),
      false,
    ),
  );
});

test("hidden directories pause loading and resume observation when revisited", async () => {
  observers();
  const { client, rerender } = renderDirectory();
  await searchAll();
  rerender(
    <QueryClientProvider client={client}>
      <MemberDirectory org={orgs[0].id} active={false} onOpen={() => {}} />
    </QueryClientProvider>,
  );
  await screen.findByText("Đã hiển thị 12 / 96 thành viên");
  assert.equal(
    Observer.instances.some((o) => o.active),
    false,
  );
  rerender(
    <QueryClientProvider client={client}>
      <MemberDirectory org={orgs[0].id} active onOpen={() => {}} />
    </QueryClientProvider>,
  );
  await waitFor(() => assert.ok(Observer.instances.some((o) => o.active)));
  act(() =>
    Observer.instances.filter((o) => o.active).forEach((o) => o.emit()),
  );
  await screen.findByText("Đã hiển thị 24 / 96 thành viên");
});

test("full-screen filters pause scrolling and apply age from the first page", async () => {
  observers();
  renderDirectory();
  await searchAll();
  const user = userEvent.setup();
  await screen.findByText("Đã hiển thị 12 / 96 thành viên");
  await user.click(screen.getByRole("button", { name: "Bộ lọc" }));
  await screen.findByRole("dialog", { name: "Bộ lọc" });
  await waitFor(() =>
    assert.equal(
      Observer.instances.some((o) => o.active),
      false,
    ),
  );
  await user.click(screen.getByRole("button", { name: /^Khoảng tuổi/ }));
  await user.click(screen.getByRole("button", { name: "Từ 50 tuổi" }));
  await user.click(screen.getByRole("button", { name: "Xong" }));
  await user.click(screen.getByRole("button", { name: "Áp dụng" }));
  const result = await listDirectory(
    orgs[0].id,
    DirectoryQuerySchema.parse({ minAge: 50 }),
  );
  await screen.findByText(
    `Đã hiển thị ${Math.min(12, result.total)} / ${result.total} thành viên`,
  );
  assert.equal(screen.queryByRole("dialog"), null);
  assert.ok(screen.getByRole("button", { name: "Bỏ lọc khoảng tuổi" }));
});

test("directory starts empty without fetching and returns to that state when search is cleared", async () => {
  observers();
  const spy = mock.method(demo, "get");
  const { client } = renderDirectory();
  assert.ok(screen.getByText("Tìm kiếm hoặc lọc để xem danh sách."));
  assert.equal(client.isFetching(), 0);
  assert.equal(spy.mock.calls.length, 0);
  assert.equal(document.querySelectorAll("li").length, 0);
  assert.equal(
    Observer.instances.some((o) => o.active),
    false,
  );
  await searchAll();
  assert.ok(spy.mock.calls.length > 0);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "Xóa nội dung tìm kiếm" }),
  );
  assert.ok(screen.getByText("Tìm kiếm hoặc lọc để xem danh sách."));
  assert.equal(document.querySelectorAll("li").length, 0);
  await waitFor(() =>
    assert.equal(
      Observer.instances.some((o) => o.active),
      false,
    ),
  );
});
test("a filter-only search loads results and removing the final filter hides the list", async () => {
  const user = userEvent.setup();
  renderDirectory();
  assert.ok(screen.getByText("Tìm kiếm hoặc lọc để xem danh sách."));
  await user.click(screen.getByRole("button", { name: "Mở bộ lọc" }));
  await user.click(screen.getByRole("button", { name: /^Khoảng tuổi/ }));
  await user.click(screen.getByRole("button", { name: "Từ 50 tuổi" }));
  await user.click(screen.getByRole("button", { name: "Xong" }));
  await user.click(screen.getByRole("button", { name: "Áp dụng" }));
  const result = await listDirectory(
    orgs[0].id,
    DirectoryQuerySchema.parse({ minAge: 50 }),
  );
  await screen.findByText(
    `Đã hiển thị ${Math.min(12, result.total)} / ${result.total} thành viên`,
  );
  await user.click(screen.getByRole("button", { name: "Bỏ lọc khoảng tuổi" }));
  assert.ok(screen.getByText("Tìm kiếm hoặc lọc để xem danh sách."));
  assert.equal(document.querySelectorAll("li").length, 0);
});

test("unknown-age preset activates search without text and can be removed", async () => {
  const user = userEvent.setup();
  renderDirectory();
  await user.click(screen.getByRole("button", { name: "Mở bộ lọc" }));
  await user.click(screen.getByRole("button", { name: /^Khoảng tuổi/ }));
  await user.click(
    screen.getByRole("button", { name: "Không có dữ liệu tuổi" }),
  );
  await user.click(screen.getByRole("button", { name: "Xong" }));
  await user.click(screen.getByRole("button", { name: "Áp dụng" }));
  await screen.findByText("Không tìm thấy thành viên");
  assert.match(
    screen.getByRole("button", { name: "Bỏ lọc khoảng tuổi" }).textContent ??
      "",
    /Không có dữ liệu tuổi/,
  );
  assert.equal(screen.queryByText("Tìm kiếm hoặc lọc để xem danh sách."), null);
  await user.click(screen.getByRole("button", { name: "Bỏ lọc khoảng tuổi" }));
  assert.ok(screen.getByText("Tìm kiếm hoặc lọc để xem danh sách."));
});
