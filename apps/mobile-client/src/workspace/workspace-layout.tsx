import type { ReactNode } from "react";
import { cn } from "@org/ui";

export function WorkspaceLayout({
  directory,
  fixedLayout,
  children,
  navigation,
}: {
  directory: boolean;
  fixedLayout: boolean;
  children: ReactNode;
  navigation: ReactNode;
}) {
  return (
    <div
      data-directory-active={fixedLayout}
      className={cn(
        "mobile-client bg-muted/50",
        fixedLayout ? "h-dvh overflow-hidden" : "min-h-dvh",
      )}
    >
      <div
        className={cn(
          "relative mx-auto max-w-7xl border-x bg-background",
          fixedLayout ? "h-dvh overflow-hidden" : "min-h-dvh",
        )}
      >
        <main
          id="mobile-content"
          data-scroll-restoration="mobile-content"
          className={
            directory
              ? "h-[calc(100dvh-var(--mobile-tabbar-height))] overflow-hidden"
              : fixedLayout
                ? "h-[calc(100dvh-var(--mobile-tabbar-height))] overflow-hidden px-5 pt-[max(1rem,env(safe-area-inset-top))]"
                : "px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[var(--navigation-bottom-padding)] max-lg:h-dvh max-lg:overflow-y-auto max-lg:overscroll-contain"
          }
        >
          {children}
        </main>
        {navigation}
      </div>
    </div>
  );
}
