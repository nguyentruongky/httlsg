"use client";
import { useRef, useState } from "react";
import { useAuth } from "@org/core";
import { Button } from "@org/ui";
import { LoaderCircle, RefreshCw, WifiOff } from "lucide-react";

export function ConnectionIssue() {
  const auth = useAuth();
  const inFlight = useRef(false);
  const [retrying, setRetrying] = useState(false);
  const [attempted, setAttempted] = useState(false);

  return (
    <section
      className="mx-auto flex w-full max-w-sm flex-col items-center px-5 py-10 text-center"
      aria-labelledby="connection-issue-title"
    >
      <div
        className="relative mb-6 flex size-24 items-center justify-center rounded-full bg-primary/5"
        aria-hidden="true"
      >
        <div className="flex size-18 items-center justify-center rounded-3xl border border-primary/15 bg-background text-primary shadow-sm">
          <WifiOff size={32} strokeWidth={1.6} />
        </div>
        <span className="absolute right-1 bottom-2 flex size-7 items-center justify-center rounded-full border-4 border-background bg-amber-100 text-xs font-bold text-amber-800">
          !
        </span>
      </div>
      <h2
        id="connection-issue-title"
        className="text-xl font-semibold tracking-tight"
      >
        Kết nối đang gián đoạn
      </h2>
      <p className="mt-3 max-w-72 text-sm leading-relaxed text-muted-foreground">
        Chưa thể tải danh sách lúc này. Hãy kiểm tra Wi-Fi hoặc dữ liệu di động
        rồi thử lại nhé.
      </p>
      <Button
        type="button"
        size="touch"
        disabled={retrying || !auth}
        className="mt-6 rounded-xl px-6"
        onClick={async () => {
          if (!auth || inFlight.current) return;
          inFlight.current = true;
          setRetrying(true);
          try {
            await auth.refresh();
          } catch {
            // Keep the connection view available for another attempt.
          } finally {
            inFlight.current = false;
            setRetrying(false);
            setAttempted(true);
          }
        }}
      >
        {retrying ? (
          <LoaderCircle
            size={17}
            className="motion-safe:animate-spin"
            aria-hidden="true"
          />
        ) : (
          <RefreshCw size={17} aria-hidden="true" />
        )}
        {retrying ? "Đang kết nối…" : "Thử kết nối lại"}
      </Button>
      <p
        role="status"
        aria-live="polite"
        className="mt-3 min-h-10 max-w-72 text-xs leading-relaxed text-muted-foreground"
      >
        {retrying
          ? "Đang kiểm tra kết nối…"
          : attempted
            ? "Vẫn chưa kết nối được. Bạn có thể thử lại sau một lát."
            : "Ứng dụng sẽ tự thử lại khi có mạng trở lại."}
      </p>
    </section>
  );
}
