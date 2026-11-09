import { z } from "zod";
// Restrict server-side outbound requests to known Web Push provider domains.
export const PushEndpoint = z
  .string()
  .max(2048)
  .url()
  .refine((value) => {
    const url = new URL(value),
      host = url.hostname;
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.hash &&
      (!url.port || url.port === "443") &&
      ([
        "fcm.googleapis.com",
        "android.googleapis.com",
        "updates.push.services.mozilla.com",
        "web.push.apple.com",
      ].includes(host) ||
        [
          ".push.services.mozilla.com",
          ".push.apple.com",
          ".notify.windows.com",
        ].some((suffix) => host.endsWith(suffix)))
    );
  }, "Địa chỉ dịch vụ thông báo không hợp lệ.");
const key = (bytes: number) =>
  z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .refine(
      (value) => value.length === Math.ceil((bytes * 8) / 6),
      "Khóa thông báo không hợp lệ.",
    );
export const PushSubscribeInput = z
  .object({
    endpoint: PushEndpoint,
    keys: z.object({ p256dh: key(65), auth: key(16) }).strict(),
    deviceLabel: z.string().trim().max(100).optional(),
  })
  .strict();
export const PushUnsubscribeInput = z
  .object({ endpoint: PushEndpoint })
  .strict();
export const PushDestination = z
  .string()
  .max(200)
  .refine(
    (value) =>
      /^\/client#\/(profile|assignments|events\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
        value,
      ),
    "Trang thông báo không hợp lệ.",
  );
export const PushPayload = z
  .object({
    title: z.string().min(1).max(100),
    body: z.string().max(240),
    url: PushDestination,
    tag: z.string().min(1).max(100),
    type: z.enum(["event", "test", "schedule"]),
    referenceId: z.uuid().optional(),
  })
  .strict();
export type PushMessage = z.infer<typeof PushPayload>;
export function memberEventHash(value: string) {
  return /^#\/events\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : undefined;
}

export function memberNotificationHash(value: string) {
  return value === "#/assignments" ? value : memberEventHash(value);
}
