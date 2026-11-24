import { useToast } from "@org/ui";

async function copyTicketId(value: string) {
  if (typeof navigator.clipboard?.writeText === "function") {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      /* Use the selection fallback when clipboard permissions deny access. */
    }
  }
  const focused = document.activeElement;
  const field = document.createElement("textarea");
  field.value = value;
  field.readOnly = true;
  field.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";
  document.body.append(field);
  try {
    field.focus();
    field.select();
    field.setSelectionRange(0, value.length);
    if (!document.execCommand("copy")) throw new Error("Clipboard unavailable");
  } finally {
    field.remove();
    if (focused instanceof HTMLElement) focused.focus({ preventScroll: true });
  }
}

export function TicketNumber({
  number,
  code,
  voided,
}: {
  number: number;
  code: string;
  voided: boolean;
}) {
  const { toast } = useToast();
  const copy = async () => {
    try {
      await copyTicketId(code);
      toast({ title: "Đã sao chép mã phiếu" });
    } catch {
      toast({
        title: "Không thể sao chép mã phiếu",
        description: "Vui lòng thử lại.",
      });
    }
  };
  return (
    <button
      type="button"
      onClick={() => void copy()}
      title="Nhấn để sao chép mã phiếu đầy đủ"
      aria-label={`Phiếu ${number}: sao chép mã phiếu đầy đủ`}
      className={`rounded-sm text-left text-base font-semibold leading-relaxed tabular-nums underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215e3d] ${voided ? "text-[#8a877d] line-through" : "text-[#1c1b18] hover:text-[#215e3d]"}`}
    >
      Phiếu {number}
    </button>
  );
}
