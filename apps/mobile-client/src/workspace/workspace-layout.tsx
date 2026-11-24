import type { CSSProperties, ReactNode } from "react";
import { useAuth } from "@org/core";
import { PwaDeviceSettings } from "../pwa-settings";
import { OfflineBanner } from "../offline-banner";
import { cn } from "@org/ui";

export function WorkspaceLayout({
  directory,
  fixedLayout,
  whiteBackground = false,
  scrutineer = false,
  children,
  navigation,
}: {
  directory: boolean;
  fixedLayout: boolean;
  whiteBackground?: boolean;
  scrutineer?: boolean;
  children: ReactNode;
  navigation: ReactNode;
}) {
  const auth = useAuth();
  return (
    <div
      style={
        {
          "--offline-banner-height": auth?.offline
            ? "calc(4.5rem + env(safe-area-inset-top))"
            : "0px",
        } as CSSProperties
      }
      data-directory-active={fixedLayout}
      className={cn(
        "mobile-client",
        scrutineer
          ? "bg-[#f8f7f3]"
          : whiteBackground
            ? "bg-white"
            : "bg-muted/50",
        fixedLayout ? "h-dvh overflow-hidden" : "min-h-dvh",
      )}
    >
      <div
        className={cn(
          "relative mx-auto overflow-x-clip",
          scrutineer ? "bg-[#f8f7f3]" : "max-w-7xl border-x",
          scrutineer ? "" : whiteBackground ? "bg-white" : "bg-background",
          fixedLayout ? "h-dvh overflow-hidden" : "min-h-dvh",
        )}
      >
        <OfflineBanner />
        <PwaDeviceSettings />
        <main
          id="mobile-content"
          data-scroll-restoration="mobile-content"
          className={
            scrutineer
              ? "max-lg:h-[calc(100dvh-var(--offline-banner-height))] max-lg:overflow-y-auto max-lg:overscroll-contain"
              : directory
                ? "h-[calc(100dvh-var(--mobile-tabbar-height)-var(--offline-banner-height))] overflow-hidden"
                : fixedLayout
                  ? "h-[calc(100dvh-var(--mobile-tabbar-height)-var(--offline-banner-height))] overflow-hidden px-5 pt-[max(1rem,env(safe-area-inset-top))]"
                  : "px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[var(--navigation-bottom-padding)] max-lg:h-[calc(100dvh-var(--offline-banner-height))] max-lg:overflow-y-auto max-lg:overscroll-contain"
          }
        >
          {children}
        </main>
        {navigation}
      </div>
    </div>
  );
}
