import { useEffect, useRef, useState } from "react";
import { Button } from "@org/ui";
import { Camera, CameraOff } from "lucide-react";
export function PublicQrScanner({
  onScan,
  disabled,
}: {
  onScan: (value: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const scan = useRef(onScan);
  scan.current = onScan;
  useEffect(() => {
    if (!open) return;
    let active = true;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      active = false;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      if (video.current) video.current.srcObject = null;
    };
    const hide = () => {
      if (document.hidden) {
        stop();
        setOpen(false);
      }
    };
    document.addEventListener("visibilitychange", hide);
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error(
            "Camera cần kết nối HTTPS và trình duyệt hỗ trợ. Bạn có thể nhập PIN để tham gia.",
          );
        const decoder = await import("jsqr");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const element = video.current;
        if (!element) return;
        element.srcObject = stream;
        await element.play();
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context)
          throw new Error("Không thể đọc hình ảnh camera. Vui lòng nhập PIN.");
        const read = () => {
          if (!active) return;
          if (element.readyState >= 2 && element.videoWidth) {
            const scale = Math.min(1, 640 / element.videoWidth);
            canvas.width = Math.round(element.videoWidth * scale);
            canvas.height = Math.round(element.videoHeight * scale);
            context.drawImage(element, 0, 0, canvas.width, canvas.height);
            const pixels = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height,
            );
            const code = decoder.default(
              pixels.data,
              canvas.width,
              canvas.height,
              { inversionAttempts: "dontInvert" },
            );
            if (code) {
              stop();
              setOpen(false);
              scan.current(code.data);
              return;
            }
          }
          timer = setTimeout(read, 200);
        };
        read();
      } catch (error) {
        stop();
        setOpen(false);
        setError(
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "Bạn chưa cho phép dùng camera. Hãy cấp quyền hoặc nhập mã PIN."
            : error instanceof Error
              ? error.message
              : "Không thể mở camera. Vui lòng nhập PIN.",
        );
      }
    };
    void start();
    return () => {
      stop();
      document.removeEventListener("visibilitychange", hide);
    };
  }, [open]);
  return (
    <div className="space-y-3">
      {open ? (
        <>
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            aria-label="Camera quét mã QR"
            className="aspect-square w-full rounded-2xl bg-stone-950 object-cover"
          />
          <p role="status" className="text-center text-sm text-stone-600">
            Đưa mã QR vào giữa khung hình.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setOpen(false)}
          >
            <CameraOff size={18} />
            Tắt camera
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="min-h-12 w-full gap-2 rounded-xl border-[#d7dfd4] bg-white text-[#215e3d]"
          onClick={() => {
            setError("");
            setOpen(true);
          }}
        >
          <Camera size={20} />
          Quét mã QR
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
