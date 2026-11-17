import { Button, Dialog, ErrorMessage } from "@org/ui";
import type {
  DepartmentMember as Person,
  DepartmentBulkMutation,
} from "./types";
export function RemoveDepartmentMembersDialog({
  department,
  selected,
  busy,
  bulk,
  setConfirmRemove,
}: {
  department: { id: string; name: string };
  selected: Person[];
  busy: boolean;
  bulk: DepartmentBulkMutation;
  setConfirmRemove: (open: boolean) => void;
}) {
  return (
    <Dialog
      open
      title="Xóa thành viên khỏi Ban ngành?"
      description={`Bạn có chắc muốn gỡ ${selected.length} thành viên đã chọn khỏi ${department.name}? Hồ sơ thành viên vẫn được giữ lại.`}
      closeLabel="Hủy xóa khỏi Ban ngành"
      onOpenChange={(open) => {
        if (!open && !busy) setConfirmRemove(false);
      }}
    >
      {bulk.error && <ErrorMessage error={bulk.error} />}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          autoFocus
          disabled={busy}
          onClick={() => setConfirmRemove(false)}
        >
          Hủy
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={busy || !selected.length}
          onClick={() => bulk.mutate("remove")}
        >
          {bulk.isPending ? "Đang xóa…" : "Xác nhận xóa khỏi Ban ngành"}
        </Button>
      </div>
    </Dialog>
  );
}
