"use client";
import * as React from "react";
import { DropdownMenu as DropdownPrimitive } from "radix-ui";
import { Check } from "lucide-react";
import { preventDismissClickThrough } from "./dismiss-layer";
import { cn } from "./cn";
export function DropdownMenu({
  trigger,
  children,
  label,
  align = "end",
  className,
  onCloseAutoFocus,
  animateOnMobile = false,
  showLabel = true,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  label?: string;
  showLabel?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
  animateOnMobile?: boolean;
  onCloseAutoFocus?: React.ComponentProps<
    typeof DropdownPrimitive.Content
  >["onCloseAutoFocus"];
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <DropdownPrimitive.Root open={open} onOpenChange={setOpen}>
      <DropdownPrimitive.Trigger
        asChild
        onClick={(event) => event.stopPropagation()}
      >
        {trigger}
      </DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <div
          className="mobile-menu-backdrop"
          aria-hidden="true"
          onPointerDown={(event) => {
            preventDismissClickThrough(event.nativeEvent);
            setOpen(false);
          }}
          onClick={(event) => event.stopPropagation()}
        />
      </DropdownPrimitive.Portal>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          onPointerDownOutside={(event) =>
            preventDismissClickThrough(event.detail.originalEvent)
          }
          onClick={(event) => event.stopPropagation()}
          data-responsive-menu="true"
          data-animated-menu={animateOnMobile ? "true" : undefined}
          aria-label={label || "Menu"}
          onCloseAutoFocus={onCloseAutoFocus}
          sideOffset={8}
          align={align}
          className={cn(
            "responsive-menu z-50 max-h-[min(60dvh,var(--radix-dropdown-menu-content-available-height))] max-w-[calc(100vw-1rem)] wrap-break-word min-w-48 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-sm text-popover-foreground shadow-xl",
            className,
          )}
        >
          {label && showLabel && (
            <DropdownPrimitive.Label className="px-2 py-2 text-xs text-muted-foreground">
              {label}
            </DropdownPrimitive.Label>
          )}
          {children}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}
export function MenuItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownPrimitive.Item>) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        "flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 outline-none focus:bg-muted data-disabled:pointer-events-none data-disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}
export function MenuCheckbox({
  children,
  ...props
}: React.ComponentProps<typeof DropdownPrimitive.CheckboxItem>) {
  return (
    <DropdownPrimitive.CheckboxItem
      className="relative flex min-h-10 cursor-pointer items-center rounded-md py-2 pl-8 pr-3 outline-none focus:bg-muted"
      {...props}
    >
      <DropdownPrimitive.ItemIndicator className="absolute left-2">
        <Check size={14} />
      </DropdownPrimitive.ItemIndicator>
      {children}
    </DropdownPrimitive.CheckboxItem>
  );
}
