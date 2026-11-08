"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@org/ui";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type PwaState = {
  registration: ServiceWorkerRegistration | null;
  install: InstallEvent | null;
  standalone: boolean;
  ios: boolean;
  secure: boolean;
  error: string | null;
  installApp: () => Promise<void>;
};
const Context = createContext<PwaState | null>(null);
export const usePwa = () => useContext(Context);
export function PwaRoot({ children }: { children: ReactNode }) {
  const [registration, setRegistration] =
      useState<ServiceWorkerRegistration | null>(null),
    [install, setInstall] = useState<InstallEvent | null>(null),
    [standalone, setStandalone] = useState(false),
    [ios, setIos] = useState(false),
    [secure, setSecure] = useState(false),
    [error, setError] = useState<string | null>(null),
    [waiting, setWaiting] = useState<ServiceWorker | null>(null),
    [dismissUpdate, setDismissUpdate] = useState(false);
  const requestedUpdate = useRef(false);
  useEffect(() => {
    setSecure(window.isSecureContext === true);
    setStandalone(
      Boolean(
        window.matchMedia?.("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone,
      ),
    );
    setIos(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );
    const prompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const installed = () => {
      setInstall(null);
      setStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", installed);
    if (!window.isSecureContext || !("serviceWorker" in navigator))
      return () => {
        window.removeEventListener("beforeinstallprompt", prompt);
        window.removeEventListener("appinstalled", installed);
      };
    let live = true,
      reg: ServiceWorkerRegistration | undefined;
    const detect = () => {
      if (live && reg?.waiting && navigator.serviceWorker.controller) {
        setWaiting(reg.waiting);
        setDismissUpdate(false);
      }
    };
    const updateFound = () => {
      const worker = reg?.installing;
      if (worker)
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed") detect();
        });
    };
    const refresh = () => {
      if (document.visibilityState === "visible")
        void reg?.update().catch(() => {});
    };
    const changed = () => {
      if (requestedUpdate.current) window.location.reload();
    };
    const next =
      window.location.pathname === "/client" ||
      window.location.pathname.startsWith("/client/");
    void navigator.serviceWorker
      .register(next ? "/pwa/sw.js" : "/sw.js", {
        scope: next ? "/client" : "/",
        updateViaCache: "none",
      })
      .then((value) => {
        if (!live) return;
        reg = value;
        if (live && value.active) setRegistration(value);
        else
          void navigator.serviceWorker.ready.then((ready) => {
            if (live) setRegistration(ready);
          });
        detect();
        value.addEventListener("updatefound", updateFound);
      })
      .catch(() => {
        if (live)
          setError(
            "Không thể chuẩn bị thông báo trên thiết bị. Vui lòng tải lại ứng dụng.",
          );
      });
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    document.addEventListener("visibilitychange", refresh);
    const timer = setInterval(refresh, 60 * 60 * 1000);
    return () => {
      live = false;
      clearInterval(timer);
      reg?.removeEventListener("updatefound", updateFound);
      navigator.serviceWorker.removeEventListener("controllerchange", changed);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  return (
    <Context.Provider
      value={{
        registration,
        install,
        standalone,
        ios,
        secure,
        error,
        installApp: async () => {
          if (!install) return;
          await install.prompt();
          await install.userChoice;
          setInstall(null);
        },
      }}
    >
      {children}
      {waiting && !dismissUpdate && (
        <div
          role="status"
          className="fixed left-1/2 top-[max(.75rem,env(safe-area-inset-top))] z-[70] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 space-y-2 rounded-xl border bg-background p-4 shadow-xl"
        >
          <p className="font-medium">Có phiên bản ứng dụng mới</p>
          <p className="text-sm text-muted-foreground">
            Lưu thay đổi trước khi cập nhật.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              className="min-h-11"
              type="button"
              onClick={() => {
                requestedUpdate.current = true;
                waiting.postMessage({ type: "SKIP_WAITING" });
              }}
            >
              Cập nhật ứng dụng
            </Button>
            <Button
              className="min-h-11"
              type="button"
              variant="ghost"
              onClick={() => setDismissUpdate(true)}
            >
              Để sau
            </Button>
          </div>
        </div>
      )}
    </Context.Provider>
  );
}
