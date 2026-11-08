import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthSessionProvider } from "@org/core";
import { App } from "../src/app";
import { PwaRoot } from "../src/pwa";
import { PwaDeviceSettings } from "../src/pwa-settings";
const originalFetch = globalThis.fetch;
const descriptors = new Map<
  object,
  Map<string, PropertyDescriptor | undefined>
>();
function define(object: object, key: string, value: unknown) {
  if (!descriptors.has(object)) descriptors.set(object, new Map());
  if (!descriptors.get(object)!.has(key))
    descriptors
      .get(object)!
      .set(key, Object.getOwnPropertyDescriptor(object, key));
  Object.defineProperty(object, key, {
    value,
    configurable: true,
    writable: true,
  });
}
afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  window.localStorage.clear();
  for (const [object, properties] of descriptors)
    for (const [key, value] of properties) {
      if (value) Object.defineProperty(object, key, value);
      else Reflect.deleteProperty(object, key);
    }
  descriptors.clear();
});
function setup({
  ios = false,
  standalone = false,
  secure = true,
  denied = false,
  waiting = false,
} = {}) {
  let subscription: any = null,
    registered = false,
    permissionCalls = 0,
    subscribeCalls = 0,
    unsubscribeCalls = 0,
    workerCalls = 0;
  const posted: any[] = [],
    writes: any[] = [],
    handlers = new Map<string, () => void>();
  const key = Buffer.alloc(65, 4).toString("base64url");
  const reg = {
    scope: "http://localhost:5173/",
    active: { postMessage: (value: any) => posted.push(value) },
    waiting: waiting
      ? { postMessage: (value: any) => posted.push(value) }
      : null,
    update: async () => {},
    addEventListener: (name: string, callback: () => void) =>
      handlers.set(name, callback),
    removeEventListener() {},
    pushManager: {
      getSubscription: async () => subscription,
      subscribe: async (options: any) => {
        subscribeCalls++;
        assert.equal(options.userVisibleOnly, true);
        subscription = {
          endpoint: "https://fcm.googleapis.com/fcm/send/device-one",
          options,
          unsubscribe: async () => {
            unsubscribeCalls++;
            subscription = null;
            return true;
          },
          toJSON: () => ({
            endpoint: "https://fcm.googleapis.com/fcm/send/device-one",
            expirationTime: null,
            keys: { p256dh: "B".repeat(87), auth: "A".repeat(22) },
          }),
        };
        return subscription;
      },
    },
  };
  define(window, "isSecureContext", secure);
  define(window, "matchMedia", () => ({
    matches: standalone,
    addEventListener() {},
    removeEventListener() {},
  }));
  define(
    navigator,
    "userAgent",
    ios ? "Mozilla iPhone Safari" : "Mozilla Chrome",
  );
  define(navigator, "platform", ios ? "iPhone" : "Linux");
  define(navigator, "maxTouchPoints", ios ? 5 : 0);
  define(window, "PushManager", function () {});
  define(globalThis, "localStorage", window.localStorage);
  const notice = {
    permission: denied ? "denied" : "default",
    requestPermission: async () => {
      permissionCalls++;
      notice.permission = "granted";
      return "granted";
    },
  };
  define(globalThis, "Notification", notice);
  define(navigator, "serviceWorker", {
    register: async (path: string, options: any) => {
      workerCalls++;
      assert.equal(path, "/sw.js");
      assert.equal(options.scope, "/");
      return reg;
    },
    controller: waiting ? reg.active : null,
    ready: Promise.resolve(reg),
    addEventListener() {},
    removeEventListener() {},
  });
  globalThis.fetch = async (input, init) => {
    const path = String(input);
    if (path === "/api/auth/me")
      return new Response(
        JSON.stringify({
          user: {
            id: "10000000-0000-4000-8000-000000000001",
            name: "Member",
            email: "member@example.test",
            role: "user",
            roleLabel: "User",
            permissions: [],
            departmentIds: [],
            authVersion: 1,
            requiresPasswordSetup: false,
          },
        }),
      );
    if (path === "/api/catalog")
      return new Response(JSON.stringify({ departments: [] }));
    if (path.startsWith("/api/push/status"))
      return new Response(
        JSON.stringify({
          configured: true,
          publicKey: key,
          active: Boolean(
            registered && subscription && path.includes("fingerprint="),
          ),
          activeCount: registered ? 1 : 0,
        }),
      );
    if (path === "/api/push/subscribe") {
      assert.equal(permissionCalls, 1);
      const value = JSON.parse(String(init?.body));
      assert.equal(value.expirationTime, undefined);
      writes.push(value);
      registered = true;
      return new Response(JSON.stringify({ success: true }));
    }
    if (path === "/api/push/unsubscribe") {
      registered = false;
      writes.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ success: true }));
    }
    if (path.startsWith("/api/push/events/"))
      return new Response(
        JSON.stringify({
          id: path.split("/").at(-1),
          eventDate: "2026-11-08",
          title: "Chương trình dành cho bạn",
          originalText: "Nội dung đã được cấp quyền",
        }),
      );
    if (path === "/api/push/test")
      return new Response(JSON.stringify({ sent: 1, failed: 0 }));
    throw new Error("Unexpected PWA request " + path);
  };
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  function show(view?: React.ReactNode) {
    return render(
      <QueryClientProvider client={client}>
        <AuthSessionProvider>
          <PwaRoot>
            {view ?? (
              <>
                <input aria-label="Bản nháp" />
                <PwaDeviceSettings />
              </>
            )}
          </PwaRoot>
        </AuthSessionProvider>
      </QueryClientProvider>,
    );
  }
  return {
    show,
    posted,
    writes,
    permissionCalls: () => permissionCalls,
    subscribeCalls: () => subscribeCalls,
    unsubscribeCalls: () => unsubscribeCalls,
    workerCalls: () => workerCalls,
  };
}
test("push permission is requested only on tap and enable/disable are server-confirmed", async () => {
  const state = setup({ standalone: true });
  state.show();
  const user = userEvent.setup();
  const enable = await screen.findByRole("button", { name: "Bật thông báo" });
  await waitFor(() =>
    assert.equal((enable as HTMLButtonElement).disabled, false),
  );
  assert.equal(state.permissionCalls(), 0);
  assert.equal(state.subscribeCalls(), 0);
  await user.click(enable);
  await screen.findByText("Đang nhận thông báo trên thiết bị này.");
  assert.equal(state.permissionCalls(), 1);
  assert.equal(state.subscribeCalls(), 1);
  assert.equal(state.writes.length, 1);
  await user.click(screen.getByRole("button", { name: "Gửi thông báo thử" }));
  await screen.findByText("Đã gửi thông báo thử.");
  await user.click(screen.getByRole("button", { name: "Tắt thông báo" }));
  await screen.findByText("Đã tắt thông báo trên thiết bị.");
  assert.equal(state.unsubscribeCalls(), 1);
  assert.equal(state.writes.length, 2);
});
test("iOS explains Home Screen installation, avoids fake native install and respects dismissal", async () => {
  const state = setup({ ios: true });
  state.show();
  const user = userEvent.setup();
  await screen.findByText("Chọn Thêm vào Màn hình chính.");
  assert.ok(screen.getByText("Bật Mở dưới dạng ứng dụng web nếu có."));
  assert.equal(screen.queryByRole("button", { name: "Cài ứng dụng" }), null);
  assert.equal(screen.queryByRole("button", { name: "Bật thông báo" }), null);
  assert.equal(state.permissionCalls(), 0);
  await user.click(screen.getByRole("button", { name: "Ẩn hướng dẫn" }));
  cleanup();
  state.show();
  await screen.findByText(/Thêm ứng dụng vào Màn hình chính, rồi mở/);
  assert.equal(screen.queryByText("Chọn Thêm vào Màn hình chính."), null);
});
test("Chromium invokes the real install prompt only after the install button is clicked", async () => {
  const state = setup();
  state.show();
  await screen.findByText("Cài ứng dụng Hội Thánh");
  let prompts = 0;
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, {
    prompt: async () => {
      prompts++;
    },
    userChoice: Promise.resolve({ outcome: "accepted" }),
  });
  act(() => window.dispatchEvent(event));
  assert.equal(prompts, 0);
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Cài ứng dụng" }));
  assert.equal(prompts, 1);
  act(() => window.dispatchEvent(new Event("appinstalled")));
  assert.equal(screen.queryByText("Cài ứng dụng Hội Thánh"), null);
});
test("blocked permission and insecure devices degrade without automatic permission prompts", async () => {
  const state = setup({ standalone: true, denied: true });
  state.show();
  await screen.findByText(/Thông báo đã bị chặn/);
  assert.equal(
    (screen.getByRole("button", { name: "Bật thông báo" }) as HTMLButtonElement)
      .disabled,
    true,
  );
  assert.equal(state.permissionCalls(), 0);
  cleanup();
  const insecure = setup({ secure: false });
  insecure.show();
  await screen.findByText(/Mở ứng dụng qua HTTPS/);
  assert.equal(insecure.workerCalls(), 0);
  assert.equal(screen.queryByRole("button", { name: "Bật thông báo" }), null);
});
test("waiting worker does not interrupt a form and activates only after explicit consent", async () => {
  const state = setup({ standalone: true, waiting: true });
  state.show();
  await screen.findByText("Có phiên bản ứng dụng mới");
  const draft = screen.getByRole("textbox", {
    name: "Bản nháp",
  }) as HTMLInputElement;
  fireEvent.change(draft, { target: { value: "Nội dung đang soạn" } });
  assert.equal(state.posted.length, 0);
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Cập nhật ứng dụng" }));
  assert.equal(draft.value, "Nội dung đang soạn");
  assert.deepEqual(state.posted, [{ type: "SKIP_WAITING" }]);
});

test("a standard member can open an authorized event notification without being redirected to profile", async () => {
  const old = window.location.hash,
    id = "10000000-0000-4000-8000-000000000001";
  window.location.hash = "/events/" + id;
  try {
    const state = setup({ standalone: true });
    state.show(<App />);
    await screen.findByText("Nội dung đã được cấp quyền");
    assert.equal(window.location.hash, "#/events/" + id);
    assert.equal(
      screen.queryByRole("navigation", { name: "Điều hướng thành viên" }),
      null,
    );
  } finally {
    window.location.hash = old;
  }
});
