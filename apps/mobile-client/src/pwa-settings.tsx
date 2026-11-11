"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Smartphone } from "lucide-react";
import { apiRequest, useAuth } from "@org/core";
import { Button, Card } from "@org/ui";
import { usePwa } from "./pwa";
const DISMISSED = "church-install-dismissed-until-v2";
const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
function dismissedUntil() {
  try {
    return Number(localStorage.getItem(DISMISSED)) || 0;
  } catch {
    return 0;
  }
}

function notificationDismissedUntil(key: string) {
  try {
    const until = Number(localStorage.getItem(key));
    return Number.isFinite(until) ? until : 0;
  } catch {
    return 0;
  }
}
function useNotificationDismissal(key: string) {
  const [hideUntil, setHideUntil] = useState(() =>
    notificationDismissedUntil(key),
  );
  useEffect(() => {
    const refresh = () => setHideUntil(notificationDismissedUntil(key));
    const timer =
      hideUntil > Date.now()
        ? window.setTimeout(
            () => setHideUntil(0),
            Math.min(hideUntil - Date.now(), THREE_DAYS),
          )
        : undefined;
    window.addEventListener("storage", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [key, hideUntil]);
  return {
    hidden: hideUntil > Date.now(),
    dismiss: () => {
      const until = Date.now() + THREE_DAYS;
      setHideUntil(until);
      try {
        localStorage.setItem(key, String(until));
      } catch {}
    },
  };
}
export function PwaInstallSettings() {
  const pwa = usePwa();
  const [hideUntil, setHideUntil] = useState(dismissedUntil);
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => setHideUntil(dismissedUntil());
    const timer =
      hideUntil > Date.now()
        ? window.setTimeout(() => setHideUntil(0), hideUntil - Date.now())
        : undefined;
    window.addEventListener("storage", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [hideUntil]);
  if (!pwa || pwa.standalone || hideUntil > Date.now()) return null;
  return (
    <Card className="mb-5 flex items-start gap-3 border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Smartphone size={21} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="space-y-1">
          <h2 className="font-semibold leading-snug">Cài đặt ứng dụng</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Truy cập nhanh hơn từ màn hình chính, không cần qua trình duyệt.
          </p>
        </div>
        {pwa.ios ? (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Mở trang web bằng Safari.</li>
            <li>Chạm nút Chia sẻ.</li>
            <li>Chọn Thêm vào Màn hình chính.</li>
            <li>Bật Mở dưới dạng ứng dụng web nếu có.</li>
            <li>Chạm Thêm.</li>
          </ol>
        ) : !pwa.install ? (
          <p className="text-sm text-muted-foreground">
            Mở menu trình duyệt và chọn Cài đặt ứng dụng hoặc Thêm vào Màn hình
            chính nếu có.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {!pwa.ios && pwa.install && (
            <Button
              type="button"
              className="min-h-11"
              onClick={() =>
                void pwa
                  .installApp()
                  .catch(() => setError("Không thể mở hướng dẫn cài ứng dụng."))
              }
            >
              Cài đặt ngay
            </Button>
          )}
          <button
            type="button"
            className="min-h-11 cursor-pointer rounded-md bg-transparent py-2 text-[13px] font-medium text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Để sau, ẩn hướng dẫn trong 3 ngày"
            onClick={() => {
              const until = Date.now() + THREE_DAYS;
              setHideUntil(until);
              try {
                localStorage.setItem(DISMISSED, String(until));
              } catch {}
            }}
          >
            Để sau
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </Card>
  );
}
export function PwaDeviceSettings() {
  const state = usePwa();
  return state ? <DeviceSettings /> : null;
}
function DeviceSettings() {
  const pwa = usePwa()!,
    auth = useAuth();
  const [sub, setSub] = useState<PushSubscription | null>(null),
    [fingerprint, setFingerprint] = useState<string>(),
    [permission, setPermission] = useState<NotificationPermission>(() =>
      typeof Notification === "undefined" ? "default" : Notification.permission,
    ),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const { hidden, dismiss } = useNotificationDismissal(
    "church-push-dismissed-until-v1",
  );
  const supported =
    typeof window !== "undefined" &&
    pwa.secure &&
    "PushManager" in window &&
    typeof Notification !== "undefined" &&
    Boolean(pwa.registration);
  async function inspect() {
    if (typeof Notification !== "undefined")
      setPermission(Notification.permission);
    try {
      const value =
        (await pwa.registration?.pushManager.getSubscription()) ?? null;
      setSub(value);
      if (value && crypto.subtle) {
        const bytes = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(value.endpoint),
        );
        setFingerprint(
          Array.from(new Uint8Array(bytes))
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join(""),
        );
      } else setFingerprint(undefined);
    } catch {
      setSub(null);
      setFingerprint(undefined);
    }
  }
  useEffect(() => {
    void inspect();
    const visible = () => {
      if (document.visibilityState === "visible") void inspect();
    };
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, [pwa.registration, auth?.user?.id]);
  const status = useQuery({
    queryKey: ["push-status", auth?.user?.id, fingerprint],
    queryFn: () =>
      apiRequest<{
        configured: boolean;
        publicKey: string | null;
        active: boolean;
        activeCount: number;
      }>(
        "/api/push/status" + (fingerprint ? "?fingerprint=" + fingerprint : ""),
      ),
    enabled: Boolean(auth?.user) && pwa.secure,
  });
  const mustInstall = pwa.ios && !pwa.standalone;
  async function enable() {
    setError("");
    setMessage("");
    if (!supported || !pwa.registration || !status.data?.publicKey) return;
    // This must be the first awaited operation after the explicit tap, especially on iOS.
    const decision = Notification.requestPermission();
    setBusy(true);
    let created: PushSubscription | null = null;
    try {
      const result = await decision;
      setPermission(result);
      if (result !== "granted") {
        setMessage(
          "Cho phép thông báo trong cài đặt trình duyệt hoặc thiết bị để tiếp tục.",
        );
        return;
      }
      const key = Uint8Array.from(
        atob(status.data.publicKey.replace(/-/g, "+").replace(/_/g, "/")),
        (char) => char.charCodeAt(0),
      );
      let value = await pwa.registration.pushManager.getSubscription();
      if (value && value.options.applicationServerKey) {
        const existing = new Uint8Array(value.options.applicationServerKey);
        if (
          existing.length !== key.length ||
          existing.some((byte, index) => byte !== key[index])
        ) {
          await value.unsubscribe();
          value = null;
        }
      }
      if (!value) {
        value = await pwa.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
        created = value;
      }
      await apiRequest("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({
          ...value.toJSON(),
          expirationTime: undefined,
          deviceLabel: pwa.ios ? "iPhone/iPad" : "Thiết bị này",
        }),
      });
      await inspect();
      await status.refetch();
      setMessage("Đã bật thông báo trên thiết bị.");
    } catch (reason) {
      if (created) await created.unsubscribe().catch(() => {});
      else if ((reason as { status?: number })?.status === 409)
        await sub?.unsubscribe().catch(() => {});
      setError(
        reason instanceof Error ? reason.message : "Không thể bật thông báo.",
      );
      await inspect();
    } finally {
      setBusy(false);
    }
  }
  if (hidden || permission === "granted") return null;
  return (
    <>
      <Card className="space-y-3 p-5 [&_.ui-button]:min-h-11">
        <p className="text-sm text-muted-foreground">
          Bật thông báo để nhận tin mới từ Hội Thánh ngay cả khi bạn không mở
          ứng dụng.
        </p>
        {!pwa.secure ? (
          <p className="text-sm">
            Mở ứng dụng qua HTTPS để bật thông báo. Địa chỉ IP nội bộ dùng HTTP
            không hỗ trợ tính năng này.
          </p>
        ) : mustInstall ? (
          <p className="text-sm">
            Thêm ứng dụng vào Màn hình chính, rồi mở từ biểu tượng để bật thông
            báo trên iPhone/iPad.
          </p>
        ) : pwa.error ? (
          <p role="alert" className="text-sm">
            {pwa.error}
          </p>
        ) : !supported ? (
          <p className="text-sm">
            Trình duyệt hoặc thiết bị này chưa hỗ trợ thông báo, hoặc ứng dụng
            đang được chuẩn bị.
          </p>
        ) : (
          <>
            <p role="status" className="text-sm">
              {permission === "denied"
                ? "Thông báo đã bị chặn. Mở cài đặt trình duyệt hoặc thiết bị để cho phép thông báo."
                : ""}
            </p>
            {status.data && !status.data.configured && (
              <p className="text-sm">Thông báo trên thiết bị chưa sẵn sàng.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={
                  busy ||
                  permission === "denied" ||
                  !status.data?.configured ||
                  !status.data.publicKey
                }
                onClick={() => void enable()}
              >
                Bật thông báo
              </Button>

              <button
                type="button"
                className="min-h-11 cursor-pointer rounded-md bg-transparent py-2 text-[13px] font-medium text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ml-6"
                aria-label="Để sau, ẩn hướng dẫn thông báo trong 3 ngày"
                onClick={dismiss}
              >
                Để sau
              </button>
            </div>
          </>
        )}

        {(error || status.error) && (
          <p role="alert" className="wrap-break-word text-sm text-destructive">
            {error ||
              (status.error instanceof Error
                ? status.error.message
                : "Không thể tải trạng thái thông báo.")}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
      </Card>
    </>
  );
}
