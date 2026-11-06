import { afterEach, test, mock } from "node:test";
import assert from "node:assert/strict";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  AuthSessionProvider,
  getDirectoryMember,
  orgs,
  departments,
  useAuth,
} from "@org/core";
import userEvent from "@testing-library/user-event";
import { App } from "../src/app";
import { ClientAuthGate } from "../src/login-form";
import { TeamOtps } from "../src/team-otps";
import { MemberDirectory } from "../src/member-directory";
import { MemberNotes, VisitHistory } from "../src/member-history";
import { MemberDetail } from "../src/member-detail";
const fixture = await getDirectoryMember(
  orgs[0].id,
  "20000000-0000-4000-8000-000000000101",
);
const originalFetch = globalThis.fetch;
const originalEventSource = globalThis.EventSource;
class BottomObserver {
  static current: BottomObserver;
  constructor(private callback: IntersectionObserverCallback) {
    BottomObserver.current = this;
  }
  observe() {}
  disconnect() {}
  emit() {
    this.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}
const originalObserver = globalThis.IntersectionObserver;
afterEach(() => {
  cleanup();
  mock.restoreAll();
  window.history.replaceState({}, "", "#/members");
  globalThis.fetch = originalFetch;
  globalThis.EventSource = originalEventSource;
  globalThis.IntersectionObserver = originalObserver;
});
function mount(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  render(
    <QueryClientProvider client={client}>
      <AuthSessionProvider>
        <ClientAuthGate>{children}</ClientAuthGate>
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
  return client;
}
function HistoryReady() {
  const auth = useAuth();
  return auth?.loading ? null : <span>Đã tải quyền xem</span>;
}
function respond(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
  });
}
function user(leader: boolean) {
  return {
    id: fixture.id,
    role: leader ? "leader" : "user",
    roles: leader ? ["leader"] : ["user"],
    name: fixture.user.name,
    leaderDepartmentId: leader ? "thanh-nien" : null,
    requiresPasswordSetup: false,
    authVersion: 1,
    permissions: leader
      ? [
          "leader.otps.read",
          "members.read.department",
          "members.write.department",
        ]
      : [],
  };
}
test("profile leader card is absent for members and links to in-app team views for leaders", async () => {
  for (const leader of [false, true]) {
    globalThis.fetch = async (input) => {
      const path = String(input);
      if (path === "/api/auth/me") return respond({ user: user(leader) });
      if (path === "/api/catalog") return respond({ departments });
      if (path === "/api/members/me") return respond(fixture);
      throw new Error(`Unexpected request: ${path}`);
    };
    mount(<MemberDetail org={orgs[0].id} profile />);
    await screen.findByRole("heading", { name: fixture.user.name });
    const deviceSettings = screen.getByRole("heading", {
      name: "Cài đặt thiết bị",
    }).parentElement!;
    assert.ok(
      deviceSettings.querySelector('button[aria-label="Đổi giao diện"]'),
    );
    assert.equal(deviceSettings.querySelectorAll("button").length, 1);

    assert.equal(
      screen.queryByRole("heading", { name: "Vai trò trưởng Ban ngành" }),
      null,
    );
    assert.equal(
      screen.queryByRole("link", { name: "Thành viên trong Ban ngành" }),
      null,
    );
    cleanup();
  }
});
test("Ban điều hành profile section supports primary and secondary assignments", async () => {
  for (const role of ["user", "board", "deacon"] as const) {
    const board = role !== "user";
    globalThis.fetch = async (input) => {
      const path = String(input);
      if (path === "/api/auth/me")
        return respond({
          user: {
            ...user(false),
            role,
            roles: board ? [role, "board"] : [role],
            boardDepartmentIds: board ? ["thanh-nien"] : [],
            permissions: board
              ? [
                  "members.read.all",
                  "members.write.department",
                  "leader.otps.read",
                ]
              : [],
          },
        });
      if (path === "/api/catalog") return respond({ departments });
      if (path === "/api/members/me") return respond(fixture);
      if (path.startsWith("/api/board/members?"))
        return respond({ items: [fixture], total: 1 });
      throw new Error(`Unexpected request: ${path}`);
    };
    mount(<MemberDetail org={orgs[0].id} profile />);
    await screen.findByRole("heading", { name: fixture.user.name });
    assert.equal(
      screen.queryByRole("heading", { name: "Ban điều hành" }),
      null,
    );
    assert.equal(
      screen.queryByRole("link", { name: "Thành viên trong Ban ngành" }),
      null,
    );
    assert.equal(
      screen.queryByRole("link", { name: "Mã OTP của Ban ngành" }),
      null,
    );
    cleanup();
    if (board) {
      mount(
        <MemberDirectory
          org={orgs[0].id}
          active
          team="board"
          onOpen={() => {}}
        />,
      );
      const link = await screen.findByRole("link", {
        name: new RegExp(fixture.user.name),
      });
      assert.equal(link.getAttribute("href"), `#/board/members/${fixture.id}`);
      cleanup();
    }
  }
});
test("Danh sách loads the assigned team immediately and filters use scoped options", async () => {
  mock.method(window, "scrollTo", () => {});
  window.history.replaceState({}, "", "#/members");
  const queries: any[] = [];
  const ownDepartment = departments.find((d) => d.id === "thanh-nien")!;
  const otherDepartment = departments.find((d) => d.id === "truyen-thong")!;
  globalThis.fetch = async (input) => {
    const path = String(input);
    if (path === "/api/auth/me")
      return respond({
        user: {
          ...user(true),
          role: "board",
          roles: ["board", "leader"],
          boardDepartmentIds: [ownDepartment.id],
          permissions: [
            "members.read.all",
            "members.read.department",
            "members.write.department",
          ],
        },
      });
    if (path === "/api/catalog") return respond({ departments });
    if (path === "/api/members/filters")
      return respond({
        departments: [ownDepartment],
        areas: ["KV1"],
        locations: ["Phường Sài Gòn"],
      });
    if (path.startsWith("/api/members?")) {
      queries.push(
        JSON.parse(
          new URL(path, "http://localhost").searchParams.get("query")!,
        ),
      );
      return respond({ items: [fixture], total: 1 });
    }
    if (path === "/api/members/me") return respond(fixture);
    throw new Error(`Unexpected request: ${path}`);
  };
  mount(<App />);
  await screen.findByRole("link", { name: new RegExp(fixture.user.name) });
  assert.equal(queries[0].search, "");
  const interaction = userEvent.setup();
  const filter = screen.getByRole("button", { name: "Bộ lọc" });
  await waitFor(() =>
    assert.equal((filter as HTMLButtonElement).disabled, false),
  );
  await interaction.click(filter);
  await interaction.click(screen.getByRole("button", { name: /^Ban ngành/ }));
  assert.ok(screen.getByRole("checkbox", { name: ownDepartment.name }));
  assert.equal(
    screen.queryByRole("checkbox", { name: otherDepartment.name }),
    null,
  );
});
test("User-only accounts start on their profile without tabs, notes, or the orphan User card", async () => {
  mock.method(window, "scrollTo", () => {});
  window.history.replaceState({}, "", "#/members");
  const paths: string[] = [];
  globalThis.fetch = async (input) => {
    const path = String(input);
    paths.push(path);
    if (path === "/api/auth/me")
      return respond({ user: { ...user(false), roleLabel: "User" } });
    if (path === "/api/catalog") return respond({ departments });
    if (path === "/api/members/me")
      return respond({
        ...fixture,
        canEdit: true,
        notes: [
          {
            id: "note",
            text: "Nội dung nhạy cảm",
            authorName: "Quản lý",
            createdAt: new Date().toISOString(),
          },
        ],
      });
    throw new Error(`Unexpected request: ${path}`);
  };
  mount(<App />);
  await screen.findByRole("region", { name: "Hồ sơ cá nhân" });
  await screen.findByRole("heading", { name: fixture.user.name });
  assert.equal(window.location.hash, "#/profile");
  assert.equal(
    screen.queryByRole("navigation", { name: "Điều hướng thành viên" }),
    null,
  );
  assert.equal(screen.queryByRole("searchbox"), null);
  assert.equal(screen.queryByRole("heading", { name: "Ghi chú" }), null);
  assert.equal(
    screen.queryByRole("heading", { name: "Lịch sử thăm viếng" }),
    null,
  );
  assert.equal(screen.queryByText("Nội dung nhạy cảm"), null);
  assert.equal(screen.queryByRole("button", { name: "Thêm ghi chú" }), null);
  assert.equal(screen.queryByText("User"), null);
  assert.ok(paths.every((path) => path !== "/api/members"));
  assert.ok(screen.getByRole("button", { name: "Sửa Họ và tên" }));
});
test("notes and visits are never shown on self profiles, including managers with cached history", async () => {
  for (const role of [
    "user",
    "deacon",
    "board",
    "leader",
    "admin",
    "secretary",
  ]) {
    globalThis.fetch = async (input) => {
      const path = String(input);
      if (path === "/api/auth/me")
        return respond({ user: { ...user(true), role, roles: [role] } });
      if (path === "/api/catalog") return respond({ departments });
      throw new Error(`Unexpected request: ${path}`);
    };
    const createdAt = new Date().toISOString();
    const cached = {
      ...fixture,
      canReadNotes: true,
      canReadVisitHistory: true,
      notes: [
        {
          id: "cached-note",
          text: "Ghi chú bí mật",
          authorName: "Quản lý",
          createdAt,
          organizationId: orgs[0].id,
          memberId: fixture.id,
          authorId: fixture.id,
        },
      ],
      visitHistory: [
        {
          id: "cached-visit",
          visitedOn: "2025-01-02",
          authorName: "Quản lý",
          authorId: fixture.id,
          createdAt,
          organizationId: orgs[0].id,
          memberId: fixture.id,
          source: "user" as const,
          summary: "",
        },
      ],
    };
    const show = (member: typeof cached) =>
      mount(
        <>
          <HistoryReady />
          <MemberNotes
            org={orgs[0].id}
            member={member}
            editable
            onUpdated={async () => {}}
          />
          <VisitHistory
            org={orgs[0].id}
            member={member}
            editable
            onUpdated={async () => {}}
          />
        </>,
      );
    show(cached);
    // Wait until authentication finishes before asserting the absence of private UI.
    await screen.findByText("Đã tải quyền xem");
    assert.equal(
      screen.queryByRole("heading", { name: "Ghi chú" }),
      null,
      role,
    );
    assert.equal(
      screen.queryByRole("heading", { name: "Lịch sử thăm viếng" }),
      null,
      role,
    );
    assert.equal(screen.queryByText("Ghi chú bí mật"), null, role);
    cleanup();
    show({ ...cached, id: "20000000-0000-4000-8000-000000000102" });
    if (["leader", "board", "admin", "secretary"].includes(role)) {
      await screen.findByRole("heading", { name: "Lịch sử thăm viếng" });
      assert.ok(screen.getByRole("heading", { name: "Ghi chú" }));
      assert.ok(screen.getByRole("button", { name: "Thêm lần thăm viếng" }));
      assert.ok(screen.getByRole("button", { name: "Thêm ghi chú" }));
    } else {
      await screen.findByText("Đã tải quyền xem");
      assert.equal(screen.queryByRole("heading", { name: "Ghi chú" }), null);
      assert.equal(
        screen.queryByRole("heading", { name: "Lịch sử thăm viếng" }),
        null,
      );
    }
    cleanup();
  }
});
test("OTP entries stay hidden for everyone and direct screens deny every non-admin role", async () => {
  for (const role of [
    "admin",
    "secretary",
    "deacon",
    "leader",
    "board",
    "user",
  ]) {
    const paths: string[] = [];
    globalThis.fetch = async (input) => {
      const path = String(input);
      paths.push(path);
      if (path === "/api/auth/me")
        return respond({
          user: {
            ...user(true),
            role,
            roles: [role],
            boardDepartmentIds: ["thanh-nien"],
          },
        });
      if (path === "/api/catalog") return respond({ departments });
      if (path === "/api/members/me") return respond(fixture);
      throw new Error(`Unexpected request: ${path}`);
    };
    mount(<MemberDetail org={orgs[0].id} profile />);
    await screen.findByRole("heading", { name: fixture.user.name });
    assert.equal(
      screen.queryByRole("link", { name: "Mã OTP của Ban ngành" }),
      null,
    );
    cleanup();
    if (role !== "admin") {
      mount(<TeamOtps />);
      await screen.findByText("Chỉ Admin có quyền xem mã OTP.");
      assert.equal(
        paths.some((path) => path.startsWith("/api/leader/otps")),
        false,
      );
      cleanup();
    }
  }
});
test("OTP requests load more at the bottom, have iOS back navigation, and reload on reopening", async () => {
  globalThis.IntersectionObserver =
    BottomObserver as unknown as typeof IntersectionObserver;
  globalThis.EventSource = class {
    constructor() {
      throw new Error(
        "Client should reload on entry without a live subscription",
      );
    }
  } as unknown as typeof EventSource;
  const requested: number[] = [];
  let reopened = false;
  globalThis.fetch = async (input) => {
    const path = String(input);
    if (path === "/api/auth/me")
      return respond({
        user: {
          ...user(false),
          role: "admin",
          roles: ["admin"],
          boardDepartmentIds: [],
          permissions: ["leader.otps.read"],
        },
      });
    if (path === "/api/catalog") return respond({ departments });
    if (path.startsWith("/api/leader/otps")) {
      const page = Number(
        new URL(path, "http://localhost").searchParams.get("page"),
      );
      requested.push(page);
      if (reopened) return respond({ items: [], total: 0, page });
      const count = page === 1 ? 20 : 1;
      return respond({
        total: 21,
        page,
        items: Array.from({ length: count }, (_, index) => ({
          id: `${page}-${index}`,
          full_name: `Yêu cầu ${page}-${index}`,
          phone: "0900000000",
          department_name: "Ban Thanh niên",
          otp_code: "123456",
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          purpose: "Xác thực tài khoản lần đầu",
        })),
      });
    }
    throw new Error(`Unexpected request: ${path}`);
  };
  const client = mount(<TeamOtps />);
  await screen.findByText("Yêu cầu 1-0");
  const back = screen.getByRole("link", { name: "Quay lại hồ sơ cá nhân" });
  assert.equal(back.getAttribute("href"), "#/profile");
  assert.ok(back.querySelector("svg"));
  assert.equal(screen.queryByText("Đang đồng bộ trực tiếp"), null);
  assert.equal(screen.queryByRole("button", { name: "Trước" }), null);
  assert.equal(screen.queryByRole("button", { name: "Tiếp" }), null);
  act(() => BottomObserver.current.emit());
  await screen.findByText("Yêu cầu 2-0");
  assert.deepEqual(requested, [1, 2]);
  assert.ok(screen.getByText("Yêu cầu 1-0"));
  cleanup();
  await waitFor(() =>
    assert.equal(client.getQueryData(["team-otps", fixture.id]), undefined),
  );
  reopened = true;
  mount(<TeamOtps />);
  await screen.findByText("Không có yêu cầu OTP đang chờ.");
  assert.deepEqual(requested, [1, 2, 1]);
});
test("team directory loads without search; family summaries are plain text with no profile links", async () => {
  const relativeName = "Người thân ngoài Ban ngành";
  const restricted = {
    ...fixture,
    canEdit: true,
    canManageLinks: false,
    family: null,
    familyDetailsRestricted: true,
    familySummaries: [{ name: relativeName, relationship: "Con" }],
    teamDepartmentIds: fixture.departments.map((d) => d.id),
  };
  let loaded = false;
  globalThis.fetch = async (input) => {
    const path = String(input);
    if (path === "/api/auth/me") return respond({ user: user(true) });
    if (path === "/api/catalog") return respond({ departments });
    if (path.startsWith("/api/leader/members?")) {
      loaded = true;
      return respond({ items: [restricted], total: 1 });
    }
    if (path.startsWith("/api/leader/members/")) return respond(restricted);
    if (path === "/api/members/me") return respond(fixture);
    throw new Error(`Unexpected request: ${path}`);
  };
  mount(<MemberDirectory org={orgs[0].id} active team onOpen={() => {}} />);
  const link = await screen.findByRole("link", {
    name: new RegExp(fixture.user.name),
  });
  assert.equal(loaded, true);
  assert.equal(link.getAttribute("href"), `#/leader/members/${fixture.id}`);
  cleanup();
  mount(<MemberDetail org={orgs[0].id} memberId={fixture.id} team />);
  const relative = await screen.findByText(relativeName);
  assert.equal(relative.closest("a,button"), null);
  assert.ok(screen.getByRole("button", { name: "Sửa Họ và tên" }));
  assert.equal(
    screen.queryByRole("button", { name: "Cập nhật Gia đình" }),
    null,
  );
});
