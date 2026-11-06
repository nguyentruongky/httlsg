import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthSessionProvider, type AuthUser } from "@org/core";
import { ClientAuthGate } from "../src/login-form";
const originalFetch = globalThis.fetch;
afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});
const actor: AuthUser = {
  id: "50000000-0000-4000-8000-000000000001",
  name: "Thành viên",
  email: null,
  phone: "+84901234567",
  role: "user",
  roleLabel: "User",
  permissions: [],
  departmentIds: [],
  departmentId: "thanh-nien",
  leaderDepartmentId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  isPasswordSet: false,
  requiresPasswordSetup: true,
  authVersion: 1,
};
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}
function show(
  initial: AuthUser | null = null,
  returningPhone = false,
  profileEmail = false,
) {
  let user = initial;
  const calls: { path: string; body: any }[] = [];
  globalThis.fetch = async (input, init) => {
    const path = String(input),
      body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ path, body });
    if (path === "/api/auth/identify")
      return json({
        next: "otp",
        ...(returningPhone
          ? { message: "Vui lòng liên hệ Admin để nhận mã OTP." }
          : {}),
      });
    if (path === "/api/auth/refresh")
      return new Response(JSON.stringify({ message: "Vui lòng đăng nhập." }), {
        status: 401,
      });
    if (path === "/api/auth/me")
      return user
        ? json({ user })
        : json({ message: "Vui lòng đăng nhập." }, 401);
    if (path === "/api/auth/access-options" || path === "/api/catalog")
      return json({
        departments: [{ id: "thanh-nien", name: "Ban Thanh niên" }],
      });
    if (path === "/api/auth/request-phone-otp")
      return json({ message: "Vui lòng liên hệ Admin để nhận mã OTP." }, 202);
    if (path === "/api/auth/request-email-otp")
      return json(
        profileEmail
          ? {
              message: "Vui lòng liên hệ Admin để nhận mã OTP.",
              delivery: "ADMIN",
            }
          : { message: "Mã OTP đã được gửi qua email.", delivery: "EMAIL" },
        202,
      );
    if (path === "/api/auth/verify-otp") {
      user = {
        ...actor,
        isPasswordSet: returningPhone,
        requiresPasswordSetup: !returningPhone,
      };
      return json({ user, requires_password_setup: !returningPhone });
    }
    if (path === "/api/auth/set-password") {
      user = {
        ...actor,
        isPasswordSet: true,
        requiresPasswordSetup: false,
        authVersion: 2,
      };
      return json({ user, requires_password_setup: false });
    }
    throw new Error(`Unexpected request ${path}`);
  };
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  render(
    <QueryClientProvider client={client}>
      <AuthSessionProvider>
        <ClientAuthGate>
          <p>Nội dung ứng dụng</p>
        </ClientAuthGate>
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
  return calls;
}
test("phone request uses a custom department picker, instructs the user to contact Admin, then forces password setup", async () => {
  const calls = show(),
    user = userEvent.setup();
  await screen.findByRole("heading", { name: "Đăng nhập" });
  assert.equal(screen.queryByLabelText("Mật khẩu"), null);
  await user.type(
    screen.getByLabelText("Số điện thoại hoặc email"),
    "0901234567",
  );
  await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
  await screen.findByRole("heading", { name: "Yêu cầu truy cập" });
  assert.equal(
    screen.queryByLabelText("Số điện thoại", { selector: "input" }),
    null,
  );
  await user.type(screen.getByLabelText("Họ và tên"), "Thành viên");
  await user.click(
    screen.getByRole("button", { name: /Ban ngành Chọn Ban ngành/ }),
  );
  await user.click(
    await screen.findByRole("option", { name: "Ban Thanh niên" }),
  );
  assert.equal(document.querySelector("select"), null);
  await user.click(screen.getByRole("button", { name: "Gửi yêu cầu" }));
  assert.match((await screen.findByRole("status")).textContent ?? "", /Admin/);
  assert.equal(
    calls.find((call) => call.path === "/api/auth/request-phone-otp")?.body
      .phone,
    "+84901234567",
  );
  await user.type(screen.getByLabelText("Mã OTP"), "012345");
  await user.click(screen.getByRole("button", { name: "Xác thực mã OTP" }));
  await screen.findByRole("heading", { name: "Đặt mật khẩu" });
  assert.equal(screen.queryByText("Nội dung ứng dụng"), null);
  await user.type(
    screen.getByLabelText("Mật khẩu mới"),
    "Permanent-password-29!",
  );
  await user.type(
    screen.getByLabelText("Xác nhận mật khẩu"),
    "Permanent-password-29!",
  );
  await user.click(
    screen.getByRole("button", { name: "Lưu mật khẩu và tiếp tục" }),
  );
  await screen.findByText("Nội dung ứng dụng");
});
test("restricted sessions cannot render application data or fetch the private catalog before password setup", async () => {
  const calls = show({ ...actor });
  await screen.findByRole("heading", { name: "Đặt mật khẩu" });
  assert.equal(screen.queryByText("Nội dung ứng dụng"), null);
  assert.equal(
    calls.some((call) => call.path === "/api/catalog"),
    false,
  );
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText("Mật khẩu mới"),
    "Permanent-password-29!",
  );
  await user.type(
    screen.getByLabelText("Xác nhận mật khẩu"),
    "Does-not-match-29!",
  );
  await user.click(
    screen.getByRole("button", { name: "Lưu mật khẩu và tiếp tục" }),
  );
  assert.match(
    (await screen.findByRole("alert")).textContent ?? "",
    /không khớp/,
  );
  assert.equal(
    calls.some((call) => call.path === "/api/auth/set-password"),
    false,
  );
});
test("email onboarding requests an email OTP without requiring a phone department", async () => {
  const calls = show(),
    user = userEvent.setup();
  await screen.findByRole("heading", { name: "Đăng nhập" });
  await user.type(
    screen.getByLabelText("Số điện thoại hoặc email"),
    "member@example.com",
  );
  await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
  await screen.findByRole("heading", { name: "Nhập mã OTP" });
  assert.deepEqual(
    calls.find((call) => call.path === "/api/auth/request-email-otp")?.body,
    { email: "member@example.com" },
  );
  assert.equal(
    calls.some((call) => call.path === "/api/auth/request-phone-otp"),
    false,
  );
});

