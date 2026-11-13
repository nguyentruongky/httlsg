"use client";
import * as React from "react";
import { cn } from "./cn";
export function Input({
  className,
  onKeyDown,
  ...props
}: React.ComponentProps<"input">) {
  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
    event,
  ) => {
    onKeyDown?.(event);
    if (
      event.defaultPrevented ||
      event.key !== "Enter" ||
      event.nativeEvent.isComposing ||
      event.shiftKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.currentTarget.type === "search"
    )
      return;
    const scope = event.currentTarget.closest('form,[role="dialog"],main');
    if (!scope) return;
    const inputs = Array.from(
      scope.querySelectorAll<HTMLInputElement>(
        'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="search"])',
      ),
    ).filter(
      (input) =>
        ["text", "email", "tel", "password", "url", "number"].includes(
          input.type,
        ) &&
        !input.matches(":disabled") &&
        !input.readOnly &&
        input.tabIndex >= 0 &&
        input.getClientRects().length > 0,
    );
    const index = inputs.indexOf(event.currentTarget);
    if (index < 0) return;
    const next = inputs[index + 1];
    if (next && next !== event.currentTarget) {
      event.preventDefault();
      next.focus();
    }
  };
  return (
    <input
      className={cn(
        "ui-input h-10 min-w-0 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className,
      )}
      {...props}
      onKeyDown={handleKeyDown}
    />
  );
}
