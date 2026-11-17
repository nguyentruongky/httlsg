import { flushSync } from "react-dom";
import { Button, Dialog, ErrorMessage, Input } from "@org/ui";
import { ChurchStatusSchema } from "@org/core";
import { AnimatedSheetContent } from "../animated-sheet-content";
import type {
  DepartmentMember as Person,
  DepartmentBulkMutation,
} from "./types";
export function ChangeDepartmentStatusDialog({
  department,
  selected,
  busy,
  bulk,
  setChangingStatus,
  transferDestination,
  setTransferDestination,
}: {
  department: { id: string; name: string };
  selected: Person[];
  busy: boolean;
  bulk: DepartmentBulkMutation;
  setChangingStatus: (open: boolean) => void;
  transferDestination: string | null;
  setTransferDestination: (value: string) => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) setChangingStatus(false);
      }}
      bottomSheet
      className="member-status-sheet"
      title="Cập nhật trạng thái"
      closeLabel="Đóng tình trạng"
      description={`Cập nhật cho ${selected.length} thành viên đã chọn.`}
    >
      <AnimatedSheetContent>
        <div className="space-y-4">
          <fieldset disabled={busy} className="space-y-2">
            <legend className="sr-only">Tình trạng mới</legend>
            {ChurchStatusSchema.options.map((value) => (
              <label
                key={value}
                className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2 text-sm"
              >
                <input
                  type="radio"
                  name={`bulk-status-${department.id}`}
                  value={value}
                  checked={
                    transferDestination !== null && value === "Chuyển hội"
                  }
                  onChange={() => {
                    if (busy) return;
                    if (value === "Chuyển hội") {
                      setTransferDestination("");
                      return;
                    }
                    flushSync(() => setChangingStatus(false));
                    bulk.mutate({ action: "status", status: value });
                  }}
                  className="size-5 accent-primary"
                />
                {value}
              </label>
            ))}
          </fieldset>
          {transferDestination !== null && (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (busy) return;
                flushSync(() => setChangingStatus(false));
                bulk.mutate({
                  action: "status",
                  status: "Chuyển hội",
                  destination: transferDestination,
                });
              }}
            >
              <label className="block text-sm">
                Điểm đến chuyển hội (không bắt buộc)
                <Input
                  autoFocus
                  className="mt-2"
                  maxLength={200}
                  value={transferDestination}
                  onChange={(event) =>
                    setTransferDestination(event.target.value)
                  }
                  placeholder="Nhập Hội Thánh hoặc địa điểm chuyển đến"
                />
              </label>
              <Button type="submit" disabled={busy}>
                Lưu
              </Button>
            </form>
          )}
        </div>
        {bulk.error && <ErrorMessage error={bulk.error} />}
      </AnimatedSheetContent>
    </Dialog>
  );
}