test("returning phone login generates an Admin-delivered code and proceeds directly to verification", async () => {
  const calls = show(null, true),
    interaction = userEvent.setup();
  await screen.findByRole("heading", { name: "Đăng nhập" });
  await interaction.type(
    screen.getByLabelText("Số điện thoại hoặc email"),
    "0901234567",
  );
  await interaction.click(screen.getByRole("button", { name: "Tiếp tục" }));
  await screen.findByRole("heading", { name: "Nhập mã OTP" });
  assert.equal(screen.queryByLabelText("Mật khẩu"), null);
  assert.equal(screen.queryByLabelText("Họ và tên"), null);
  assert.ok(screen.getAllByText(/Admin/).length > 0);
  await interaction.type(screen.getByLabelText("Mã OTP"), "123456");
  await interaction.click(
    screen.getByRole("button", { name: "Xác thực mã OTP" }),
  );
  await screen.findByText("Nội dung ứng dụng");
  assert.equal(screen.queryByRole("heading", { name: "Đặt mật khẩu" }), null);
  assert.equal(
    calls.some(
      (call) =>
        call.path === "/api/auth/login" ||
        call.path === "/api/auth/request-phone-otp",
    ),
    false,
  );
  assert.equal(
    calls.some((call) => call.path === "/api/auth/verify-otp"),
    true,
  );
});

test("email matched to an existing unprovisioned profile shows Admin verification instructions", async () => {
  show(null, false, true);
  const interaction = userEvent.setup();
  await screen.findByRole("heading", { name: "Đăng nhập" });
  await interaction.type(
    screen.getByLabelText("Số điện thoại hoặc email"),
    "profile@example.test",
  );
  await interaction.click(screen.getByRole("button", { name: "Tiếp tục" }));
  await screen.findByRole("heading", { name: "Nhập mã OTP" });
  assert.ok(screen.getByText(/Liên hệ Admin để xác minh danh tính/));
  assert.equal(screen.queryByText(/Kiểm tra email và nhập mã/), null);
  await interaction.type(screen.getByLabelText("Mã OTP"), "123456");
  await interaction.click(
    screen.getByRole("button", { name: "Xác thực mã OTP" }),
  );
  await screen.findByRole("heading", { name: "Đặt mật khẩu" });
});
