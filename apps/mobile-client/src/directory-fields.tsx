import { useDebouncedSearch } from "./use-debounced-search";
import { useId, useState } from "react";
import { departments, areas, locations } from "@org/core";
import { Button, Input } from "@org/ui";

type Option = { value: string; label: string; disabled?: boolean };

/** Plain choice rows rendered directly inside the profile editor's sheet. */
export function ProfileChoiceList({
  label,
  options,
  selected,
  onSelect,
  multiple = false,
  searchable = false,
  onClear,
}: {
  label: string;
  summary?: string;
  options: Option[];
  selected: string[];
  onSelect: (value: string) => void;
  multiple?: boolean;
  searchable?: boolean;
  onClear?: () => void;
}) {
  const name = useId();
  const [search, setSearch] = useState("");
  const term = useDebouncedSearch(search);
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .toLocaleLowerCase("vi");
  const matches = options.filter((option) =>
    normalize(option.label).includes(normalize(term)),
  );
  return (
    <div className="space-y-2">
      {searchable && (
        <Input
          type="search"
          aria-label={`Tìm ${label}`}
          placeholder={`Tìm ${label.toLocaleLowerCase("vi")}…`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      )}
      <div
        className="max-h-[50dvh] overflow-y-auto overscroll-contain"
        role={multiple ? "group" : "radiogroup"}
        aria-label={label}
      >
        {matches.map((option) => (
          <label
            key={option.value}
            className="flex min-h-12 cursor-pointer items-center gap-3 py-2 text-sm"
          >
            <input
              type={multiple ? "checkbox" : "radio"}
              name={name}
              className="size-5 shrink-0 accent-primary"
              checked={selected.includes(option.value)}
              disabled={option.disabled}
              onChange={() => onSelect(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
        {!matches.length && (
          <p role="status" className="py-4 text-sm text-muted-foreground">
            Không tìm thấy lựa chọn phù hợp.
          </p>
        )}
      </div>
      {multiple && (
        <Button type="button" variant="ghost" onClick={onClear}>
          Bỏ chọn tất cả
        </Button>
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
    <ProfileChoiceList
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
    <ProfileChoiceList
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
    <ProfileChoiceList
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
