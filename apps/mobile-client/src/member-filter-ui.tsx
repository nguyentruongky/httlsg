import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@org/ui";
export function FilterRow({
  label,
  summary,
  onClick,
}: {
  label: string;
  summary: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-20 w-full items-center gap-3 border-b px-4 py-4 text-left last:border-0 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium">{label}</span>
        <span className="mt-1 block break-words text-sm text-muted-foreground">
          {summary}
        </span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-muted-foreground" />
    </button>
  );
}
export function SelectionList({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y overflow-hidden rounded-2xl border bg-card">
      {children}
    </div>
  );
}
export function Selection({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <label className="flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-4 text-left text-base hover:bg-muted">
      <input
        type="checkbox"
        checked={selected}
        onChange={onClick}
        className="size-5 shrink-0 accent-primary"
      />
      <span className="flex-1">{label}</span>
    </label>
  );
}
