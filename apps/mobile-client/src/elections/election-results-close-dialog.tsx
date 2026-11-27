import { Dialog, Button } from "@org/ui";

interface ElectionResultsCloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  round: any;
  electionName: string;
  submitting: boolean;
  onClose: () => void;
  closeError: string;
  progress: any[];
}

export function ElectionResultsCloseDialog({
  open,
  onOpenChange,
  round,
  electionName,
  submitting,
  onClose,
  closeError,
  progress,
}: ElectionResultsCloseDialogProps) {
  return (
    <Dialog
      open={open && round.status === "checking"}
      onOpenChange={(open) => {
        if (!submitting) onOpenChange(open);
      }}
      title="Xác nhận kết thúc cuộc bầu cử"
      description="Sau khi kết thúc, cuộc bầu cử này sẽ ngừng nhận phiếu và bạn có thể xuất kết quả Excel."
      closeLabel="Hủy"
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button variant="destructive" disabled={submitting} onClick={onClose}>
            {submitting ? "Đang kết thúc…" : "Xác nhận kết thúc"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="font-medium">
          {round.election_name ?? electionName} · #{round.election_id}
        </p>
        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-muted p-4">
          <div>
            <dt className="text-sm text-muted-foreground">Phiếu đã nhận</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">
              {round.summary.received}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Chờ đồng bộ</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">
              {(progress ?? []).reduce(
                (total: number, person: any) =>
                  total + Number(person.pending_count ?? 0),
                0,
              )}
            </dd>
          </div>
        </dl>
        {(progress ?? []).some((person: any) => person.pending_count > 0) && (
          <ul className="space-y-1 text-sm">
            {progress
              .filter((person: any) => person.pending_count > 0)
              .map((person: any) => (
                <li key={person.user_id}>
                  {person.full_name}: {person.pending_count} phiếu chờ đồng bộ
                </li>
              ))}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">
          Số chờ đồng bộ phản ánh lần báo cáo gần nhất của từng thiết bị.
        </p>
        {closeError && (
          <p role="alert" className="text-sm text-destructive">
            {closeError}
          </p>
        )}
      </div>
    </Dialog>
  );
}
