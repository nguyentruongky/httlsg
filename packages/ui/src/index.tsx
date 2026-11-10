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
const subscribeMobileSelect = (notify: () => void) => {
  const media = window.matchMedia("(max-width: 767px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const mobileSelectSnapshot = () =>
  window.matchMedia("(max-width: 767px)").matches;
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
  const mobile = React.useSyncExternalStore(
    subscribeMobileSelect,
    mobileSelectSnapshot,
    () => false,
  );
  const native = React.useRef<HTMLSelectElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const pendingSelection = React.useRef<string | null>(null);
  type Option = {
    value: string;
    label: string;
    group?: string;
    disabled: boolean;
  };
  const options: Option[] = [];
  function labelText(node: React.ReactNode): string {
    return React.Children.toArray(node)
      .map((item) =>
        React.isValidElement<{ children?: React.ReactNode }>(item)
          ? labelText(item.props.children)
          : String(item),
      )
      .join("");
  }
  function collect(nodes: React.ReactNode, group?: string, disabled = false) {
    React.Children.forEach(nodes, (node) => {
      if (
        !React.isValidElement<{
          children?: React.ReactNode;
          value?: string | number;
          label?: string;
          disabled?: boolean;
          hidden?: boolean;
        }>(node)
      )
        return;
      if (node.type === "option") {
        if (node.props.hidden) return;
        const label = node.props.label ?? labelText(node.props.children);
        options.push({
          value: String(node.props.value ?? label),
          label,
          group,
          disabled: disabled || Boolean(node.props.disabled),
        });
      } else
        collect(
          node.props.children,
          node.type === "optgroup" ? node.props.label : group,
          disabled || Boolean(node.props.disabled),
        );
    });
  }
  collect(children);
  const [uncontrolled, setUncontrolled] = React.useState(() =>
    String(props.defaultValue ?? options[0]?.value ?? ""),
  );
  if (mobile && !props.multiple) {
    const selected = String(props.value ?? uncontrolled);
    return (
      <div className={cn("relative min-w-0", className)}>
        <select
          {...props}
          ref={native}
          id={props.id ? `${props.id}-native` : undefined}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onInvalid={(event) => {
            props.onInvalid?.(event);
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          {children}
        </select>
        <DropdownMenu
          label={props["aria-label"] || "Chọn mục"}
          onCloseAutoFocus={(event) => {
            const value = pendingSelection.current;
            pendingSelection.current = null;
            if (value === null || !native.current) return;
            event.preventDefault();
            native.current.value = value;
            setUncontrolled(value);
            native.current.dispatchEvent(
              new Event("change", { bubbles: true }),
            );
            requestAnimationFrame(() =>
              trigger.current?.focus({ preventScroll: true }),
            );
          }}
          trigger={
            <button
              ref={trigger}
              id={props.id}
              type="button"
              disabled={props.disabled}
              aria-label={props["aria-label"]}
              aria-labelledby={props["aria-labelledby"]}
              className="ui-select flex min-h-10 w-full items-center rounded-lg border border-input bg-background px-3 pr-10 text-left text-sm font-normal disabled:opacity-50"
            >
              <span className="truncate">
                {options.find((option) => option.value === selected)?.label ??
                  "Chọn mục"}
              </span>
            </button>
          }
        >
          {options.map((option, index) => (
            <React.Fragment key={`${option.value}-${index}`}>
              {option.group && option.group !== options[index - 1]?.group && (
                <p className="px-2 pt-3 pb-1 text-xs font-medium text-muted-foreground">
                  {option.group}
                </p>
              )}
              <MenuItem
                disabled={
                  option.disabled || Boolean(props.required && !option.value)
                }
                onSelect={() => {
                  pendingSelection.current = option.value;
                }}
              >
                <span className="min-w-0 flex-1">{option.label}</span>
                {option.value === selected && (
                  <Check size={16} className="shrink-0" />
                )}
              </MenuItem>
            </React.Fragment>
          ))}
        </DropdownMenu>
      </div>
    );
  }
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
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      )}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm" />
        <DialogPrimitive.Content
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
export function DropdownMenu({
  trigger,
  children,
  label,
  align = "end",
  className,
  onCloseAutoFocus,
  animateOnMobile = false,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  label?: string;
  align?: "start" | "center" | "end";
  className?: string;
  animateOnMobile?: boolean;
  onCloseAutoFocus?: React.ComponentProps<
    typeof Dropdown.Content
  >["onCloseAutoFocus"];
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dropdown.Root open={open} onOpenChange={setOpen}>
      <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
      <Dropdown.Portal>
        <div
          className="mobile-menu-backdrop"
          aria-hidden="true"
          onPointerDown={() => setOpen(false)}
        />
      </Dropdown.Portal>
      <Dropdown.Portal>
        <Dropdown.Content
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
              "pointer-events-auto wrap-anywhere rounded-xl border p-4 text-sm shadow-xl",
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
export {
  WorshipNotificationPanel,
  WorshipMissingInformation,
  type WorshipNotificationPanelProps,
} from "./worship-notification-panel";
