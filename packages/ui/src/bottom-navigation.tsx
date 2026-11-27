"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export interface BottomNavigationItem {
  id: string | number;
  label: ReactNode;
  active?: boolean;
  disabled?: boolean;
  href?: string;
  onSelect?: () => void;
  icon?: ReactNode;
}

interface BottomNavigationProps extends HTMLAttributes<HTMLElement> {
  items: readonly BottomNavigationItem[];
  "aria-label": string;
  contentClassName?: string;
  itemClassName?: string | ((item: BottomNavigationItem) => string);
  labelClassName?: string;
}

/** Presentation only: callers own routing, selection, and permission rules. */
export function BottomNavigation({
  items,
  contentClassName,
  itemClassName,
  labelClassName,
  ...props
}: BottomNavigationProps) {
  const controls = items.map((item) => {
    const className = cn(
      "relative flex flex-1 flex-col items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      typeof itemClassName === "function" ? itemClassName(item) : itemClassName,
    );
    const children = (
      <>
        {item.icon}
        <span className={labelClassName}>{item.label}</span>
      </>
    );
    const current = item.active ? ("page" as const) : undefined;
    return item.href ? (
      <a
        key={item.id}
        href={item.disabled ? undefined : item.href}
        aria-current={current}
        aria-disabled={item.disabled || undefined}
        tabIndex={item.disabled ? -1 : undefined}
        className={className}
        onClick={
          item.disabled ? (event) => event.preventDefault() : item.onSelect
        }
      >
        {children}
      </a>
    ) : (
      <button
        key={item.id}
        type="button"
        disabled={item.disabled}
        aria-current={current}
        className={className}
        onClick={item.onSelect}
      >
        {children}
      </button>
    );
  });
  return (
    <nav {...props}>
      {contentClassName ? (
        <div className={contentClassName}>{controls}</div>
      ) : (
        controls
      )}
    </nav>
  );
}
