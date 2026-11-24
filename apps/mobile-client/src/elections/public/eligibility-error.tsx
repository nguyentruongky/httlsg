import { useId, useLayoutEffect, useRef } from "react";
import { Button } from "@org/ui";
import { ChevronLeft, Gauge, MapPin } from "lucide-react";
import type { PublicElectionSession, PublicConnectionReason } from "@org/core";
import type { z } from "zod";
type Reason = z.infer<typeof PublicConnectionReason>;
function SingleLineText({
  as: Tag,
  children,
  className,
  maxFontSize,
  role,
}: {
  as: "h2" | "p";
  children: string;
  className: string;
  maxFontSize: number;
  role?: "alert";
}) {
  const text = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = text.current,
      container = element?.parentElement;
    if (!element || !container) return;
    let active = true,
      previousWidth = -1;
    const fit = (force = false) => {
      if (!active) return;
      const available = container.clientWidth;
      if (!available || (!force && available === previousWidth)) return;
      previousWidth = available;
      element.style.fontSize = `${maxFontSize}px`;
      const naturalWidth = element.getBoundingClientRect().width;
      if (naturalWidth > available)
        element.style.fontSize = `${(maxFontSize * (available - 1)) / naturalWidth}px`;
    };
    fit();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => fit());
    observer?.observe(container);
    const resize = () => fit();
    window.addEventListener("resize", resize);
    void document.fonts?.ready.then(() => fit(true));
    return () => {
      active = false;
      observer?.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [children, maxFontSize]);
  return (
    <Tag role={role} className={`flex justify-center ${className}`}>
      <span
        ref={text}
        className="inline-block shrink-0 whitespace-nowrap"
        style={{ fontSize: maxFontSize }}
      >
        {children}
      </span>
    </Tag>
  );
}
const descriptions: Record<Reason, string> = {
  location_outside: "Vị trí hiện tại của bạn quá xa so với điểm bầu cử.",
  location_inaccurate:
    "Vị trí chưa đủ chính xác để xác nhận bạn đang ở trong khu vực bầu cử. Hãy đến gần địa điểm và thử lại.",
  location_denied:
    "Bạn chưa cho phép truy cập vị trí. Hãy bật quyền vị trí cho trang này rồi thử lại.",
  location_unsupported:
    "Thiết bị hoặc trình duyệt chưa hỗ trợ định vị. Hãy bật định vị và mở trang bằng kết nối HTTPS.",
  location_failed:
    "Không thể xác định vị trí hiện tại. Hãy bật định vị, kiểm tra tín hiệu và thử lại.",
  location_unverified:
    "Chưa xác nhận được vị trí của bạn tại điểm bầu cử. Hãy cho phép truy cập vị trí rồi thử lại.",
  cookies_blocked:
    "Trình duyệt đang chặn lưu phiên bỏ phiếu. Hãy cho phép cookie của trang này trước khi tham gia.",
  session_changed:
    "Thông tin cuộc bầu cử đã thay đổi. Vui lòng quay về và nhập lại mã OTP.",
  session_unavailable:
    "Cuộc bầu cử đã kết thúc hoặc đã ngừng nhận phiếu trực tuyến.",
  network:
    "Không thể kết nối với máy chủ bầu cử. Hãy kiểm tra kết nối Internet rồi thử lại.",
  timeout:
    "Máy chủ chưa phản hồi kịp thời. Hãy kiểm tra kết nối Internet rồi thử lại.",
  ack_mismatch:
    "Chưa xác nhận được kết nối đúng với cuộc bầu cử này. Vui lòng quay về và thử lại.",
  no_ack:
    "Chưa nhận đủ phản hồi từ máy chủ. Hãy kiểm tra kết nối Internet rồi thử lại.",
  aborted: "Quá trình xác nhận đã bị gián đoạn. Vui lòng quay về và thử lại.",
};
function EligibilityIllustration() {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 320 270"
      role="img"
      aria-label="Chưa đáp ứng điều kiện tham gia"
      className="mx-auto h-56 w-64 sm:h-64 sm:w-80"
    >
      <defs>
        <radialGradient id={`${id}-halo`}>
          <stop stopColor="#fecdd3" stopOpacity=".48" />
          <stop offset="1" stopColor="#fff1f2" stopOpacity=".08" />
        </radialGradient>
        <linearGradient id={`${id}-pin`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fb7185" />
          <stop offset="1" stopColor="#f43f5e" />
        </linearGradient>
      </defs>
      <circle cx="160" cy="135" r="130" fill={`url(#${id}-halo)`} />
      <circle cx="160" cy="135" r="102" fill="#fff1f2" opacity=".5" />
      <ellipse cx="160" cy="231" rx="104" ry="27" fill="#fecdd3" opacity=".6" />
      <ellipse cx="160" cy="231" rx="42" ry="10" fill="#fda4af" opacity=".25" />
      <path
        d="M160 68c-34 0-61 27-61 61 0 43 61 93 61 93s61-50 61-93c0-34-27-61-61-61Z"
        fill={`url(#${id}-pin)`}
      />
      <path
        d="m143 111 34 34m0-34-34 34"
        stroke="white"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="m245 63 10-15m0 29 18-9"
        stroke="#fb7185"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function ElectionEligibilityError({
  session,
  reason,
  distanceMeters,
  accuracyMeters,
  radiusMeters,
  maximumAccuracyMeters,
  onBack,
}: {
  session: PublicElectionSession;
  reason: Reason | null;
  distanceMeters?: number | null;
  accuracyMeters?: number | null;
  radiusMeters?: number;
  maximumAccuracyMeters?: number;
  onBack: () => void;
}) {
  const locationError = Boolean(reason?.startsWith("location_"));
  const networkError =
    reason &&
    ["network", "timeout", "ack_mismatch", "no_ack", "aborted"].includes(
      reason,
    );
  return (
    <section className="flex min-h-[calc(100dvh-4rem)] flex-col bg-white text-[#111525]">
      <header className="flex w-full items-center justify-center">
        <h1 className="w-full text-center text-lg font-semibold leading-snug sm:text-2xl">
          {session.title}
        </h1>
      </header>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center py-6 sm:py-10">
        <EligibilityIllustration />
        <SingleLineText
          as="h2"
          maxFontSize={30}
          className="mt-5 w-full min-w-0 text-center font-bold leading-snug"
        >
          {networkError
            ? "Không thể kết nối cuộc bầu cử"
            : "Bạn không đủ điều kiện tham gia bầu cử"}
        </SingleLineText>
        <SingleLineText
          as="p"
          maxFontSize={20}
          role="alert"
          className="mt-5 w-full min-w-0 text-center leading-relaxed text-[#5e6174]"
        >
          {reason
            ? descriptions[reason]
            : "Chưa xác nhận được điều kiện tham gia. Vui lòng quay về và thử lại."}
        </SingleLineText>
        {locationError &&
          (distanceMeters != null || accuracyMeters != null) && (
            <dl className="mt-7 w-full space-y-4 rounded-2xl bg-[#fff3f5] px-5 py-5 sm:px-7">
              {distanceMeters != null && (
                <>
                  <div className="flex items-center gap-4">
                    <MapPin size={30} className="shrink-0 text-[#dc2626]" />
                    <div className="border-l border-rose-200 pl-4">
                      <dt className="text-sm text-[#686b7a] sm:text-base">
                        Khoảng cách hiện tại
                      </dt>
                      <dd className="text-2xl font-bold text-[#dc2626]">
                        {Math.ceil(distanceMeters)} m
                      </dd>
                    </div>
                  </div>
                  <div className="h-px bg-rose-100" />
                  <div className="flex items-center gap-4">
                    <Gauge size={30} className="shrink-0 text-[#747785]" />
                    <div className="border-l border-stone-200 pl-4">
                      <dt className="text-sm text-[#686b7a] sm:text-base">
                        Giới hạn cho phép
                      </dt>
                      <dd className="text-2xl font-semibold">
                        {radiusMeters ?? session.radiusMeters} m
                      </dd>
                    </div>
                  </div>
                </>
              )}
              {reason === "location_inaccurate" && accuracyMeters != null && (
                <div className="border-t border-rose-100 pt-4 text-sm leading-relaxed text-[#5e6174]">
                  Sai số vị trí hiện tại: {Math.ceil(accuracyMeters)} m. Sai số
                  tối đa:{" "}
                  {maximumAccuracyMeters ?? session.maximumAccuracyMeters} m. Vị
                  trí cần nằm trong khu vực cho phép kể cả sai số định vị.
                </div>
              )}
            </dl>
          )}
      </div>
      <Button
        type="button"
        onClick={onBack}
        className="mb-3 min-h-14 w-full rounded-2xl bg-[#eeeef3] text-lg font-semibold text-[#111525] shadow-none hover:bg-[#e3e3eb]"
      >
        Quay về
      </Button>
    </section>
  );
}
