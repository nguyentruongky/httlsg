export function pushRegistrationError(error: unknown, ios: boolean) {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "";
  if (name === "AbortError" || /push service error/i.test(message)) {
    const brave = typeof navigator !== "undefined" && "brave" in navigator;
    return brave
      ? "Brave chưa kết nối được dịch vụ thông báo. Mở brave://settings/privacy, bật “Use Google services for push messaging”, khởi động lại Brave rồi nhấn Bật thông báo."
      : "Chưa kết nối được dịch vụ thông báo của thiết bị. Kiểm tra Internet, thử mạng khác nếu VPN hoặc mạng hiện tại chặn dịch vụ, rồi nhấn Bật thông báo để thử lại.";
  }
  if (name === "NotAllowedError")
    return ios
      ? "Mở ứng dụng từ biểu tượng trên Màn hình chính, nhấn Bật thông báo và chọn Cho phép. Nếu đã bị chặn, bật Cho phép thông báo cho ứng dụng trong Cài đặt → Thông báo."
      : "Thông báo đang bị chặn. Cho phép thông báo cho trang này trong cài đặt trình duyệt và cho trình duyệt trong cài đặt thông báo của thiết bị, rồi thử lại.";
  if (name === "InvalidStateError")
    return "Đăng ký thông báo cũ chưa sẵn sàng. Tải lại ứng dụng rồi nhấn Bật thông báo để đăng ký lại.";
  return message || "Không thể bật thông báo. Vui lòng thử lại.";
}
