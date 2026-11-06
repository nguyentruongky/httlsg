import test from "node:test";
import assert from "node:assert/strict";
import { apiRequest, advanceAuthEpoch } from "./api-client";
test("bad credentials and stale pre-rotation requests cannot expire a newer authenticated session", async () => {
  const originalFetch = globalThis.fetch;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  let expired = 0;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      dispatchEvent: () => {
        expired++;
        return true;
      },
    },
  });
  try {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: "Invalid" }), { status: 401 });
    await assert.rejects(apiRequest("/api/auth/login"));
    await assert.rejects(apiRequest("/api/auth/verify-otp"));
    assert.equal(expired, 0);
    let finish!: (value: Response) => void;
    globalThis.fetch = () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      });
    const old = apiRequest("/api/members");
    advanceAuthEpoch();
    finish(new Response("{}", { status: 401 }));
    await assert.rejects(old);
    assert.equal(expired, 0);
    globalThis.fetch = async () => new Response("{}", { status: 401 });
    await assert.rejects(apiRequest("/api/members"));
    assert.equal(expired, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("access tokens stay in memory and simultaneous expired requests share one refresh", async () => {
  const original = globalThis.fetch;
  const { clearBrowserAuth } = await import("./api-client");
  let refreshes = 0;
  const sent: string[] = [];
  globalThis.fetch = async (path, init) => {
    const headers = new Headers(init?.headers);
    if (path === "/api/auth/login")
      return new Response(JSON.stringify({ accessToken: "short-lived-a" }));
    if (path === "/api/auth/refresh") {
      refreshes++;
      assert.equal(headers.get("X-Church-CSRF"), "1");
      assert.equal(headers.get("Authorization"), null);
      await new Promise((resolve) => setTimeout(resolve, 10));
      return new Response(JSON.stringify({ accessToken: "short-lived-b" }));
    }
    sent.push(headers.get("Authorization") ?? "");
    return new Response("{}", {
      status:
        headers.get("Authorization") === "Bearer short-lived-b" ? 200 : 401,
    });
  };
  try {
    await apiRequest("/api/auth/login", { method: "POST", body: "{}" });
    await Promise.all([apiRequest("/api/members"), apiRequest("/api/members")]);
    assert.equal(refreshes, 1);
    assert.deepEqual(sent, [
      "Bearer short-lived-a",
      "Bearer short-lived-a",
      "Bearer short-lived-b",
      "Bearer short-lived-b",
    ]);
    await assert.rejects(apiRequest("https://attacker.test/api/members"));
  } finally {
    clearBrowserAuth();
    globalThis.fetch = original;
  }
});

test("logout during a refresh cannot resurrect an access credential from the stale response", async () => {
  const original = globalThis.fetch;
  const { clearBrowserAuth } = await import("./api-client");
  let deliver!: (response: Response) => void;
  let requested!: () => void;
  const refreshing = new Promise<void>((resolve) => {
    requested = resolve;
  });
  const sent: string[] = [];
  globalThis.fetch = async (path, init) => {
    if (path === "/api/auth/refresh") {
      requested();
      return new Promise((resolve) => {
        deliver = resolve;
      });
    }
    sent.push(new Headers(init?.headers).get("Authorization") ?? "");
    return new Response("{}", { status: 401 });
  };
  try {
    const pending = apiRequest("/api/members");
    await refreshing;
    clearBrowserAuth();
    deliver(new Response(JSON.stringify({ accessToken: "stale-token" })));
    await assert.rejects(pending);
    assert.deepEqual(sent, [""]);
  } finally {
    clearBrowserAuth();
    globalThis.fetch = original;
  }
});

test("replayed refresh credentials emit a security alert and clear the in-memory session", async () => {
  const original = globalThis.fetch;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const events: string[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      dispatchEvent: (event: Event) => {
        events.push(event.type);
        return true;
      },
    },
  });
  globalThis.fetch = async (path) =>
    new Response(
      JSON.stringify(
        path === "/api/auth/refresh" ? { code: "REFRESH_REPLAY" } : {},
      ),
      { status: 401 },
    );
  try {
    await assert.rejects(apiRequest("/api/auth/me"));
    assert.deepEqual(events, [
      "church:security-alert",
      "church:session-expired",
    ]);
  } finally {
    globalThis.fetch = original;
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
