import type { CalendarSaveResult, CalendarSendSummary } from "@org/core";
import { sendCalendarNotificationNow } from "./calendar-delivery";
import { sendWorshipInformationRequest } from "./worship-information";
async function dispatch<T>(
  result: T,
  notificationId: string | null | undefined,
) {
  if (!notificationId) return result;
  let delivery: CalendarSendSummary;
  try {
    delivery = await sendCalendarNotificationNow(notificationId);
  } catch {
    // The event/batch is already committed. A failure must not masquerade as a
    // failed save or invite another non-idempotent edit. History remains durable.
    delivery = {
      error:
        "Chương trình đã lưu; chưa xác nhận được toàn bộ kết quả email. Mở chuông thông báo để kiểm tra.",
    };
  }
  return { ...result, delivery };
}
export async function sendSavedCalendarEvent(result: CalendarSaveResult) {
  // Independent attempts: failure of one channel never prevents the other.
  const [group] = await Promise.allSettled([
    dispatch(result, result.notificationId),
    result.worshipNotificationId
      ? sendWorshipInformationRequest({ id: result.worshipNotificationId })
      : Promise.resolve(null),
  ]);
  return group.status === "fulfilled"
    ? group.value
    : {
        ...result,
        delivery: {
          error: "Chương trình đã lưu; chưa xác nhận được kết quả email.",
        },
      };
}
export const sendCalendarBatch = <T extends { id: string }>(result: T) =>
  dispatch(result, result.id);
export const sendCalendarRetry = <T extends { notificationId: string }>(
  result: T,
) => dispatch(result, result.notificationId);
