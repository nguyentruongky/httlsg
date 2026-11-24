import { useId, useRef, useState } from "react";
import { Button, Dialog } from "@org/ui";
export function TicketVoidDialog({
  open,
  onOpenChange,
  admin,
  onAction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: boolean;
  onAction: (requestOnly: boolean, reason: string) => Promise<void>;
}) {
  const formId = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const changeOpen = (value: boolean) => {
    if (submitting.current) return;
    if (!value) {
      setReason("");
      setError("");
    }
    onOpenChange(value);
  };
  const submit = async () => {
    if (submitting.current) return;
    const text = reason.trim();
    if (!text) {
      setError("Vui lòng nhập lý do hủy phiếu.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await onAction(!admin, text);
      submitting.current = false;
      changeOpen(false);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Không thể gửi yêu cầu. Vui lòng thử lại.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={changeOpen}
      title={admin ? "Hủy phiếu" : "Yêu cầu quản trị hủy phiếu"}
      description={
        admin
          ? "Nhập lý do để hủy phiếu. Phiếu đã hủy không được tính vào kết quả."
          : "Nhập lý do để quản trị viên xem xét. Phiếu vẫn được giữ cho đến khi quản trị viên xác nhận hủy."
      }
      closeLabel="Đóng"
      footer={
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => changeOpen(false)}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={busy || !reason.trim()}
            className={
              admin
                ? "bg-red-700 text-white hover:bg-red-800"
                : "bg-[#215e3d] text-white hover:bg-[#19492f]"
            }
          >
            {busy ? "Đang gửi…" : admin ? "Xác nhận hủy" : "Gửi yêu cầu"}
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="space-y-3"
      >
        <label
          htmlFor={`${formId}-reason`}
          className="block text-sm font-medium"
        >
          Lý do hủy phiếu{" "}
          <span aria-hidden="true" className="text-red-700">
            *
          </span>
        </label>
        <textarea
          id={`${formId}-reason`}
          autoFocus
          required
          maxLength={2000}
          value={reason}
          disabled={busy}
          onChange={(event) => {
            setReason(event.target.value);
            setError("");
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${formId}-error` : undefined}
          placeholder="Nhập lý do yêu cầu hủy phiếu…"
          className="block min-h-32 w-full resize-y rounded-xl border border-[#e6e4dd] bg-[#f8f7f3] p-3 text-sm outline-none focus:border-[#215e3d] focus:ring-1 focus:ring-[#215e3d]"
        />
        {error && (
          <p
            id={`${formId}-error`}
            role="alert"
            className="text-sm text-red-700"
          >
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
