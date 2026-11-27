import { useState } from "react";
import { Copy, Share } from "lucide-react";
import { Button, Dialog, Input, useToast } from "@org/ui";

export function ProfileShareButton({
  memberId,
  name,
  className,
}: {
  memberId: string;
  name?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const url = new URL(
    `/client/members/${encodeURIComponent(memberId)}`,
    window.location.origin,
  ).href;
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: name ? `Hồ sơ của ${name}` : "Hồ sơ thành viên",
          url,
        });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    setOpen(true);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Đã sao chép liên kết hồ sơ", variant: "success" });
      setOpen(false);
    } catch {
      toast({
        title: "Không thể sao chép. Vui lòng chọn và sao chép liên kết.",
        variant: "error",
      });
    }
  }
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={className}
        aria-label="Chia sẻ hồ sơ"
        onClick={() => void share()}
      >
        <Share size={20} aria-hidden="true" />
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        bottomSheet
        title="Chia sẻ hồ sơ"
        description={name ?? "Liên kết hồ sơ thành viên"}
        closeLabel="Đóng chia sẻ"
      >
        <div className="space-y-3">
          <Input
            aria-label="Liên kết hồ sơ"
            value={url}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button type="button" onClick={() => void copy()}>
            <Copy size={16} aria-hidden="true" />
            Sao chép liên kết
          </Button>
        </div>
      </Dialog>
    </>
  );
}
