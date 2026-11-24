import type { PublicElectionSession } from "@org/core";
import { Button } from "@org/ui";
import { CheckCircle2, Clock3 } from "lucide-react";
export function PublicSessionLobby({
  session,
  onLeave,
  onRefresh,
}: {
  session: PublicElectionSession;
  onLeave: () => void;
  onRefresh: () => void;
}) {
  const submitted = Boolean(session.receipt);
  const waiting = session.status === "waiting" && !submitted;
  const title = submitted
    ? "Phiếu đã được ghi nhận"
    : waiting
      ? "Đang chờ bắt đầu"
      : session.status === "checking"
        ? "Đang kiểm phiếu thủ công"
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
            ? "Vui lòng chờ. Phiên bầu cử chưa bắt đầu. Chọn Làm mới trạng thái sau khi quản trị viên mở bầu cử."
            : session.status === "checking"
              ? "Đã đóng cổng nhận phiếu trực tuyến. Ban kiểm phiếu đang đối chiếu và nhập phiếu giấy."
              : "Phiên này không còn nhận phiếu. Lựa chọn chưa gửi sẽ không được tính vào kết quả."}
      </p>
      {(waiting || session.status === "checking") && (
        <>
          <Button className="mt-4" variant="outline" onClick={onRefresh}>
            Làm mới trạng thái
          </Button>
        </>
      )}
    </section>
  );
}
