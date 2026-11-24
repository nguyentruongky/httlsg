import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function ElectionStatCard({
  label,
  value,
  icon: Icon,
  hint = "",
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <div className="flex min-h-40 flex-col justify-between gap-3 rounded-2xl border-2 border-[#cfd2c9] bg-white p-4 shadow-none sm:p-5">
      <dt className="flex items-start justify-between gap-2 text-sm font-medium leading-relaxed text-[#60635b] sm:text-base">
        <span>{label}</span>
        <span className="flex size-8 shrink-0 items-center justify-center text-[#216e4a]">
          <Icon size={24} aria-hidden="true" />
        </span>
      </dt>
      <dd className="text-3xl font-bold leading-none tracking-tight text-[#1e211c] tabular-nums sm:text-[2.125rem]">
        {value}
      </dd>
      <p className="text-xs leading-relaxed text-[#8b8f85]">{hint}</p>
    </div>
  );
}
