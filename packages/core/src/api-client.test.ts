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
