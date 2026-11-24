import { useState } from "react";
import { Button } from "@org/ui";
import { TicketVoidDialog } from "./ticket-void-dialog";
export function TicketCardAction({
  admin,
  onAction,
}: {
  admin: boolean;
  onAction: (requestOnly: boolean, reason: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={`min-h-9 shrink-0 rounded-lg px-3 text-xs shadow-none ${admin ? "border-red-200 bg-white text-red-700 hover:bg-red-50" : "border-[#d3dfd5] bg-white text-[#215e3d] hover:bg-[#eff4ee]"}`}
      >
        {admin ? "Hủy phiếu" : "Yêu cầu quản trị hủy"}
      </Button>
      <TicketVoidDialog
        open={open}
        onOpenChange={setOpen}
        admin={admin}
        onAction={onAction}
      />
    </>
  );
}
