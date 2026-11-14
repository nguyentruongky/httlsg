import { FilterChips, type FilterChip } from "./filter-chips";
import { useRef, type ReactNode, type RefObject } from "react";
import { Search, SlidersHorizontal, Download, X } from "lucide-react";
import { Badge, Button, Input, cn } from "@org/ui";

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
export function ListControls({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-x-6 lg:p-4 xl:px-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
export function ListSearchToolbar({
  value,
  onChange,
  label,
  onFilter,
  filterCount = 0,
  chips = [],
  inputRef,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  onFilter: () => void;
  filterCount?: number;
  chips?: FilterChip[];
  inputRef?: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
}) {
  const localInput = useRef<HTMLInputElement>(null);
  const input = inputRef ?? localInput;
  return (
    <div className="min-w-0 space-y-1 p-1 lg:max-w-xl lg:p-0">
      <div className="flex min-w-0 items-center gap-2">
        <div className="relative min-w-0 flex-1 bg-white dark:bg-slate-900">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={input}
            disabled={disabled}
            type="search"
            aria-label={label}
            placeholder="Tên, số điện thoại, email…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={200}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-11 min-h-11 w-full rounded-lg pl-10 pr-11 text-base sm:text-sm bg-white dark:bg-slate-900"
          />
          {value && (
            <button
              type="button"
              aria-label="Xóa nội dung tìm kiếm"
              className="absolute right-0 top-0 flex size-11 items-center justify-center text-muted-foreground"
              onClick={() => {
                onChange("");
                input.current?.focus();
              }}
            >
              <X size={17} aria-hidden="true" />
            </button>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          aria-label="Bộ lọc"
          onClick={onFilter}
          disabled={disabled}
          className="h-11 min-h-11 shrink-0 gap-2 rounded-lg px-3 bg-white dark:bg-slate-900"
        >
          <SlidersHorizontal size={17} aria-hidden="true" />
          <span className="hidden sm:inline">Bộ lọc</span>
          {filterCount > 0 && <Badge>{filterCount}</Badge>}
        </Button>
      </div>
      <FilterChips
        chips={[
          ...(value.trim()
            ? [
                {
                  key: "search",
                  label: value.trim(),
                  onRemove: () => onChange(""),
                },
              ]
            : []),
          ...chips,
        ]}
      />
    </div>
  );
}

export function ListResultsSummary({
  children,
  onDownload,
}: {
  children: ReactNode;
  onDownload: () => void | Promise<void>;
}) {
  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground lg:w-auto lg:flex-nowrap lg:gap-x-5">
      <span className="lg:whitespace-nowrap" aria-live="polite">
        {children}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto gap-2 px-0 font-medium text-primary lg:ml-0 lg:shrink-0 lg:rounded-lg lg:px-3 lg:hover:bg-accent"
        onClick={() => void onDownload()}
      >
        <Download size={17} aria-hidden="true" />
        Tải danh sách
      </Button>
    </div>
  );
}
