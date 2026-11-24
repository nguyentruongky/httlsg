import { Input, cn } from "@org/ui";
export function VenueRadius({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <label htmlFor="venue-radius" className="block text-sm font-semibold">
        Khoảng cách cho phép
      </label>
      <div className="flex flex-wrap gap-2">
        {[500, 1000, 1500, 2000].map((radius) => (
          <button
            key={radius}
            type="button"
            disabled={disabled}
            aria-pressed={Number(value) === radius}
            onClick={() => onChange(String(radius))}
            className={cn(
              "min-h-11 rounded-xl border-2 px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D44] focus-visible:ring-offset-2",
              Number(value) === radius
                ? "border-[#2F5D44] bg-[#F1F6F2] text-[#2F5D44]"
                : "border-[#E4E2DA] bg-white text-[#5E5C55]",
            )}
          >
            {radius} m
          </button>
        ))}
        <div className="relative w-28">
          <Input
            id="venue-radius"
            aria-label="Khoảng cách tùy chỉnh"
            inputMode="numeric"
            value={value}
            disabled={disabled}
            onChange={(event) =>
              onChange(event.target.value.replace(/\D/g, ""))
            }
            className="min-h-11 rounded-xl border-[#D9D7CF] bg-[#FAF9F5] pr-8"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#5E5C55]">
            m
          </span>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-[#5E5C55]">
        Người tham gia cần ở trong khoảng cách này tính từ địa điểm đã chọn.
      </p>
    </div>
  );
}
