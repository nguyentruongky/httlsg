"use client";
import * as React from "react";
import { cn } from "./cn";
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
  variant = "default",
  colorIndex = 0,
}: {
  name: string;
  className?: string;
  variant?: "default" | "member";
  colorIndex?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary",
        variant === "member" && "size-12 rounded-2xl text-sm",
        variant === "member" &&
          colorIndex % 3 === 1 &&
          "bg-amber-500/10 text-amber-700 dark:text-amber-300",
        variant === "member" &&
          colorIndex % 3 === 2 &&
          "bg-sky-500/10 text-sky-700 dark:text-sky-300",
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
