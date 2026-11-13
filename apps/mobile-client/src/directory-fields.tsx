import { useDebouncedSearch } from "./use-debounced-search";
import { useId, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { departments, areas, locations } from "@org/core";
import { Button, Dropdown, Input, Popover, cn } from "@org/ui";

type Option = { value: string; label: string };
function PickerDropdown({
  label,
  summary,
  options,
  selected,
  onSelect,
  multiple = false,
  searchable = false,
  onClear,
}: {
  label: string;
  summary: string;
  options: Option[];
  selected: string[];
  onSelect: (value: string) => void;
  multiple?: boolean;
  searchable?: boolean;
  onClear?: () => void;
}) {
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .toLocaleLowerCase("vi");
  const debouncedSearch = useDebouncedSearch(search);
  const matches = options.filter((option) =>
    normalize(option.label).includes(normalize(debouncedSearch)),
  );
  return (
    <div ref={container}>
      <label id={`${id}-label`} htmlFor={id} className="sr-only">
        {label}
      </label>
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setSearch("");
        }}
      >
        <Popover.Trigger asChild>
          <Dropdown.Trigger
            indicator={false}
            id={id}
            type="button"
            aria-labelledby={`${id}-label ${id}-value`}
            className="min-h-14 h-auto w-full justify-between rounded-xl bg-card px-4 py-3 text-left text-base"
          >
            <span
              id={`${id}-value`}
              className="min-w-0 flex-1 break-words leading-relaxed"
            >
              {summary}
            </span>
            <ChevronDown
              size={20}
              className={cn(
                "shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </Dropdown.Trigger>
        </Popover.Trigger>
        {/* Keep the panel inside its owning dialog/fieldset for focus, scrolling, and disabled form controls. */}
        <Popover.Portal container={container.current}>
          <Popover.Content
            align="start"
            sideOffset={6}
            collisionPadding={12}
            aria-labelledby={`${id}-label`}
            onOpenAutoFocus={(event) => {
              if (searchable) {
                event.preventDefault();
                searchInput.current?.focus();
              }
            }}
            className="z-[60] flex max-h-[min(26rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw_-_1.5rem)] flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl outline-none"
          >
            {searchable && (
              <div className="shrink-0 border-b bg-popover p-3">
                <div className="relative">
                  <Search
                    size={19}
                    className="pointer-events-none absolute left-3 top-4 text-muted-foreground"
                  />
                  <Input
                    ref={searchInput}
                    type="search"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-label="Tìm phường/xã trong danh sách"
                    placeholder="Tìm phường, xã, đặc khu…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-14 rounded-lg pl-10 pr-10 text-base"
                  />
                  {search && (
                    <button
                      type="button"
                      aria-label="Xóa tìm kiếm phường/xã"
                      onClick={() => {
                        setSearch("");
                        searchInput.current?.focus();
                      }}
                      className="absolute right-0 top-0 flex size-14 items-center justify-center text-muted-foreground"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            )}
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5"
              aria-label={`Các lựa chọn ${label}`}
            >
              {matches.map((option) => {
                const checked = selected.includes(option.value);
                return multiple ? (
                  <label
                    key={option.value}
                    className={cn(
                      "flex min-h-14 cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-base leading-relaxed hover:bg-muted",
                      checked && "bg-accent/60",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onSelect(option.value)}
                      className="size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    />
                    <span>{option.label}</span>
                  </label>
                ) : (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={checked}
                    onClick={() => {
                      onSelect(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-base leading-relaxed hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      checked && "bg-accent/60 text-primary",
                    )}
                  >
                    <span className="flex-1">{option.label}</span>
                    {checked && <Check size={20} className="shrink-0" />}
                  </button>
                );
              })}
              {!matches.length && (
                <p
                  role="status"
                  className="px-3 py-6 text-base text-muted-foreground"
                >
                  Không tìm thấy phường/xã phù hợp.
                </p>
              )}
            </div>
            {multiple && (
              <div className="flex shrink-0 items-center justify-between gap-2 border-t bg-popover p-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="touch"
                  disabled={!selected.length}
                  onClick={onClear}
                >
                  Bỏ chọn tất cả
                </Button>
                <Popover.Close asChild>
                  <Button type="button" size="touch">
                    Xong
                  </Button>
                </Popover.Close>
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {multiple && (
        <p aria-live="polite" className="mt-2 text-sm text-muted-foreground">
          {selected.length
            ? `Đã chọn ${selected.length} ban ngành.`
            : "Có thể chọn nhiều ban ngành."}
        </p>
      )}
    </div>
  );
}
export function DepartmentChoices({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const summary =
    value.length > 1
      ? `${value.length} ban ngành đã chọn`
      : (departments.find((d) => d.id === value[0])?.name ?? "Chọn ban ngành");
  return (
    <PickerDropdown
      label="Ban ngành"
      summary={summary}
      multiple
      options={departments.map((d) => ({ value: d.id, label: d.name }))}
      selected={value}
      onSelect={(id) =>
        onChange(
          value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
        )
      }
      onClear={() => onChange([])}
    />
  );
}
export function AreaPicker({
  value,
  onChange,
  emptyValue = "all",
}: {
  value: string;
  onChange: (value: string) => void;
  emptyValue?: string;
}) {
  const emptyLabel =
    emptyValue === "all" ? "Tất cả khu vực" : "Chưa chọn khu vực";
  return (
    <PickerDropdown
      label="Khu vực"
      summary={value === emptyValue ? emptyLabel : value}
      selected={[value]}
      onSelect={onChange}
      options={[
        { value: emptyValue, label: emptyLabel },
        ...areas.map((area) => ({ value: area, label: area })),
      ]}
    />
  );
}
export function LocationPicker({
  value,
  onChange,
  emptyValue = "all",
}: {
  value: string;
  onChange: (value: string) => void;
  emptyValue?: string;
}) {
  const emptyLabel =
    emptyValue === "all" ? "Tất cả phường/xã" : "Chưa chọn phường/xã";
  return (
    <PickerDropdown
      label="Phường/xã"
      summary={value === emptyValue ? emptyLabel : value}
      searchable
      selected={[value]}
      onSelect={onChange}
      options={[
        { value: emptyValue, label: emptyLabel },
        ...locations.map((location) => ({ value: location, label: location })),
      ]}
    />
  );
}
