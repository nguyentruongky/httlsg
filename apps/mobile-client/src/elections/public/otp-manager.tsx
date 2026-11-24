import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, authenticatedFetch, createRequestId } from "@org/core";
import { Button, Input } from "@org/ui";
import { Download, Printer, RefreshCw } from "lucide-react";
import { downloadElectionFile } from "../local-election";
import { OtpCard, type ElectionOtp } from "./otp-card";
import { OtpPrintPreview } from "./otp-print-preview";

type OtpResponse = { items: ElectionOtp[]; electionName: string };
export function PublicOtpManager({ electionId }: { electionId: number }) {
  const [items, setItems] = useState<ElectionOtp[]>([]);
  const [electionName, setElectionName] = useState("");
  const [count, setCount] = useState("100");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const cachedPdf = useRef<Blob | null>(null);
  const documentUrl = useRef<string | null>(null);
  const pending = useRef<{ count: number; requestId: string } | null>(null);
  const path = `/api/elections/${electionId}/public-otps`;
  const filename = `E${electionId}_danh-sach-ma.pdf`;
  const accept = useCallback((value: OtpResponse) => {
    setItems(value.items);
    setElectionName(value.electionName);
    cachedPdf.current = null;
    if (documentUrl.current) URL.revokeObjectURL(documentUrl.current);
    documentUrl.current = null;
    setPreviewUrl(null);
    setPreviewOpen(false);
  }, []);
  useEffect(
    () => () => {
      if (documentUrl.current) URL.revokeObjectURL(documentUrl.current);
    },
    [],
  );
  useEffect(() => {
    let active = true;
    setLoading(true);
    void apiRequest<OtpResponse>(path)
      .then((value) => {
        if (active) accept(value);
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error ? error.message : "Không thể tải mã.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, accept]);
  const generate = async () => {
    if (busy) return;
    const quantity = Number(count);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      setError("Nhập số lượng từ 1 đến 1.000 mã.");
      return;
    }
    if (pending.current?.count !== quantity)
      pending.current = { count: quantity, requestId: createRequestId() };
    setBusy(true);
    setError("");
    try {
      accept(
        await apiRequest<OtpResponse>(path, {
          method: "POST",
          body: JSON.stringify(pending.current),
        }),
      );
      pending.current = null;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể tạo mã.");
    } finally {
      setBusy(false);
    }
  };
  const openDocument = async (preview: boolean) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (!cachedPdf.current) {
        const response = await authenticatedFetch(`${path}?download=1`);
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message ?? "Không thể tải danh sách mã.");
        }
        cachedPdf.current = await response.blob();
      }
      if (preview) {
        if (!documentUrl.current)
          documentUrl.current = URL.createObjectURL(cachedPdf.current);
        setPreviewUrl(documentUrl.current);
        setPreviewOpen(true);
      } else downloadElectionFile(cachedPdf.current, filename);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Không thể mở danh sách mã.",
      );
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      accept(await apiRequest<OtpResponse>(path));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể tải mã.");
    } finally {
      setBusy(false);
    }
  };
  const disabled = busy || loading;
  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">Danh sách mã OTP</h3>
        <p className="mt-1 text-sm leading-relaxed text-[#5e5c55]">
          Mỗi người nhận một mã riêng để tham gia bầu cử trực tuyến.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="space-y-2">
        <label htmlFor="otp-count" className="block text-sm font-medium">
          Số lượng mã mới
        </label>
        <div className="flex items-center gap-3">
          <Input
            id="otp-count"
            inputMode="numeric"
            value={count}
            disabled={disabled}
            onChange={(event) =>
              setCount(event.target.value.replace(/\D/g, ""))
            }
            aria-label="Số lượng OTP cần tạo"
            className="min-h-11 w-20 shrink-0 rounded-xl border-[#d9d7cf] bg-[#faf9f5] text-center sm:w-24"
          />
          <Button
            type="button"
            disabled={disabled}
            className="min-h-11 rounded-xl bg-[#215e3d] px-3 text-sm text-white sm:px-5"
            onClick={() => void generate()}
          >
            Tạo danh sách mã OTP
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <p role="status" className="text-sm text-[#5e5c55]">
            {loading
              ? "Đang tải mã…"
              : `${items.length} mã · ${items.filter((item) => item.usedAt).length} đã sử dụng`}
            {busy && " · Đang xử lý…"}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label="Cập nhật số mã đã sử dụng"
            onClick={() => void refresh()}
            className="min-h-11 min-w-11"
          >
            <RefreshCw size={16} />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || !items.length}
            onClick={() => void openDocument(false)}
            className="min-h-11 gap-2 rounded-xl"
          >
            <Download size={16} />
            Tải danh sách mã
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || !items.length}
            onClick={() => void openDocument(true)}
            className="min-h-11 gap-2 rounded-xl"
          >
            <Printer size={16} />
            Xem trước khi in
          </Button>
        </div>
      </div>
      {!!items.length && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 100).map((item) => (
            <OtpCard
              key={item.id}
              item={item}
              electionName={electionName || `Bầu cử #${electionId}`}
            />
          ))}
        </div>
      )}
      {items.length > 100 && (
        <p className="text-xs text-[#5e5c55]">
          Hiển thị 100 mã đầu. Tải danh sách mã hoặc xem trước khi in để xem
          toàn bộ.
        </p>
      )}
      {!loading && !items.length && (
        <p className="rounded-xl border border-dashed border-[#d9d7cf] p-6 text-center text-sm text-[#5e5c55]">
          Chưa có mã. Nhập số lượng và nhấn Tạo danh sách mã OTP.
        </p>
      )}
      <OtpPrintPreview
        url={previewUrl}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onDownload={() => {
          if (cachedPdf.current)
            downloadElectionFile(cachedPdf.current, filename);
        }}
      />
    </section>
  );
}
