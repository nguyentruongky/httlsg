"use client";
import React, { useState } from "react";
import { Button } from "./button";
import { useToast } from "./toast";
export interface WorshipNotificationPanelProps {
  missingFields: readonly { label: string }[];
  message: string;
  viberLink: string;
  loadMessage?: () => Promise<string>;
  onOpen?: () => void;
}
export function WorshipMissingInformation({
  missingFields,
}: {
  missingFields: readonly { label: string }[];
}) {
  const complete = missingFields.length === 0;
  return (
    <>
      {complete ? (
        <p className="text-sm text-primary">
          Chương trình thờ phượng đã có đầy đủ thông tin. Không cần gửi yêu cầu
          bổ sung.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Thông tin còn thiếu:</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {missingFields.map((field) => (
              <li key={field.label}>• {field.label}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
/** Phone handoff only; the event editor renders WorshipMissingInformation alone. */
export function WorshipNotificationPanel({
  missingFields,
  message,
  viberLink,
  loadMessage,
  onOpen,
}: WorshipNotificationPanelProps) {
  const [copyFallback, setCopyFallback] = useState(false);
  const [copyValue, setCopyValue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  async function writeClipboard(value: string) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch {
        /* Try the LAN HTTP fallback. */
      }
    }
    // Legacy copy works on some HTTP LAN browsers; never claim success on false.
    const input = document.createElement("textarea");
    input.value = value;
    input.readOnly = true;
    input.style.cssText =
      "position:fixed;top:0;left:0;opacity:0;font-size:16px";
    const previous = document.activeElement as HTMLElement | null;
    document.body.append(input);
    try {
      input.focus();
      input.select();
      input.setSelectionRange(0, value.length);
      if (!document.execCommand?.("copy"))
        throw new Error("Clipboard unavailable");
    } finally {
      input.remove();
      previous?.focus();
    }
  }
  async function copy() {
    if (busy) return;
    setBusy(true);
    setCopied(false);
    let value: string;
    try {
      value = loadMessage ? await loadMessage() : message;
      setCopyValue(value);
    } catch {
      toast({
        title: "Không thể tải nội dung mới nhất. Vui lòng thử lại.",
        variant: "error",
      });
      setBusy(false);
      return;
    }
    try {
      await writeClipboard(value);
      setCopyFallback(false);
      setCopied(true);
      toast({
        title: "Đã sao chép toàn bộ nội dung",
        variant: "success",
      });
    } catch {
      setCopyFallback(true);
      toast({
        title:
          "Không thể tự động sao chép. Hãy chọn và sao chép nội dung bên dưới trước khi mở Viber.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label="Bản nháp trên điện thoại"
      className="space-y-3 rounded-xl border p-4"
    >
      <WorshipMissingInformation missingFields={missingFields} />
      <div className="flex flex-wrap gap-2">
        <Button asChild className="h-auto min-h-11">
          <a href={viberLink} onClick={onOpen}>
            Mở Viber để gửi yêu cầu
          </a>
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void copy()}
          className="h-auto min-h-11"
        >
          Sao chép nội dung
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Liên kết mở số +84397092176 với toàn bộ nội dung bản nháp. Kiểm tra nội
        dung trong Viber trước khi gửi. Nếu thiết bị không điền đủ, hãy dùng Sao
        chép nội dung để dán thủ công. Không có tin nhắn nào được gửi tự động.
      </p>
      {copied && (
        <p role="status">
          Nội dung đã được sao chép. Vui lòng dán vào cuộc trò chuyện Viber và
          gửi.
        </p>
      )}
      {copyFallback && (
        <label className="block text-sm">
          Nội dung để sao chép
          <textarea
            aria-label="Nội dung để sao chép"
            className="mt-2 min-h-48 w-full rounded-lg border bg-background p-3"
            readOnly
            value={copyValue ?? message}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
      )}
    </section>
  );
}
