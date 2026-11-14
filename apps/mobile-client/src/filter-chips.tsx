import { X } from "lucide-react";
import { ageRangeLabel, type MemberFiltersValue } from "./member-filters";

export type FilterChip = { key: string; label: string; onRemove: () => void };
export function FilterChips({ chips }: { chips: FilterChip[] }) {
  if (!chips.length) return null;
  return (
    <div
      aria-label="Bộ lọc đang áp dụng"
      className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain py-1"
    >
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          aria-label={`Bỏ lọc ${chip.label}`}
          className="inline-flex min-h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-primary/15 bg-accent px-3 text-xs text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>{chip.label}</span>
          <X size={12} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
export function memberFilterChips(
  value: MemberFiltersValue,
  onChange: (value: MemberFiltersValue) => void,
  departments: { id: string; name: string }[],
): FilterChip[] {
  return [
    ...value.departmentIds.map((id) => ({
      key: `department:${id}`,
      label: departments.find((item) => item.id === id)?.name ?? id,
      onRemove: () =>
        onChange({
          ...value,
          departmentIds: value.departmentIds.filter((item) => item !== id),
        }),
    })),
    ...(value.churchStatuses ?? []).map((status) => ({
      key: `status:${status}`,
      label: status,
      onRemove: () =>
        onChange({
          ...value,
          churchStatuses: value.churchStatuses?.filter(
            (item) => item !== status,
          ),
        }),
    })),
    ...(["area", "location"] as const).flatMap((key) =>
      value[key].map((item) => ({
        key: `${key}:${item}`,
        label: item,
        onRemove: () =>
          onChange({
            ...value,
            [key]: value[key].filter((other) => other !== item),
          }),
      })),
    ),
    ...(value.ageUnknownOnly || value.minAge !== null || value.maxAge !== null
      ? [
          {
            key: "age",
            label: ageRangeLabel(
              value.minAge,
              value.maxAge,
              value.ageUnknownOnly,
            ),
            onRemove: () =>
              onChange({
                ...value,
                minAge: null,
                maxAge: null,
                ageUnknownOnly: false,
              }),
          },
        ]
      : []),
  ];
}
