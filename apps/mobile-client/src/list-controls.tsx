import type { ReactNode } from "react";
import { Search, SlidersHorizontal, Download } from "lucide-react";
import { Badge, Button, Input } from "@org/ui";

export function ListPageHeader({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6 flex min-w-0 items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          <span
            className="shrink-0 text-primary [&>svg]:size-6"
            aria-hidden="true"
          >
            {icon}
          </span>
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </header>
  );
}
export function ListSearchToolbar({
  value,
  onChange,
  label,
  onFilter,
  onDownload,
  filterCount = 0,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  onFilter: () => void;
  onDownload: () => void | Promise<void>;
  filterCount?: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 p-4 sm:p-5">
      <div className="relative min-w-0 flex-1">
        <Search
          size={17}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          aria-label={label}
          placeholder="Tên, số điện thoại, email…"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={200}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 min-h-11 w-full rounded-lg pl-10 text-base sm:text-sm"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        aria-label="Bộ lọc"
        onClick={onFilter}
        className="h-11 min-h-11 shrink-0 gap-2 rounded-lg px-3"
      >
        <SlidersHorizontal size={17} aria-hidden="true" />
        <span className="hidden sm:inline">Bộ lọc</span>
        {filterCount > 0 && <Badge>{filterCount}</Badge>}
      </Button>
      <Button
        type="button"
        variant="outline"
        aria-label="Tải danh sách"
        onClick={() => void onDownload()}
        className="h-11 min-h-11 shrink-0 gap-2 rounded-lg px-3"
      >
        <Download size={17} aria-hidden="true" />
        <span className="hidden sm:inline">Tải danh sách</span>
      </Button>
    </div>
  );
}
