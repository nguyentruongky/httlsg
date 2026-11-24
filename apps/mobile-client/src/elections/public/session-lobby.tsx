import type { PublicElectionSession } from "@org/core";
import { Button } from "@org/ui";
import { CheckCircle2, Clock3 } from "lucide-react";
export function PublicSessionLobby({
  session,
  onLeave,
}: {
  session: PublicElectionSession;
  onLeave: () => void;
}) {
  const submitted = Boolean(session.receipt);
  const waiting = session.status === "waiting" && !submitted;
  const title = submitted
    ? "Phiếu đã được ghi nhận"
    : waiting
      ? "Đang chờ bắt đầu"
      : session.status === "cancelled"
        ? "Phiên bầu cử đã ngừng hoạt động"
        : "Cuộc bầu cử đã kết thúc";
  return (
    <section
      role="status"
      aria-live="polite"
      className="mx-auto max-w-lg rounded-2xl border border-[#e6e4dd] bg-white px-6 py-10 text-center"
    >
      {submitted ? (
        <CheckCircle2 size={42} className="mx-auto text-[#215e3d]" />
      ) : (
        <Clock3 size={42} className="mx-auto text-[#215e3d]" />
      )}
      <h2 className="mt-5 text-xl font-bold">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-[#777368]">
        {submitted
          ? "Mỗi lượt tham gia chỉ gửi một phiếu."
          : waiting
            ? "Vui lòng chờ. Phiên bầu cử chưa bắt đầu. Danh sách ứng viên sẽ tự xuất hiện khi quản trị viên mở bầu cử."
            : "Phiên này không còn nhận phiếu. Lựa chọn chưa gửi sẽ không được tính vào kết quả."}
      </p>
      {waiting && (
        <>
          <p className="mt-3 text-xs text-[#8a877d]">
            Tự cập nhật trạng thái mỗi 5 giây.
          </p>
        </>
      )}
    </section>
  );
}
