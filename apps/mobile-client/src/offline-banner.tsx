import { useState } from "react";
import { useAuth } from "@org/core";
import { RefreshCw, WifiOff } from "lucide-react";

export function OfflineBanner() {
  const auth = useAuth();
  const [retrying, setRetrying] = useState(false);
  const [attempted, setAttempted] = useState(false);
  if (!auth?.offline) return null;
  return (
    <div
      role="status"
      className="flex h-[var(--offline-banner-height)] items-center gap-3 border-b border-primary/15 bg-accent px-4 pt-[env(safe-area-inset-top)] text-accent-foreground"
    >
      <WifiOff size={19} className="shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-xs leading-relaxed">
        <p className="font-semibold">Đang xem dữ liệu đã lưu · Chỉ xem</p>
        <p>
          {attempted
            ? "Chưa kết nối được. Sẽ tự thử lại khi có mạng."
            : "Cần Internet để tải thêm và lưu thay đổi."}
        </p>
      </div>
      <button
        type="button"
        disabled={retrying}
        aria-label={retrying ? "Đang kết nối lại" : "Thử kết nối lại"}
        className="flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
        onClick={async () => {
          setRetrying(true);
          try {
            await auth.refresh();
          } catch {
            /* Keep the saved data visible. */
          } finally {
            setRetrying(false);
            setAttempted(true);
          }
        }}
      >
        <RefreshCw
          size={18}
          className={retrying ? "motion-safe:animate-spin" : ""}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
