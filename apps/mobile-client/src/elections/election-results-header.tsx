import type { ReactNode } from "react";
import { cn } from "@org/ui";
export function ElectionResultsHeader({
  title,
  status,
  children,
}: {
  title: string;
  status: string;
  children?: ReactNode;
}) {
  const isNotStarted = status === "draft";
  const isOpen = status === "open";
  const labelStatus = (value: string) =>
    value === "draft"
      ? "Chưa bắt đầu"
      : value === "open"
        ? "Đang diễn ra"
        : value === "closed"
          ? "Đã kết thúc"
          : value;
  return (
    <header
      className={cn(
        "rounded-2xl border-2 border-[#cfd2c9] bg-white shadow-none",
        "flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between",
      )}
    >
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={cn(
              "inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold",
              isNotStarted
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : isOpen
                  ? "border-emerald-200 bg-[#edf6f0] text-[#216e4a]"
                  : "border-[#e4e5de] bg-[#f3f3ee] text-[#60635b]",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-2 shrink-0 rounded-full",
                isNotStarted
                  ? "bg-amber-500"
                  : isOpen
                    ? "animate-pulse bg-[#216e4a]"
                    : "bg-[#8a8e84]",
              )}
            />
            {labelStatus(status)}
          </span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-[#1e211c] sm:text-3xl">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-[#60635b] sm:text-base">
            {isNotStarted ? (
              <>
                Cuộc bầu cử hiện đang ở trạng thái chờ. {<br />} Nhấn{" "}
                <strong className="font-semibold text-[#1e211c]">
                  Bắt đầu
                </strong>{" "}
                để mở cổng tiếp nhận phiếu và cập nhật kết quả.
              </>
            ) : isOpen ? (
              "Cuộc bầu cử đang mở. Kết quả tự động cập nhật mỗi 5 giây khi kiểm phiếu viên gửi phiếu."
            ) : (
              "Cuộc bầu cử đã kết thúc. Kết quả dưới đây chỉ tính các phiếu hợp lệ."
            )}
          </p>
        </div>
      </div>
      {children}
    </header>
  );
}
