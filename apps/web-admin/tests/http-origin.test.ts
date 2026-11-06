import { test } from "node:test";
import assert from "node:assert/strict";
import { assertOrigin } from "../lib/server/http";
test("development permits loopback and configured LAN origins on app/proxy ports only", () => {
  const mode = process.env.NODE_ENV,
    origin = process.env.APP_ORIGIN;
  try {
    Reflect.set(process.env, "NODE_ENV", "development");
    process.env.APP_ORIGIN = "http://192.168.100.137:3000";
    for (const host of ["localhost", "127.0.0.1", "192.168.100.137"])
      for (const port of [3000, 5173])
        assert.doesNotThrow(() =>
          assertOrigin(
            new Request("http://127.0.0.1:3000/api/auth/login", {
              headers: { Origin: `http://${host}:${port}` },
            }),
          ),
        );
    for (const bad of [
      "http://evil.example:3000",
      "http://192.168.100.138:3000",
      "http://localhost:9000",
      "null",
    ])
      assert.throws(() =>
        assertOrigin(
          new Request("http://127.0.0.1:3000/api/auth/login", {
            headers: { Origin: bad },
          }),
        ),
      );
    assert.throws(() =>
      assertOrigin(new Request("http://127.0.0.1:3000/api/auth/login")),
    );
    Reflect.set(process.env, "NODE_ENV", "production");
    process.env.APP_ORIGIN = "https://church.example.test";
    assert.doesNotThrow(() =>
      assertOrigin(
        new Request("https://church.example.test/api/auth/login", {
          headers: { Origin: "https://church.example.test" },
        }),
      ),
    );
    for (const local of [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://192.168.100.137:3000",
    ])
      assert.throws(() =>
        assertOrigin(
          new Request("https://church.example.test/api/auth/login", {
            headers: { Origin: local },
          }),
        ),
      );
  } finally {
    Reflect.set(process.env, "NODE_ENV", mode);
    if (origin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = origin;
  }
});
