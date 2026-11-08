"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, useAuth } from "@org/core";
import { Button, Card } from "@org/ui";
import { usePwa } from "./pwa";
const DISMISSED = "church-install-dismissed-v1";
function dismissed() {
  try {
    return localStorage.getItem(DISMISSED) === "yes";
  } catch {
    return false;
  }
}
export function PwaDeviceSettings() {
  const state = usePwa();
  return state ? <DeviceSettings /> : null;
}
function DeviceSettings() {
  const pwa = usePwa()!,
    auth = useAuth();
  const [hideInstall, setHideInstall] = useState(false),
    [sub, setSub] = useState<PushSubscription | null>(null),
    [fingerprint, setFingerprint] = useState<string>(),
    [permission, setPermission] = useState<NotificationPermission>("default"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const supported =
    typeof window !== "undefined" &&
    pwa.secure &&
    "PushManager" in window &&
    typeof Notification !== "undefined" &&
    Boolean(pwa.registration);
  useEffect(() => setHideInstall(dismissed()), []);
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
  const active = Boolean(sub && status.data?.active);
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
  async function disable() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (sub) {
        await apiRequest("/api/push/unsubscribe", {
          method: "POST",
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      await inspect();
      await status.refetch();
      setMessage("Đã tắt thông báo trên thiết bị.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể tắt thông báo.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!pwa.standalone && !hideInstall && (
        <Card className="mt-5 space-y-3 p-5 [&_.ui-button]:min-h-11">
          <h2 className="font-semibold">Cài ứng dụng Hội Thánh</h2>
          {pwa.ios ? (
            <>
              <p className="text-sm">
                Cài ứng dụng trên Màn hình chính để mở nhanh và nhận thông báo.
              </p>
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                <li>Mở trang web bằng Safari.</li>
                <li>Chạm nút Chia sẻ.</li>
                <li>Chọn Thêm vào Màn hình chính.</li>
                <li>Bật Mở dưới dạng ứng dụng web nếu có.</li>
                <li>Chạm Thêm.</li>
              </ol>
            </>
          ) : pwa.install ? (
            <Button
              type="button"
              onClick={() =>
                void pwa
                  .installApp()
                  .catch(() => setError("Không thể mở hướng dẫn cài ứng dụng."))
              }
            >
              Cài ứng dụng
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Mở menu trình duyệt và chọn Cài đặt ứng dụng hoặc Thêm vào Màn
              hình chính nếu có.
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setHideInstall(true);
              try {
                localStorage.setItem(DISMISSED, "yes");
              } catch {}
            }}
          >
            Ẩn hướng dẫn
          </Button>
        </Card>
      )}
      <Card className="mt-5 space-y-3 p-5 [&_.ui-button]:min-h-11">
        <h2 className="font-semibold">Thông báo trên thiết bị</h2>
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
                : active
                  ? "Đang nhận thông báo trên thiết bị này."
                  : permission === "granted"
                    ? "Đã cho phép thông báo. Thiết bị chưa được đăng ký hoặc đăng ký đã hết hạn."
                    : "Chưa bật thông báo trên thiết bị này."}
            </p>
            {status.data && !status.data.configured && (
              <p className="text-sm">Thông báo trên thiết bị chưa sẵn sàng.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {active ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void disable()}
                  >
                    Tắt thông báo
                  </Button>
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        const result = await apiRequest<{
                          sent: number;
                          failed: number;
                        }>("/api/push/test", { method: "POST" });
                        setMessage(
                          result.sent
                            ? "Đã gửi thông báo thử."
                            : "Chưa gửi được thông báo thử. Vui lòng thử lại sau.",
                        );
                      } catch (reason) {
                        setError(
                          reason instanceof Error
                            ? reason.message
                            : "Không thể gửi thông báo thử.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Gửi thông báo thử
                  </Button>
                </>
              ) : (
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
              )}
            </div>
          </>
        )}
        {(error || status.error) && (
          <p role="alert" className="break-words text-sm text-destructive">
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
