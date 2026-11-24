import { useRef, useState } from "react";
import { Button, Dialog } from "@org/ui";
import { Download, Printer, ExternalLink } from "lucide-react";
export function OtpPrintPreview({
  url,
  open,
  onClose,
  onDownload,
}: {
  url: string | null;
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onClose();
          setReady(false);
          setError("");
        }
      }}
      title="Xem trước bản in danh sách mã"
      description="Khổ A4 · 8 thẻ mã mỗi trang. Đây là nội dung của tệp PDF tải xuống."
      closeLabel="Đóng"
      className="max-w-5xl"
      fullScreenOnMobile
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onDownload}
            className="min-h-11 gap-2"
          >
            <Download size={16} />
            Tải danh sách mã
          </Button>
          <Button
            type="button"
            disabled={!ready}
            className="min-h-11 gap-2 bg-[#215e3d] text-white"
            onClick={() => {
              try {
                const target = frame.current?.contentWindow;
                if (!target) throw new Error();
                target.focus();
                target.print();
              } catch {
                setError(
                  "Trình duyệt chưa hỗ trợ in trong khung. Hãy chọn Mở bản in để in ở cửa sổ riêng.",
                );
              }
            }}
          >
            <Printer size={16} />
            In danh sách mã
          </Button>
        </div>
      }
      scrollableBody
    >
      {url && (
        <>
          <iframe
            ref={frame}
            src={url}
            onLoad={() => setReady(true)}
            title="Bản in thẻ mã OTP"
            className="h-[65dvh] min-h-80 w-full rounded-xl border border-[#e6e4dd] bg-stone-100"
          />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#215e3d] underline"
          >
            <ExternalLink size={16} />
            Mở bản in trong cửa sổ riêng
          </a>
        </>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </Dialog>
  );
}
