import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const root = new URL("../../../", import.meta.url);
for (const [app, entry] of [
  ["web-admin", "/client"],
  ["mobile-client", "/"],
])
  test(
    "PWA manifest and icons target the existing " + app + " member entry",
    () => {
      const path = new URL("apps/" + app + "/public/", root),
        manifest = JSON.parse(
          readFileSync(new URL("pwa/manifest.webmanifest", path), "utf8"),
        );
      assert.equal(manifest.name, "Hội Thánh");
      assert.equal(manifest.start_url, entry);
      assert.equal(manifest.scope, entry);
      assert.equal(manifest.display, "standalone");
      assert.equal(manifest.orientation, "any");
      for (const size of [192, 512]) {
        const icon = readFileSync(new URL("pwa/icon-" + size + ".png", path));
        assert.equal(icon.readUInt32BE(16), size);
        assert.equal(icon.readUInt32BE(20), size);
      }
      assert.ok(
        manifest.icons.some(
          (icon: { purpose: string }) => icon.purpose === "maskable",
        ),
      );
      const source = readFileSync(
        new URL(entry === "/" ? "sw.js" : "pwa/sw.js", path),
        "utf8",
      );
      assert.ok(!source.includes("__PWA_ENTRY__"));
      assert.ok(source.includes(JSON.stringify(entry)));
    },
  );
function worker(hasWindow = true) {
  const handlers = new Map<string, (event: any) => void>(),
    notices: any[] = [],
    opened: string[] = [],
    cached: string[] = [],
    navigated: string[] = [];
  let skipped = 0,
    focused = 0;
  const self = {
    location: { origin: "https://church.example" },
    registration: {
      showNotification: async (title: string, options: any) => {
        notices.push({ title, ...options });
      },
      getNotifications: async () => [],
    },
    clients: {
      claim: async () => {},
      matchAll: async () =>
        hasWindow
          ? [
              {
                url: "https://church.example/client#/profile",
                navigate: async (url: string) => {
                  navigated.push(url);
                },
                focus: async () => {
                  focused++;
                },
              },
            ]
          : [],
      openWindow: async (url: string) => {
        opened.push(url);
      },
    },
    skipWaiting: () => {
      skipped++;
    },
    addEventListener: (name: string, callback: (event: any) => void) =>
      handlers.set(name, callback),
  };
  const cache = {
    addAll: async (urls: string[]) => {
      cached.push(...urls);
    },
    match: async () => new Response("public offline"),
  };
  const context = {
    self,
    caches: {
      open: async () => cache,
      keys: async () => [],
      delete: async () => true,
    },
    fetch: async () => {
      throw new Error("offline");
    },
    URL,
    Response,
    Promise,
  };
  vm.runInNewContext(
    readFileSync(new URL("packages/core/pwa/sw.js", root), "utf8")
      .replace("__PWA_ENTRY__", "/client")
      .replace("__PWA_VERSION__", "test"),
    context,
  );
  async function run(name: string, options: any = {}) {
    let promise: Promise<unknown> | undefined;
    handlers.get(name)!({
      ...options,
      waitUntil: (value: Promise<unknown>) => {
        promise = value;
      },
    });
    await promise;
  }
  return {
    handlers,
    notices,
    opened,
    cached,
    navigated,
    run,
    skipped: () => skipped,
    focused: () => focused,
  };
}
test("worker only precaches public assets and requires consent before taking an update", async () => {
  const w = worker();
  await w.run("install");
  assert.equal(w.skipped(), 0);
  assert.ok(w.cached.every((url) => url.startsWith("/pwa/")));
  assert.ok(!w.cached.includes("/client"));
  await w.run("message", { data: { type: "SKIP_WAITING" } });
  assert.equal(w.skipped(), 1);
  let intercepted = false;
  w.handlers.get("fetch")!({
    request: {
      url: "https://church.example/api/auth/me",
      method: "GET",
      mode: "cors",
    },
    respondWith: () => {
      intercepted = true;
    },
  });
  assert.equal(intercepted, false);
  let response: Promise<Response> | undefined;
  w.handlers.get("fetch")!({
    request: {
      url: "https://church.example/client",
      method: "GET",
      mode: "navigate",
    },
    respondWith: (value: Promise<Response>) => {
      response = value;
    },
  });
  assert.equal(await (await response!).text(), "public offline");
});
test("push always creates a visible notification, and clicks stay on internal member routes", async () => {
  const w = worker();
  await w.run("push", {
    data: {
      json: () => {
        throw new Error("bad");
      },
    },
  });
  assert.equal(w.notices.length, 1);
  assert.equal(w.notices[0].title, "Thông báo mới từ Hội Thánh");
  const id = "10000000-0000-4000-8000-000000000001";
  await w.run("push", {
    data: {
      json: () => ({
        title: "Hội Thánh",
        body: "Có tin mới.",
        url: "/client#/events/" + id,
      }),
    },
  });
  assert.equal(w.notices[1].data.url, "/client#/events/" + id);
  let closed = false;
  await w.run("notificationclick", {
    notification: {
      close: () => {
        closed = true;
      },
      data: { url: "/client#/events/" + id },
    },
  });
  assert.equal(closed, true);
  assert.equal(w.navigated[0], "https://church.example/client#/events/" + id);
  assert.equal(w.focused(), 1);
  await w.run("notificationclick", {
    notification: { close: () => {}, data: { url: "https://evil.example/" } },
  });
  assert.equal(w.navigated[1], "https://church.example/client#/profile");
});

test("notification clicks open a member window when the app is closed", async () => {
  const w = worker(false),
    id = "10000000-0000-4000-8000-000000000001";
  await w.run("notificationclick", {
    notification: { close: () => {}, data: { url: "/client#/events/" + id } },
  });
  assert.deepEqual(w.opened, ["https://church.example/client#/events/" + id]);
});
