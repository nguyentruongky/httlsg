import { measureRequest } from "./performance";
import type { AuthUser } from "@org/core";
import { after } from "next/server";
import { withActor } from "./session";
import type { DB } from "./db";
import { assertOrigin, body, failure, json, HttpError } from "./http";
import { sendSchedulePushNow } from "./schedule-notifications";
export async function scheduleApi(
  request: Request,
  fn: (db: DB, actor: AuthUser, input: unknown) => Promise<unknown>,
  write = false,
  dispatch = false,
) {
  return measureRequest(request, async () => {
    try {
      if (write) assertOrigin(request);
      const input = write
        ? await body(request, 1100000)
        : Object.fromEntries(new URL(request.url).searchParams);
      const result: any = await withActor(
        request,
        (db, actor) => fn(db, actor, input),
        write,
      );
      if (
        dispatch &&
        result.id &&
        ["published", "cancelled"].includes(result.status)
      ) {
        const scheduleId = result.id;
        // The notification queue has committed; delivery must not delay the save response.
        after(async () => {
          try {
            await sendSchedulePushNow(scheduleId);
          } catch {
            console.warn("Schedule push delivery deferred to retry");
          }
        });
        result.notificationDelivery = { queued: true };
      }
      return json(result);
    } catch (error) {
      if ((error as { code?: string })?.code === "23505")
        return failure(
          new HttpError(
            409,
            "Lịch hoặc phân công đã tồn tại. Vui lòng tải lại và kiểm tra nội dung trùng.",
          ),
        );
      return failure(error);
    }
  });
}
