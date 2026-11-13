"use client";
import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "./cn";
import { Button } from "./button";
import { preventDismissClickThrough } from "./dismiss-layer";
import { useDialogViewport } from "./use-dialog-viewport";
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  closeLabel = "Close dialog",
  className,
  fullScreenOnMobile = false,
  onOpenAutoFocus,
  onCloseAutoFocus,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
  closeLabel?: string;
  className?: string;
  /**
   * Tapping a long native dropdown on a phone is easier from a full-height
   * panel, so the dialog becomes a pushed screen below the `sm` breakpoint and
   * returns to a centred modal from `sm` up.
   */
  fullScreenOnMobile?: boolean;
  onCloseAutoFocus?: React.ComponentProps<
    typeof DialogPrimitive.Content
  >["onCloseAutoFocus"];
  onOpenAutoFocus?: React.ComponentProps<
    typeof DialogPrimitive.Content
  >["onOpenAutoFocus"];
}) {
  const attachContent = useDialogViewport(open);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      )}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm" />
        <DialogPrimitive.Content
          ref={attachContent}
          onPointerDownOutside={(event) =>
            preventDismissClickThrough(event.detail.originalEvent)
          }
          onClick={(event) => event.stopPropagation()}
          onOpenAutoFocus={onOpenAutoFocus}
          onCloseAutoFocus={onCloseAutoFocus}
          className={cn(
            "ui-dialog fixed z-50 min-w-0 wrap-break-word border-border bg-background focus:outline-none",
            fullScreenOnMobile
              ? "dialog-sheet left-0 top-0 h-dvh max-h-dvh w-full max-w-none overflow-auto overscroll-contain rounded-none p-5 shadow-xl sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90dvh] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:p-6"
              : "left-1/2 top-1/2 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border border-border p-6 shadow-xl",
            className,
          )}
        >
          <DialogPrimitive.Title className="pr-8 text-lg font-semibold">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mb-5 mt-1 text-sm text-muted-foreground">
            {description}
          </DialogPrimitive.Description>
          {children}
          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-[max(.75rem,env(safe-area-inset-right))] top-[max(.75rem,env(safe-area-inset-top))]"
              aria-label={closeLabel}
            >
              <X size={18} />
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
