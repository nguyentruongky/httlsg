import { useEffect, useId, useState } from "react";
import { apiRequest } from "@org/core";
import { Button, Input } from "@org/ui";
import { Search, MapPin, LoaderCircle } from "lucide-react";
import type { VenuePlace } from "./venue-state";

export function VenueAddressSearch({
  value,
  selected,
  disabled,
  onChange,
  onSelect,
}: {
  value: string;
  selected: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onSelect: (place: VenuePlace) => void;
}) {
  const id = useId();
  const [items, setItems] = useState<VenuePlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setItems([]);
    setActive(-1);
    setError("");
    if (selected || value.trim().length < 3) {
      setLoading(false);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setOpen(true);
    const timer = setTimeout(() => {
      void apiRequest<{ items: VenuePlace[] }>(
        `/api/election-geocoding?q=${encodeURIComponent(value.trim())}`,
        { signal: controller.signal },
      )
        .then((result) => {
          if (!controller.signal.aborted) setItems(result.items.slice(0, 5));
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setError(
              error instanceof Error
                ? error.message
                : "Không thể tìm địa chỉ. Vui lòng thử lại.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, selected, retry]);
  const choose = (place: VenuePlace) => {
    onSelect(place);
    setOpen(false);
    setActive(-1);
  };
  const expanded = open && !selected && value.trim().length >= 3;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        Địa chỉ
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5E5C55]"
          size={18}
        />
        <Input
          id={id}
          autoFocus
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={`${id}-results`}
          aria-activedescendant={
            expanded && active >= 0 ? `${id}-result-${active}` : undefined
          }
          autoComplete="off"
          disabled={disabled}
          value={selected ? value.split(",")[0] : value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => {
            if (!selected && value.trim().length >= 3) setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              return;
            }
            if (
              (event.key === "ArrowDown" || event.key === "ArrowUp") &&
              items.length
            ) {
              event.preventDefault();
              setOpen(true);
              setActive((index) =>
                event.key === "ArrowDown"
                  ? (index + 1) % items.length
                  : index <= 0
                    ? items.length - 1
                    : index - 1,
              );
            } else if (event.key === "Enter" && expanded) {
              event.preventDefault();
              if (active >= 0 && items[active]) choose(items[active]);
            }
          }}
          placeholder="Nhập tên nhà thờ, đường hoặc địa chỉ…"
          className="min-h-12 rounded-xl border-[#D9D7CF] bg-[#FAF9F5] pl-10 pr-10 text-[#1A1A17] focus-visible:ring-[#2F5D44]"
        />
        {loading && (
          <LoaderCircle
            aria-label="Đang tìm địa chỉ"
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#2F5D44]"
          />
        )}
      </div>
      <div aria-live="polite" className="text-sm text-[#5E5C55]">
        {expanded &&
          (loading
            ? "Đang tìm địa chỉ…"
            : !error
              ? items.length
                ? `Tìm thấy ${items.length} địa chỉ.`
                : "Không tìm thấy địa chỉ. Hãy thử nhập cụ thể hơn."
              : "")}
      </div>
      {expanded && !!items.length && (
        <ul
          id={`${id}-results`}
          role="listbox"
          aria-label="Địa chỉ gợi ý"
          className="overflow-hidden rounded-xl border border-[#E4E2DA] bg-white"
        >
          {items.map((place, index) => (
            <li
              key={`${place.lat}:${place.lng}:${index}`}
              id={`${id}-result-${index}`}
              role="option"
              aria-selected={index === active}
              onPointerDown={(event) => event.preventDefault()}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(place)}
              className={`flex min-h-14 cursor-pointer items-start gap-3 px-4 py-3 ${index === active ? "bg-[#F1F6F2]" : "hover:bg-[#FAF9F5]"}`}
            >
              <MapPin size={18} className="mt-1 shrink-0 text-[#2F5D44]" />
              <div className="min-w-0">
                <p className="font-semibold text-[#1A1A17]">{place.name}</p>
                <p className="text-sm text-[#5E5C55]">{place.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 text-sm text-red-700"
        >
          <span>{error}</span>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || loading}
            className="min-h-11"
            onClick={() => setRetry((count) => count + 1)}
          >
            Thử lại
          </Button>
        </div>
      )}
      <p className="text-xs text-[#5E5C55]">
        Dữ liệu địa chỉ © OpenStreetMap contributors · Photon
      </p>
    </div>
  );
}
