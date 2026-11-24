import { ExternalLink, Pencil } from "lucide-react";
import { Button } from "@org/ui";
import type { VenueState } from "./venue-state";
export function VenuePreview({
  value,
  saved,
  onEdit,
  disabled,
}: {
  value: VenueState;
  saved: boolean;
  onEdit?: () => void;
  disabled?: boolean;
}) {
  const coordinates = `${Number(value.lat)},${Number(value.lng)}`;
  const embedParams = new URLSearchParams({
    q: coordinates,
    z: "16",
    hl: "vi",
    output: "embed",
  });
  const mapParams = new URLSearchParams({ api: "1", query: coordinates });
  return (
    <div className="overflow-hidden rounded-2xl border border-[#D5E3DA] bg-[#F1F6F2]">
      <iframe
        title="Bản đồ Google Maps của địa điểm bầu cử"
        src={`https://maps.google.com/maps?${embedParams}`}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="block h-60 w-full border-0 bg-[#e6eee8] sm:h-72"
      />
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#2F5D44]">
              Đã chọn địa điểm
            </span>
            {saved && (
              <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-[#2F5D44]">
                Đã lưu
              </span>
            )}
          </div>
          <p className="mt-1 text-sm tabular-nums text-[#2F5D44]">
            {Number(value.lat).toFixed(6)}, {Number(value.lng).toFixed(6)}
          </p>
          {value.address && (
            <p className="mt-2 wrap-break-word text-sm leading-relaxed text-[#5E5C55]">
              {value.address}
            </p>
          )}
        </div>
        {onEdit && (
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={onEdit}
            className="min-h-11 w-full shrink-0 gap-2 rounded-xl border-[#D9D7CF] bg-white sm:w-auto"
          >
            <Pencil size={16} />
            Chỉnh sửa
          </Button>
        )}
      </div>
    </div>
  );
}
