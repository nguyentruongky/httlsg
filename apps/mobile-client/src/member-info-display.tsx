import type { ElementType, ReactNode } from "react";
import { formatDate } from "./date-input";
export function displayDate(value: string | null | undefined) {
  return formatDate(value);
}
export function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: ElementType;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 py-3.5">
      <Icon size={17} className="mt-1 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-1 wrap-break-word text-sm">{children}</dd>
      </div>
    </div>
  );
}
