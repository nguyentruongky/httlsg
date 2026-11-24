import { useEffect, useRef, useState } from "react";
import { Button, Dialog, Input } from "@org/ui";
import { LocateFixed } from "lucide-react";
import {
  apiRequest,
  PUBLIC_DEFAULT_RADIUS_METERS,
  PUBLIC_DEFAULT_ACCURACY_METERS,
} from "@org/core";
import { currentElectionLocation } from "./location";
import { VenueAddressSearch } from "./venue-address-search";
import { VenuePreview } from "./venue-preview";
import { VenueRadius } from "./venue-radius";
import {
  validVenueCoordinates,
  validVenueRadius,
  venueDirty,
  type VenuePlace,
  type VenueState,
} from "./venue-state";

export type PublicSessionConfig = {
  id: string;
  enabled: boolean;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  maximumAccuracyMeters: number;
  version: number;
  voteCount: number;
};
export type PublicLocationSettings = {
  enabled: boolean;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  maximumAccuracyMeters: number;
  version: number;
};
const fromConfig = (config: PublicSessionConfig | null): VenueState => ({
  lat: config ? String(config.latitude) : "",
  lng: config ? String(config.longitude) : "",
  address: "",
  radiusM: String(config?.radiusMeters ?? PUBLIC_DEFAULT_RADIUS_METERS),
});
export function LocationSettingsForm({
  config,
  onSave,
  busy,
}: {
  config: PublicSessionConfig | null;
  onSave: (value: PublicLocationSettings) => Promise<boolean | void>;
  busy: boolean;
}) {
  const initial = fromConfig(config);
  const [form, setForm] = useState<VenueState>(initial);
  const [savedLocation, setSavedLocation] = useState<VenueState | null>(() =>
    validVenueCoordinates(initial) ? initial : null,
  );
  const [mode, setMode] = useState<"view" | "edit">(() =>
    validVenueCoordinates(initial) ? "view" : "edit",
  );
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState("");
  const work = useRef(0);
  useEffect(() => {
    const next = fromConfig(config);
    setForm((previous) => ({
      ...next,
      address:
        previous.lat === next.lat && previous.lng === next.lng
          ? previous.address
          : "",
    }));
    setSavedLocation((previous) =>
      validVenueCoordinates(next)
        ? {
            ...next,
            address:
              previous?.lat === next.lat && previous?.lng === next.lng
                ? previous.address
                : "",
          }
        : null,
    );
    setMode(validVenueCoordinates(next) ? "view" : "edit");
    setError("");
    setLocating(false);
    work.current++;
  }, [
    config?.id,
    config?.version,
    config?.latitude,
    config?.longitude,
    config?.radiusMeters,
  ]);
  useEffect(
    () => () => {
      work.current++;
    },
    [],
  );
  // Existing storage holds coordinates only. Resolve a display address when available.
  useEffect(() => {
    if (!savedLocation || savedLocation.address) return;
    const controller = new AbortController();
    const { lat, lng } = savedLocation;
    void apiRequest<{ items: VenuePlace[] }>(
      `/api/election-geocoding?lat=${lat}&lng=${lng}`,
      { signal: controller.signal },
    )
      .then((result) => {
        const address = result.items[0]?.address;
        if (!address || controller.signal.aborted) return;
        setSavedLocation((previous) =>
          previous?.lat === lat && previous.lng === lng
            ? { ...previous, address }
            : previous,
        );
        setForm((previous) =>
          previous.lat === lat && previous.lng === lng && !previous.address
            ? { ...previous, address }
            : previous,
        );
      })
      .catch(() => {});
    return () => controller.abort();
  }, [savedLocation?.lat, savedLocation?.lng]);
  const valid = validVenueCoordinates(form);
  const dirty = venueDirty(form, savedLocation);
  const disabled = busy || saving || locating;
  const cancel = () => {
    if (savedLocation) {
      work.current++;
      setForm({ ...savedLocation });
      setMode("view");
      setError("");
      setConfirmCancel(false);
    }
  };
  const locate = async () => {
    const operation = ++work.current;
    setLocating(true);
    setError("");
    try {
      const point = await currentElectionLocation();
      if (operation !== work.current) return;
      const lat = String(point.coords.latitude),
        lng = String(point.coords.longitude);
      setForm((previous) => ({ ...previous, lat, lng, address: "" }));
      try {
        const result = await apiRequest<{ items: VenuePlace[] }>(
          `/api/election-geocoding?lat=${lat}&lng=${lng}`,
        );
        if (operation === work.current && result.items[0])
          setForm((previous) => ({
            ...previous,
            address: result.items[0].address,
          }));
      } catch {
        /* Coordinates remain usable if reverse lookup is unavailable. */
      }
    } catch {
      if (operation === work.current)
        setError(
          "Không thể lấy vị trí. Hãy cho phép truy cập vị trí hoặc nhập địa chỉ.",
        );
    } finally {
      if (operation === work.current) setLocating(false);
    }
  };
  const save = async () => {
    if (
      disabled ||
      !valid ||
      !validVenueRadius(form.radiusM) ||
      (mode === "view" && !dirty)
    )
      return;
    const accuracy =
      config?.maximumAccuracyMeters ?? PUBLIC_DEFAULT_ACCURACY_METERS;
    if (Number(form.radiusM) < accuracy) {
      setError(
        `Khoảng cách cho phép cần từ ${accuracy} m trở lên để phù hợp với độ chính xác vị trí hiện tại.`,
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await onSave({
        enabled: true,
        latitude: Number(form.lat),
        longitude: Number(form.lng),
        radiusMeters: Number(form.radiusM),
        maximumAccuracyMeters: accuracy,
        version: config?.version ?? 0,
      });
      if (result !== false) {
        setSavedLocation({ ...form });
        setMode("view");
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Không thể lưu địa điểm. Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <form
      className="space-y-5 text-[#1A1A17]"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div>
        <h3 className="text-lg font-semibold">
          {mode === "view" ? "Nơi tổ chức bầu cử" : "Chọn nơi tổ chức"}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-[#5E5C55]">
          {mode === "view"
            ? "Người tham gia cần ở gần địa điểm này để điểm danh."
            : "Tìm theo địa chỉ, hoặc dùng vị trí hiện tại nếu bạn đang đứng tại nơi tổ chức."}
        </p>
      </div>
      {mode === "view" ? (
        <VenuePreview
          value={form}
          saved
          onEdit={() => {
            setMode("edit");
            setError("");
          }}
          disabled={disabled}
        />
      ) : (
        <>
          <VenueAddressSearch
            value={form.address}
            selected={valid}
            disabled={disabled}
            onChange={(address) => {
              work.current++;
              setForm((previous) => ({
                ...previous,
                lat: "",
                lng: "",
                address,
              }));
            }}
            onSelect={(place) => {
              work.current++;
              setForm((previous) => ({
                ...previous,
                lat: String(place.lat),
                lng: String(place.lng),
                address: place.address,
              }));
              setError("");
            }}
          />
          {valid && <VenuePreview value={form} saved={false} />}
          <div className="flex items-center gap-3 text-sm text-[#5E5C55]">
            <span className="h-px flex-1 bg-[#E4E2DA]" />
            hoặc
            <span className="h-px flex-1 bg-[#E4E2DA]" />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => void locate()}
            className="min-h-11 w-full gap-2 rounded-xl border-[#D9D7CF] bg-white"
          >
            <LocateFixed size={18} />
            {locating ? "Đang lấy vị trí…" : "Dùng vị trí hiện tại"}
          </Button>
          <details className="rounded-xl border border-[#E4E2DA] p-4">
            <summary className="min-h-11 cursor-pointer py-2 text-sm text-[#5E5C55]">
              Nhập tọa độ thủ công
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                Vĩ độ
                <Input
                  aria-label="Vĩ độ"
                  inputMode="decimal"
                  disabled={disabled}
                  value={form.lat}
                  onChange={(event) => {
                    work.current++;
                    setForm((previous) => ({
                      ...previous,
                      lat: event.target.value,
                      address: "",
                    }));
                  }}
                  className="min-h-11 rounded-xl border-[#D9D7CF] bg-[#FAF9F5]"
                />
              </label>
              <label className="space-y-2 text-sm">
                Kinh độ
                <Input
                  aria-label="Kinh độ"
                  inputMode="decimal"
                  disabled={disabled}
                  value={form.lng}
                  onChange={(event) => {
                    work.current++;
                    setForm((previous) => ({
                      ...previous,
                      lng: event.target.value,
                      address: "",
                    }));
                  }}
                  className="min-h-11 rounded-xl border-[#D9D7CF] bg-[#FAF9F5]"
                />
              </label>
            </div>
            <div className="mt-4 space-y-2 text-sm leading-relaxed text-[#5E5C55]">
              <p className="font-medium text-[#1A1A17]">
                Cách lấy tọa độ từ Google Maps
              </p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  Mở{" "}
                  <a
                    href="https://www.google.com/maps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#2F5D44] underline underline-offset-2"
                  >
                    Google Maps
                  </a>, nhập tên hoặc địa chỉ nơi tổ chức vào ô tìm kiếm, rồi nhấn
                  Enter hoặc nút tìm kiếm.
                </li>
                <li>
                  Chọn đúng địa điểm trong danh sách kết quả. Google Maps sẽ đưa
                  bản đồ đến vị trí đó và hiển thị ghim. Kiểm tra tên, địa chỉ
                  và vị trí ghim có đúng nơi tổ chức không.
                </li>
                <li>
                  <strong>Trên máy tính:</strong> nhấp chuột phải vào vị trí vừa
                  tìm thấy trên bản đồ. Dòng đầu tiên của menu là hai số tọa độ,
                  ví dụ 10.732654, 106.650324. Nhấp vào dòng này để sao chép.
                </li>
                <li>
                  <strong>Trên điện thoại:</strong> nhấn giữ vị trí nơi tổ chức
                  trên bản đồ để thả ghim. Với Android, xem tọa độ trong ô tìm
                  kiếm phía trên. Với iPhone, mở bảng thông tin của ghim để xem
                  tọa độ.
                </li>
                <li>
                  Nhập số thứ nhất vào ô <strong>Vĩ độ</strong>, số thứ hai vào
                  ô <strong>Kinh độ</strong>. Ví dụ:{" "}
                  <span className="tabular-nums">10.732654, 106.650324</span>{" "}
                  thì vĩ độ là <span className="tabular-nums">10.732654</span>,
                  kinh độ là <span className="tabular-nums">106.650324</span>.
                </li>
              </ol>
            </div>
          </details>
          {(form.lat || form.lng) && !valid && (
            <p role="status" className="text-sm text-red-700">
              Tọa độ chưa hợp lệ. Kiểm tra vĩ độ và kinh độ.
            </p>
          )}
        </>
      )}
      <VenueRadius
        value={form.radiusM}
        onChange={(radiusM) =>
          setForm((previous) => ({ ...previous, radiusM }))
        }
        disabled={disabled}
      />
      {!validVenueRadius(form.radiusM) && (
        <p role="status" className="text-sm text-red-700">
          Khoảng cách cần là số nguyên từ 20 đến 10.000 m.
        </p>
      )}
      {error && (
        <p role="alert" aria-live="polite" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        {mode === "edit" && savedLocation && (
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="min-h-11 rounded-xl"
            onClick={() => (dirty ? setConfirmCancel(true) : cancel())}
          >
            Hủy
          </Button>
        )}
        <Button
          type="submit"
          disabled={
            disabled ||
            !valid ||
            !validVenueRadius(form.radiusM) ||
            (mode === "view" && !dirty)
          }
          className="min-h-11 rounded-xl bg-[#2F5D44] px-6 text-white hover:bg-[#244a36]"
        >
          {saving || busy
            ? "Đang lưu…"
            : mode === "edit"
              ? "Lưu địa điểm"
              : dirty
                ? "Lưu thay đổi"
                : "Đã lưu"}
        </Button>
      </div>
      <Dialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Bỏ thay đổi địa điểm?"
        description="Địa điểm bạn vừa chọn chưa được lưu."
        closeLabel="Tiếp tục chỉnh sửa"
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmCancel(false)}
              className="min-h-11"
            >
              Tiếp tục chỉnh sửa
            </Button>
            <Button
              type="button"
              onClick={cancel}
              className="min-h-11 bg-[#2F5D44] text-white"
            >
              Bỏ thay đổi
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[#5E5C55]">
          Bạn muốn quay lại địa điểm đã lưu?
        </p>
      </Dialog>
    </form>
  );
}
