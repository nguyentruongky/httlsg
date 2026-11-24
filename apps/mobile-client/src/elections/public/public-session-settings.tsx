import { LoadingView } from "@org/ui";
import { useEffect, useState } from "react";
import { apiRequest } from "@org/core";
import { Button, cn, useToast } from "@org/ui";
import { MapPin, KeyRound } from "lucide-react";
import { PublicOtpManager } from "./otp-manager";
import {
  LocationSettingsForm,
  type PublicLocationSettings,
  type PublicSessionConfig,
} from "./location-settings-form";

type SettingsResponse = {
  onlineVotingEnabled: boolean;
  session: PublicSessionConfig | null;
};
export function PublicSessionSettings({ electionId }: { electionId: number }) {
  const { toast } = useToast();
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"location" | "otp">("location");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const path = `/api/elections/${electionId}/public-session`;
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void apiRequest<SettingsResponse>(path)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error ? error.message : "Không thể tải cài đặt.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, retry]);
  const toggle = async () => {
    if (!data || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const value = await apiRequest<SettingsResponse>(path, {
        method: "POST",
        body: JSON.stringify({
          action: "toggle",
          enabled: !data.onlineVotingEnabled,
          previous: data.onlineVotingEnabled,
        }),
      });
      setData(value);
      setMessage(
        value.onlineVotingEnabled
          ? "Đã bật bầu cử trực tuyến."
          : "Đã tắt bầu cử trực tuyến.",
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Không thể thay đổi cài đặt.",
      );
    } finally {
      setBusy(false);
    }
  };
  const saveLocation = async (settings: PublicLocationSettings) => {
    if (busy) return false;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setData(
        await apiRequest<SettingsResponse>(path, {
          method: "POST",
          body: JSON.stringify(settings),
        }),
      );
      setMessage(
        "Đã lưu địa điểm. Bạn có thể sang OTP để tạo mã cho người tham gia.",
      );
      toast({ title: "Đã lưu địa điểm." });
      return true;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Không thể lưu địa điểm.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <LoadingView message="Đang tải cài đặt…" />
    );
  return (
    <section className="space-y-5" aria-label="Cài đặt bầu cử trực tuyến">
      <div className="flex items-center justify-between gap-5 rounded-2xl border-2 border-[#cfd2c9] bg-white p-5 sm:p-6">
        <div>
          <h2 id="online-voting-label" className="text-lg font-semibold">
            Cho phép bầu cử trực tuyến
          </h2>
          <p
            id="online-voting-description"
            className="mt-1 text-sm text-[#6b6963]"
          >
            {data?.onlineVotingEnabled
              ? "Người tham gia dùng mã OTP để bỏ phiếu trên điện thoại."
              : "Đang tắt. Chỉ nhận phiếu do kiểm phiếu viên nhập."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm font-medium">
            {data?.onlineVotingEnabled ? "Bật" : "Tắt"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(data?.onlineVotingEnabled)}
            aria-labelledby="online-voting-label"
            aria-describedby="online-voting-description"
            disabled={!data || busy}
            onClick={() => void toggle()}
            className={cn(
              "relative h-8 w-14 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215e3d] focus-visible:ring-offset-2 disabled:opacity-50",
              data?.onlineVotingEnabled ? "bg-[#215e3d]" : "bg-stone-300",
            )}
          >
            <span
              className={cn(
                "absolute top-1 size-6 rounded-full bg-white transition-transform",
                data?.onlineVotingEnabled ? "left-1 translate-x-6" : "left-1",
              )}
            />
          </button>
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => setRetry((value) => value + 1)}
            className="ml-2"
          >
            Tải lại
          </Button>
        </div>
      )}
      {message && (
        <p role="status" className="text-sm text-[#215e3d]">
          {message}
        </p>
      )}
      {data?.onlineVotingEnabled && (
        <div className="rounded-2xl border-2 border-[#cfd2c9] bg-white">
          <div
            role="tablist"
            aria-label="Thiết lập bầu cử trực tuyến"
            className="flex gap-1 border-b border-[#e6e4dd] p-2"
          >
            {(
              [
                { id: "location", label: "Địa điểm", icon: MapPin },
                { id: "otp", label: "OTP", icon: KeyRound },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                id={`online-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                aria-controls={`online-panel-${item.id}`}
                tabIndex={tab === item.id ? 0 : -1}
                onKeyDown={(event) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? "location"
                      : event.key === "End"
                        ? "otp"
                        : tab === "location"
                          ? "otp"
                          : "location";
                  setTab(next);
                  document.getElementById(`online-tab-${next}`)?.focus();
                }}
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors",
                  tab === item.id
                    ? "bg-[#edf4ed] text-[#215e3d]"
                    : "text-[#6b6963] hover:bg-stone-50",
                )}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </div>
          <div className="p-5 sm:p-6">
            <div
              role="tabpanel"
              id="online-panel-location"
              aria-labelledby="online-tab-location"
              hidden={tab !== "location"}
            >
              <LocationSettingsForm
                config={data.session}
                onSave={saveLocation}
                busy={busy}
              />
            </div>
            <div
              role="tabpanel"
              id="online-panel-otp"
              aria-labelledby="online-tab-otp"
              hidden={tab !== "otp"}
            >
              {data.session ? (
                <PublicOtpManager electionId={electionId} />
              ) : (
                <div className="space-y-3 py-5">
                  <p className="text-sm text-[#6b6963]">
                    Chọn và lưu địa điểm trước, sau đó bạn có thể tạo mã OTP.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTab("location")}
                  >
                    Chọn địa điểm
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
