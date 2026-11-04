import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  AuthSessionProvider,
  useAuth,
  AccessRoleSchema,
  accessRoleLabels,
  getDirectoryMember,
  orgs,
  departments,
  type AccessRole,
} from "@org/core";
import { LoginForm, ClientAuthGate } from "../src/login-form";
import { MemberDetail } from "../src/member-detail";
const fixture = await getDirectoryMember(
  orgs[0].id,
  "20000000-0000-4000-8000-000000000101",
);
const catalog = departments.map((d) => ({ ...d }));
const originalFetch = globalThis.fetch;
afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
function setup(role: AccessRole, signedIn = false, fail = false) {
  let signed = signedIn;
  globalThis.fetch = async (input, init) => {
    const path = String(input);
    if (path === "/api/auth/me")
      return signed
        ? json({
            user: {
              id: fixture.id,
              email: "member@example.test",
              name: fixture.user.name,
              role,
              roleLabel: accessRoleLabels[role],
              departmentIds: [],
              permissions: [],
            },
          })
        : json({ message: "Vui lòng đăng nhập." }, 401);
    if (path === "/api/auth/identify") return json({ next: "password" });
    if (path === "/api/catalog") return json({ departments: catalog });
    if (path === "/api/auth/login") {
      if (fail)
        return json({ message: "Email hoặc mật khẩu không đúng." }, 401);
      signed = true;
      return json({ redirectTo: "/client" });
    }
    if (path === "/api/members/me")
      return json({
        ...fixture,
        accessRole: role,
        canEdit: role !== "deacon" && role !== "board",
        canManageLinks: role === "admin" || role === "secretary",
      });
    throw new Error(`Unexpected request ${path}`);
  };
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  return (children: React.ReactNode) =>
    render(
      <QueryClientProvider client={client}>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </QueryClientProvider>,
    );
}
test("all five roles use one login form and reach the client view", async () => {
  for (const role of AccessRoleSchema.options) {
    const show = setup(role);
    show(
      <ClientAuthGate>
        <p>Danh sách sau đăng nhập</p>
      </ClientAuthGate>,
    );
    await screen.findByRole("heading", { name: "Đăng nhập" });
    assert.equal(screen.queryByRole("combobox"), null);
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Số điện thoại hoặc email"),
      "member@example.test",
    );
    assert.equal(screen.queryByLabelText("Mật khẩu"), null);
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await user.type(
      await screen.findByLabelText("Mật khẩu"),
      "Correct-password-29!",
    );
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    await screen.findByText("Danh sách sau đăng nhập");
    cleanup();
  }
});
test("login displays server errors and allows another attempt", async () => {
  const show = setup("user", false, true);
  show(
    <ClientAuthGate>
      <p>Authenticated</p>
    </ClientAuthGate>,
  );
  const user = userEvent.setup();
  await user.type(
    await screen.findByLabelText("Số điện thoại hoặc email"),
    "member@example.test",
  );
  await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
  await user.type(
    await screen.findByLabelText("Mật khẩu"),
    "Wrong-password-29!",
  );
  await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
  assert.equal(
    (await screen.findByRole("alert")).textContent,
    "Email hoặc mật khẩu không đúng.",
  );
  assert.ok(screen.getByRole("button", { name: "Đăng nhập" }));
  assert.equal(screen.queryByText("Authenticated"), null);
});
test("every role has a profile; only Admin and Thư ký see the dashboard link", async () => {
  for (const role of AccessRoleSchema.options) {
    const show = setup(role, true);
    show(
      <ClientAuthGate>
        <MemberDetail org={orgs[0].id} profile />
      </ClientAuthGate>,
    );
    await screen.findByRole("heading", { name: fixture.user.name });
    assert.equal(
      Boolean(screen.queryByRole("link", { name: "Mở trang quản trị" })),
      role === "admin" || role === "secretary",
    );
    assert.ok(screen.getByRole("button", { name: "Đăng xuất" }));
    if (role === "user")
      assert.ok(screen.getByRole("button", { name: "Sửa Họ và tên" }));
    if (role === "deacon")
      assert.equal(
        screen.queryByRole("button", { name: "Sửa Họ và tên" }),
        null,
      );
    cleanup();
  }
});

test("changing the authenticated identity clears data cached by the previous user", async () => {
  let identity = {
    id: "first",
    name: "First user",
    authVersion: 1,
    requiresPasswordSetup: false,
  };
  globalThis.fetch = async (input) =>
    String(input) === "/api/auth/me"
      ? json({ user: identity })
      : json({ departments: catalog });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Session() {
    const auth = useAuth();
    return (
      <>
        <p>{auth?.user?.name}</p>
        <button
          onClick={() => {
            void auth?.refresh();
          }}
        >
          Refresh identity
        </button>
      </>
    );
  }
  render(
    <QueryClientProvider client={client}>
      <AuthSessionProvider>
        <Session />
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
  await screen.findByText("First user");
  client.setQueryData(["private-old-user"], { private: true });
  identity = {
    id: "second",
    name: "Second user",
    authVersion: 2,
    requiresPasswordSetup: false,
  };
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Refresh identity" }));
  await screen.findByText("Second user");
  assert.equal(client.getQueryData(["private-old-user"]), undefined);
});

test("login starts with one field, clears passwords on identifier changes, and validates before lookup", async () => {
  const show = setup("user");
  show(
    <ClientAuthGate>
      <p>Authenticated</p>
    </ClientAuthGate>,
  );
  const user = userEvent.setup();
  const input = await screen.findByLabelText("Số điện thoại hoặc email");
  assert.equal(document.querySelectorAll("input").length, 1);
  assert.equal(screen.queryByLabelText("Mật khẩu"), null);
  await user.type(input, "member@example.test");
  await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
  await user.type(await screen.findByLabelText("Mật khẩu"), "Old-password-29!");
  await user.click(screen.getByRole("button", { name: "Thay đổi" }));
  assert.equal(screen.queryByLabelText("Mật khẩu"), null);
  await user.clear(screen.getByLabelText("Số điện thoại hoặc email"));
  await user.type(screen.getByLabelText("Số điện thoại hoặc email"), "invalid");
  await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
  assert.match(
    (await screen.findByRole("alert")).textContent ?? "",
    /không hợp lệ/,
  );
  await user.clear(screen.getByLabelText("Số điện thoại hoặc email"));
  await user.type(
    screen.getByLabelText("Số điện thoại hoặc email"),
    "member@example.test",
  );
  await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
  assert.equal(
    ((await screen.findByLabelText("Mật khẩu")) as HTMLInputElement).value,
    "",
  );
});
