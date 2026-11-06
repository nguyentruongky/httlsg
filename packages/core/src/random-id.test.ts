import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { createRequestId } from "./random-id";
function withCrypto(source: unknown, run: () => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: source,
  });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(globalThis, "crypto", original);
    else Reflect.deleteProperty(globalThis, "crypto");
  }
}
test("request IDs prefer native randomUUID with its receiver", () => {
  const source = {
    randomUUID() {
      assert.equal(this, source);
      return "native-id";
    },
  };
  withCrypto(source, () => assert.equal(createRequestId(), "native-id"));
});
test("HTTP browsers without randomUUID get secure, distinct RFC UUID v4 IDs", () => {
  withCrypto(
    { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) },
    () => {
      const ids = Array.from({ length: 100 }, () => createRequestId());
      for (const id of ids)
        assert.match(
          id,
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
      assert.equal(new Set(ids).size, ids.length);
    },
  );
});
test("request IDs fail closed when secure randomness is unavailable", () => {
  withCrypto(undefined, () =>
    assert.throws(createRequestId, /ngẫu nhiên an toàn/),
  );
  withCrypto({}, () => assert.throws(createRequestId, /ngẫu nhiên an toàn/));
});
