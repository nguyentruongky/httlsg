"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@org/core";
import { Button } from "@org/ui";
import { LoaderCircle, RefreshCw, ShieldCheck, WifiOff } from "lucide-react";
import { AuthFrame } from "./auth-frame";

export function SessionRecovery() {
  const auth = useAuth();
  const refresh = auth?.refresh;
  const inFlight = useRef(false);
  const [retrying, setRetrying] = useState(false);
  const [status, setStatus] = useState(
    "Ứng dụng sẽ tự thử lại khi thiết bị có mạng trở lại.",
  );
  const retry = useCallback(async () => {
    if (!refresh || inFlight.current) return;
    inFlight.current = true;
    setRetrying(true);
    setStatus("Đang kết nối và xác minh phiên đăng nhập…");
    try {
      await refresh();
    } catch {
      setStatus(
        navigator.onLine
          ? "Vẫn chưa thể khôi phục phiên. Hãy kiểm tra Internet hoặc thử lại sau ít phút."
          : "Thiết bị đang ngoại tuyến. Hãy bật Wi-Fi hoặc dữ liệu di động rồi thử lại.",
      );
    } finally {
      inFlight.current = false;
      setRetrying(false);
    }
  }, [refresh]);
  useEffect(() => {
    const online = () => { void retry(); };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [retry]);

  return (
    <AuthFrame
      title="Chưa thể khôi phục phiên đăng nhập"
      description="Ứng dụng cần kết nối với Hội Thánh để xác minh phiên đăng nhập trước khi mở thông tin của bạn."
    >
      <div className="mx-auto mt-6 flex size-18 items-center justify-center rounded-3xl border border-primary/15 bg-primary/8 text-primary">
        <WifiOff size={32} strokeWidth={1.6} aria-hidden="true" />
      </div>
      <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground">
        Internet có thể đã bị gián đoạn hoặc máy chủ đang tạm thời không phản hồi.
      </p>
      <section className="mt-6 rounded-2xl border border-border/60 bg-muted/50 p-5" aria-labelledby="session-recovery-help">
        <h2 id="session-recovery-help" className="text-sm font-semibold">Bạn có thể thử</h2>
        <ol className="mt-3 list-decimal space-y-3 pl-4 text-sm leading-relaxed text-muted-foreground marker:font-medium marker:text-primary">
          <li className="pl-1">Kiểm tra Wi-Fi hoặc dữ liệu di động. Nếu mạng yếu, hãy chuyển sang một mạng khác.</li>
          <li className="pl-1">Nhấn thử lại để tiếp tục phiên đăng nhập. Nếu vẫn chưa được, hãy chờ một lát rồi thử lại sau.</li>
        </ol>
      </section>
      <div className="mt-5 flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
        <p>Lỗi kết nối này chưa có nghĩa là bạn đã bị đăng xuất. Ứng dụng sẽ kiểm tra lại phiên khi kết nối được khôi phục.</p>
      </div>
      <Button
        type="button"
        size="touch"
        className="mt-6 w-full rounded-xl text-[15px] font-semibold"
        disabled={retrying}
        onClick={() => { void retry(); }}
      >
        {retrying
          ? <LoaderCircle size={18} className="motion-safe:animate-spin" aria-hidden="true" />
          : <RefreshCw size={18} aria-hidden="true" />}
        {retrying ? "Đang khôi phục phiên…" : "Thử kết nối lại"}
      </Button>
      <p role="status" aria-live="polite" className="mt-3 min-h-10 text-center text-xs leading-relaxed text-muted-foreground">
        {status}
      </p>
    </AuthFrame>
  );
}
