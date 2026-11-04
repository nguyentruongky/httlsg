import { afterEach, test, mock } from "node:test";
import assert from "node:assert/strict";
import {
  render,
  screen,
  cleanup,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "../src/app";
afterEach(() => {
  cleanup();
  mock.restoreAll();
  window.history.replaceState({}, "", "#/members");
});
test("search stays outside the results scroller and returning from a profile restores list scroll and search", async () => {
  window.history.replaceState({}, "", "#/members");
  mock.method(window, "scrollTo", () => {});
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
  const user = userEvent.setup(),
    search = screen.getByRole("searchbox", { name: "Tìm thành viên" }),
    scroller = screen.getByRole("region", { name: "Kết quả danh sách" });
  assert.equal(scroller.contains(search), false);
  assert.ok(within(scroller).getByText("Tìm kiếm hoặc lọc để xem danh sách."));
  await user.type(search, "@example.org");
  await screen.findByText("Đã hiển thị 12 / 96 thành viên");
  scroller.scrollTop = 640;
  await user.click(within(scroller).getAllByRole("link")[0]);
  await screen.findByRole("region", { name: "Chi tiết thành viên" });
  // Browsers may reset a hidden pane's offset; restoration must use the saved pane offset.
  scroller.scrollTop = 0;
  await user.click(
    screen.getByRole("link", { name: "Về danh sách thành viên" }),
  );
  await waitFor(() =>
    assert.equal(
      screen.getByRole("region", { name: "Kết quả danh sách" }).scrollTop,
      640,
    ),
  );
  assert.equal(
    screen.getByRole("searchbox", { name: "Tìm thành viên" }),
    search,
  );
  assert.equal((search as HTMLInputElement).value, "@example.org");
});
