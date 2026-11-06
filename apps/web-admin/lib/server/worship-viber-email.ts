import { escapeEventHtml } from "./calendar-delivery";
import { HttpError } from "./http";
export function worshipDraftOrigin() {
  try {
    const origin = new URL(process.env.APP_ORIGIN ?? "");
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash ||
      (process.env.NODE_ENV === "production" && origin.protocol !== "https:")
    )
      throw new Error("Invalid origin");
    return origin.origin;
  } catch {
    throw new HttpError(
      503,
      "Cần cấu hình APP_ORIGIN hợp lệ để mở bản nháp trên điện thoại.",
    );
  }
}
/** This URL contains only an audit-record ID. Reading the message requires Admin authentication. */
export function worshipDraftPageUrl(requestId: string) {
  return `${worshipDraftOrigin()}/worship-viber/${encodeURIComponent(requestId)}`;
}
export function worshipViberEmail(message: string, requestId: string) {
  const pageUrl = worshipDraftPageUrl(requestId);
  const help =
    "Mở email trên điện thoại và chọn Mở bản nháp Viber (cần tài khoản Admin), chọn Mở Viber để gửi yêu cầu để mở cuộc trò chuyện với đầy đủ bản nháp. Nếu cần, dùng Sao chép nội dung để dán thủ công. Nếu Gmail không mở Viber, hãy mở trang bản nháp bằng Safari hoặc sao chép nội dung bên dưới để dán vào cuộc trò chuyện. Bạn dán nội dung, kiểm tra và tự gửi tin nhắn.";
  return {
    subject: "Bản nháp Viber — Chương trình thờ phượng",
    text: `${help}\n\nMở bản nháp Viber:\n${pageUrl}\n\nNội dung để sao chép:\n${message}`,
    html: `<p>${escapeEventHtml(help)}</p><p><a href="${escapeEventHtml(pageUrl)}">Mở bản nháp Viber</a></p><p>Nếu ứng dụng email không mở được liên kết Viber, hãy dùng liên kết ứng dụng phía trên. Nội dung bên dưới được giữ đầy đủ để sao chép:</p><div style="white-space:pre-wrap">${escapeEventHtml(message)}</div>`,
  };
}
