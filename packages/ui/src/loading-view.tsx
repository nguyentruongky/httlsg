"use client";
import { LoaderCircle } from "lucide-react";
import { cn } from "./cn";

/** Shared centered loading state for initial page and panel reads. */
export function LoadingView({
  message = "Đang tải trang…",
  animated = true,
  className,
}: {
  message?: string;
  animated?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex min-h-[60dvh] w-full flex-col items-center justify-center gap-4 p-8 text-center",
        className,
      )}
    >
      <LoaderCircle
        size={28}
        strokeWidth={1.5}
        aria-hidden="true"
        className={cn(
          "text-muted-foreground",
          animated && "motion-safe:animate-spin",
        )}
      />
      <span className="text-sm font-medium text-muted-foreground">
        {message}
      </span>
    </div>
  );
}
