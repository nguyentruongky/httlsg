"use client";
import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "./cn";
import { DropdownMenu, MenuItem } from "./dropdown-menu";
const subscribeMobileSelect = (notify: () => void) => {
  const media = window.matchMedia("(max-width: 767px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const mobileSelectSnapshot = () =>
  window.matchMedia("(max-width: 767px)").matches;
// Shared by native selects and custom dropdown triggers.
const dropdownControlStyles =
  "bg-white text-slate-950 hover:bg-white dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-900";
function DropdownTrigger({
  children,
  className,
  indicator = true,
  ...props
}: React.ComponentProps<"button"> & { indicator?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex min-h-10 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input px-3 py-2 text-left text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className,
        dropdownControlStyles,
      )}
    >
      {children}
      {indicator && (
        <ChevronDown
          size={16}
          className="shrink-0 opacity-60"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
export const Dropdown = Object.assign(DropdownSelect, {
  Trigger: DropdownTrigger,
});
// Keep existing imports compatible while consumers migrate to Dropdown.
export const Select = Dropdown;

function DropdownSelect({
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
          showLabel={false}
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
            <DropdownTrigger
              indicator={false}
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
            </DropdownTrigger>
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
        "ui-select min-w-0 max-w-full min-h-10 rounded-lg border border-input px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
        dropdownControlStyles,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
