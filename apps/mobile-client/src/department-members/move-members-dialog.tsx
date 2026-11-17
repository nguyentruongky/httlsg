import { flushSync } from "react-dom";
import { Dialog, ErrorMessage } from "@org/ui";
import { departments } from "@org/core";
import type { DepartmentBulkMutation } from "./types";
export function MoveDepartmentMembersDialog({
  department,
  busy,
  bulk,
  setMoving,
  mobile,
}: {
  department: { id: string; name: string };
  busy: boolean;
  bulk: DepartmentBulkMutation;
  setMoving: (open: boolean) => void;
  mobile: boolean;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) setMoving(false);
      }}
      title="Chuyển ban hát"
      bottomSheet={mobile}
      className={mobile ? "member-status-sheet" : undefined}
      closeLabel="Đóng chuyển Ban ngành"
      description="Chọn ban hát mới cho các thành viên đã chọn."
    >
      <fieldset disabled={busy} className="space-y-2">
        <legend className="sr-only">Chuyển sang Ban hát</legend>
        {departments
          .filter(
            (item) =>
              item.departmentType === "choir" && item.id !== department.id,
          )
          .map((item) => (
            <label
              key={item.id}
              className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2 text-sm"
            >
              <input
                type="radio"
                name={`move-department-${department.id}`}
                value={item.id}
                checked={false}
                className="size-5 accent-primary"
                onChange={() => {
                  if (busy) return;
                  flushSync(() => setMoving(false));
                  bulk.mutate({
                    action: "move",
                    targetDepartmentId: item.id,
                  });
                }}
              />
              {item.name}
            </label>
          ))}
      </fieldset>
      {bulk.error && <ErrorMessage error={bulk.error} />}
    </Dialog>
  );
}
