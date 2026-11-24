import { after } from "next/server";
import {
  authenticatedJsonApi,
  type AuthenticatedOperation,
} from "./api/authenticated-json";
import { HttpError } from "./http";
import { sendSchedulePushNow } from "./schedule-notifications";

function scheduleError(error: unknown) {
  return (error as { code?: string })?.code === "23505"
    ? new HttpError(
        409,
        "Lịch hoặc phân công đã tồn tại. Vui lòng tải lại và kiểm tra nội dung trùng.",
      )
    : error;
}

async function deferScheduleNotification(result: unknown) {
  if (
    !result ||
    typeof result !== "object" ||
    !("id" in result) ||
    typeof result.id !== "string" ||
    !result.id ||
    !("status" in result) ||
    (result.status !== "published" && result.status !== "cancelled")
  )
    return result;

  const scheduleId = result.id;
  // Durable jobs have committed; delivery must not delay the save response.
  after(async () => {
    try {
      await sendSchedulePushNow(scheduleId);
    } catch {
      console.warn("Schedule push delivery deferred to retry");
    }
  });
  return { ...result, notificationDelivery: { queued: true } };
}

/** Schedule policy adapter: larger drafts, domain conflict messages and deferred push. */
export function scheduleApi<T>(
  request: Request,
  fn: AuthenticatedOperation<T>,
  write = false,
  dispatch = false,
) {
  return authenticatedJsonApi(request, fn, {
    mode: write ? "command" : "query",
    maxBodyBytes: 1100000,
    afterCommit: dispatch ? deferScheduleNotification : undefined,
    mapError: scheduleError,
  });
}
