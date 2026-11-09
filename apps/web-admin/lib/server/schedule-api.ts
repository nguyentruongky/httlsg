import type { AuthUser } from "@org/core";
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
      try {
        result.notificationDelivery = await sendSchedulePushNow(result.id);
      } catch {
        result.notificationDelivery = {
          error: "Lịch đã lưu. Chưa xác nhận được kết quả thông báo.",
        };
      }
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
}
