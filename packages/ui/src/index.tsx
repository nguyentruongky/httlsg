"use client";
import * as React from "react";
import {
  Popover as PopoverPrimitive,
  Slot,
  Dialog as DialogPrimitive,
  DropdownMenu as Dropdown,
  Checkbox as CheckboxPrimitive,
} from "radix-ui";
import { Command as CommandPrimitive } from "cmdk";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Check, ChevronDown, X } from "lucide-react";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
const buttonVariants = cva(
  "ui-button inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-border bg-background hover:bg-muted",
        ghost: "hover:bg-muted text-muted-foreground hover:text-foreground",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
      },
      size: {
        default: "h-10",
        sm: "h-9 min-h-9 px-3 text-xs",
        icon: "size-10 shrink-0 p-0",
        touch: "min-h-12 px-5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "ui-input h-10 min-w-0 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "ui-select min-w-0 max-w-full min-h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-xs",
        className,
      )}
      {...props}
    />
  );
}
export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium",
        className,
      )}
      {...props}
    />
  );
}
export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary",
        className,
      )}
    >
      {name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
export function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "flex size-4 items-center justify-center rounded border border-input data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check size={12} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
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
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      )}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            "ui-dialog fixed z-50 min-w-0 break-words border-border bg-background focus:outline-none",
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
export function DropdownMenu({
  trigger,
  children,
  label,
  align = "end",
  className,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  label?: string;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          sideOffset={8}
          align={align}
          className={cn(
            "z-50 max-h-[min(60dvh,var(--radix-dropdown-menu-content-available-height))] max-w-[calc(100vw_-_1rem)] break-words min-w-48 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-sm text-popover-foreground shadow-xl",
            className,
          )}
        >
          {label && (
            <Dropdown.Label className="px-2 py-2 text-xs text-muted-foreground">
              {label}
            </Dropdown.Label>
          )}
          {children}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
export function MenuItem({
  className,
  ...props
}: React.ComponentProps<typeof Dropdown.Item>) {
  return (
    <Dropdown.Item
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
}: React.ComponentProps<typeof Dropdown.CheckboxItem>) {
  return (
    <Dropdown.CheckboxItem
      className="relative flex min-h-10 cursor-pointer items-center rounded-md py-2 pl-8 pr-3 outline-none focus:bg-muted"
      {...props}
    >
      <Dropdown.ItemIndicator className="absolute left-2">
        <Check size={14} />
      </Dropdown.ItemIndicator>
      {children}
    </Dropdown.CheckboxItem>
  );
}
export const Command = CommandPrimitive;
export const Chevron = ChevronDown;
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
type ToastInput = {
  title: string;
  description?: string;
  variant?: "success" | "error";
};
type ToastItem = ToastInput & { id: number };
const ToastContext = React.createContext<{
  toast: (input: ToastInput) => void;
} | null>(null);
export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <Toaster>.");
  return context;
}
export function Toaster({ children }: { children?: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const toast = React.useCallback((input: ToastInput) => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { ...input, id }]);
    setTimeout(
      () => setItems((current) => current.filter((item) => item.id !== id)),
      5000,
    );
  }, []);
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-60 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role={item.variant === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto [overflow-wrap:anywhere] rounded-xl border p-4 text-sm shadow-xl",
              item.variant === "error"
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-border bg-card text-card-foreground",
            )}
          >
            <p className="font-medium">{item.title}</p>
            {item.description && (
              <p className="mt-1 text-xs leading-relaxed opacity-80">
                {item.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export function ErrorMessage({ error }: { error: unknown }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
    >
      {error instanceof Error
        ? error.message
        : "Something went wrong. Please try again."}
    </p>
  );
}

export const Popover = PopoverPrimitive;
export { Dialog as NavigationDialog } from "radix-ui";
