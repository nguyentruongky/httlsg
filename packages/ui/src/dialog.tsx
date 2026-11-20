"use client";
import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronLeft, X } from "lucide-react";
import { cn } from "./cn";
import { Button } from "./button";
import { preventDismissClickThrough } from "./dismiss-layer";
import { useDialogViewport } from "./use-dialog-viewport";

const DialogBoundaryContext = React.createContext<React.RefObject<HTMLDivElement | null> | null>(null);

export function DialogBoundary({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const boundary = React.useRef<HTMLDivElement>(null);
  return (
    <DialogBoundaryContext.Provider value={boundary}>
      <div ref={boundary} {...props}>{children}</div>
    </DialogBoundaryContext.Provider>
  );
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  scrollableBody = false,
  trigger,
  closeLabel = "Close dialog",
  className,
  fullScreenOnMobile = false,
  bottomSheet = false,
  mobileBackButton = false,
  onOpenAutoFocus,
  onCloseAutoFocus,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollableBody?: boolean;
  trigger?: React.ReactNode;
  closeLabel?: string;
  className?: string;
  /**
   * Tapping a long native dropdown on a phone is easier from a full-height
   * panel, so the dialog becomes a pushed screen below the `sm` breakpoint and
   * returns to a centred modal from `sm` up.
   */
  fullScreenOnMobile?: boolean;
  bottomSheet?: boolean;
  mobileBackButton?: boolean;
  onCloseAutoFocus?: React.ComponentProps<
    typeof DialogPrimitive.Content
  >["onCloseAutoFocus"];
  onOpenAutoFocus?: React.ComponentProps<
    typeof DialogPrimitive.Content
  >["onOpenAutoFocus"];
}) {
  const attachContent = useDialogViewport(open);
  const returnFocus = React.useRef<HTMLElement | null>(null);
  const boundary = React.useContext(DialogBoundaryContext);
  const [bounds, setBounds] = React.useState<React.CSSProperties>();
  React.useLayoutEffect(() => {
    if (!bottomSheet || !boundary?.current || open === false) return;
    const element = boundary.current;
    const sync = () => {
      if (window.innerWidth < 1024) {
        setBounds(undefined);
        return;
      }
      const rect = element.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      const top = Math.max(viewportTop, rect.top);
      const bottom = Math.min(viewportBottom, rect.bottom);
      setBounds({
        left: Math.max(0, rect.left),
        right: Math.max(0, window.innerWidth - rect.right),
        top,
        bottom: Math.max(0, window.innerHeight - bottom),
        width: "auto",
        maxHeight: Math.max(0, bottom - top),
      });
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(element);
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
    };
  }, [boundary, bottomSheet, open]);
  const boundaryStyle = bottomSheet && boundary ? bounds : undefined;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      )}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          style={boundaryStyle}
          data-bottom-sheet={bottomSheet || undefined}
          className="dialog-backdrop fixed inset-0 z-50 bg-black/35 backdrop-blur-sm"
          onClick={(event) => event.stopPropagation()}
        />
        <DialogPrimitive.Content
          style={boundaryStyle ? { ...boundaryStyle, top: "auto" } : undefined}
          ref={attachContent}
          onPointerDownOutside={(event) =>
            preventDismissClickThrough(event.detail.originalEvent)
          }
          onClick={(event) => event.stopPropagation()}
          onOpenAutoFocus={(event) => {
            returnFocus.current = document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
            onOpenAutoFocus?.(event);
          }}
          onCloseAutoFocus={(event) => {
            onCloseAutoFocus?.(event);
            if (event.defaultPrevented) return;
            event.preventDefault();
            if (returnFocus.current?.isConnected)
              returnFocus.current.focus({ preventScroll: true });
          }}
          className={cn(
            "ui-dialog fixed z-50 min-w-0 wrap-break-word border-border bg-background focus:outline-none",
            fullScreenOnMobile
              ? "dialog-sheet left-0 top-0 h-dvh max-h-dvh w-full max-w-none overflow-auto overscroll-contain rounded-none p-5 shadow-xl sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90dvh] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:p-6"
              : "left-1/2 top-1/2 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border border-border p-6 shadow-xl",
            className,
            scrollableBody && "dialog-scroll-body",
            bottomSheet &&
              "bottom-sheet-dialog bottom-sheet-menu inset-x-0 bottom-0 top-auto w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
          )}
        >
          <div className={scrollableBody ? "shrink-0" : undefined}>
            <DialogPrimitive.Title className={cn(
              "pr-8 text-lg font-semibold",
              mobileBackButton && "pl-10 pr-0 sm:pl-0 sm:pr-8",
            )}>
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mb-5 mt-1 text-sm text-muted-foreground">
              {description}
            </DialogPrimitive.Description>
          </div>
          {scrollableBody ? (
            <div className="dialog-body min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
              {children}
            </div>
          ) : children}
          {footer && (
            <div className="mt-4 shrink-0 border-t bg-background pt-4">{footer}</div>
          )}
          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute top-[max(.75rem,env(safe-area-inset-top))]",
                mobileBackButton
                  ? "left-[max(.5rem,env(safe-area-inset-left))] sm:left-auto sm:right-[max(.75rem,env(safe-area-inset-right))]"
                  : "right-[max(.75rem,env(safe-area-inset-right))]",
              )}
              aria-label={closeLabel}
            >
              {mobileBackButton ? (
                <>
                  <ChevronLeft size={24} className="sm:hidden" />
                  <X size={18} className="hidden sm:block" />
                </>
              ) : <X size={18} />}
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
