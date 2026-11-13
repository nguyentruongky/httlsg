"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
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
  supported: boolean;
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
  [supported, setSupported] = useState(false);
  useEffect(() => {
    setSecure(window.isSecureContext === true);
    const updateSupported = () => {
      setSupported(
        typeof window !== "undefined" &&
          secure &&
          "PushManager" in window &&
          typeof Notification !== "undefined" &&
          Boolean(registration),
      );
    };
    updateSupported();
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
    const refresh = () => {
      if (document.visibilityState === "visible")
        void reg?.update().catch(() => {});
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
        if (live && value.active) {
          setRegistration(value);
          updateSupported();
        } else
          void navigator.serviceWorker.ready.then((ready) => {
            if (live) {
              setRegistration(ready);
              updateSupported();
            }
          });
      })
      .catch(() => {
        if (live)
          setError(
            "Không thể chuẩn bị thông báo trên thiết bị. Vui lòng tải lại ứng dụng.",
          );
      });
    document.addEventListener("visibilitychange", refresh);
    const timer = setInterval(refresh, 60 * 60 * 1000);
    return () => {
      live = false;
      clearInterval(timer);
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
        supported,
        installApp: async () => {
          if (!install) return;
          await install.prompt();
          await install.userChoice;
          setInstall(null);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
