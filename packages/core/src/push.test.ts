import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PushEndpoint,
  PushSubscribeInput,
  PushDestination,
  PushPayload,
  memberEventHash,
} from "./push";
const endpoint = "https://fcm.googleapis.com/fcm/send/example";
const keys = {
  p256dh: Buffer.alloc(65, 4).toString("base64url"),
  auth: Buffer.alloc(16, 1).toString("base64url"),
};
test("push endpoints allow trusted providers and reject SSRF or credential URLs", () => {
  for (const value of [
    endpoint,
    "https://updates.push.services.mozilla.com/wpush/v2/example",
    "https://web.push.apple.com/Q/example",
  ])
    assert.ok(PushEndpoint.safeParse(value).success);
  for (const value of [
    "http://fcm.googleapis.com/fcm/send/x",
    "https://127.0.0.1/a",
    "https://example.com/a",
    "https://fcm.googleapis.com.evil.example/a",
    "https://fcm.googleapis.com:8443/a",
    "https://user:pass@fcm.googleapis.com/a",
    endpoint + "#secret",
  ])
    assert.equal(PushEndpoint.safeParse(value).success, false);
});
test("subscription contracts validate keys and reject caller-selected ownership", () => {
  assert.ok(
    PushSubscribeInput.safeParse({ endpoint, keys, deviceLabel: "iPhone" })
      .success,
  );
  for (const value of [
    { endpoint, keys: { ...keys, auth: "short" } },
    { endpoint, keys, userId: "victim" },
    { endpoint, keys, expirationTime: null },
  ])
    assert.equal(PushSubscribeInput.safeParse(value).success, false);
});
test("push payload destinations are same-origin member routes and login accepts only event hashes", () => {
  const id = "10000000-0000-4000-8000-000000000001",
    url = "/client#/events/" + id;
  assert.ok(
    PushPayload.safeParse({
      title: "Hội Thánh",
      body: "Có thông báo mới.",
      url,
      tag: "event:" + id,
      type: "event",
      referenceId: id,
    }).success,
  );
  assert.equal(memberEventHash("#/events/" + id), "#/events/" + id);
  for (const value of [
    "https://evil.example/",
    "//evil.example/",
    "/dashboard",
    "/client#/events/../profile",
    "/client#/profile?redirect=https://evil.example",
  ])
    assert.equal(PushDestination.safeParse(value).success, false);
  assert.equal(memberEventHash("#/events/../profile"), undefined);
  assert.equal(
    PushPayload.safeParse({
      title: "x",
      body: "x",
      url: "/client#/profile",
      tag: "x",
      type: "test",
      privateEmail: "private",
    }).success,
    false,
  );
});
