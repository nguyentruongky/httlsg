import type { ReactNode } from "react";
import { Badge, Button } from "@org/ui";
export function Heading({
  eyebrow,
  title,
  description,
  icon,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-primary">
            {eyebrow}
          </p>
        )}
        <h2 className="flex items-center gap-3 text-2xl sm:text-3xl font-semibold tracking-tight">
          {icon}
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
