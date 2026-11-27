import { Dialog, Button } from "@org/ui";

interface ElectionResultsCountdownProps {
  countdown: {
    open: boolean;
    action: "start-online" | "start-checking" | "manual-checking";
    seconds: number;
  };
  cancelCountdown: () => void;
  submitting: boolean;
  candidateCount: number;
  scrutineerCount: number;
  round: any;
}

export function ElectionResultsCountdown({
  countdown,
  cancelCountdown,
  submitting,
  candidateCount,
  scrutineerCount,
  round,
}: ElectionResultsCountdownProps) {
  return (
    <Dialog
      open={countdown.open}
      onOpenChange={(open) => {
        if (!open) cancelCountdown();
      }}
      title={
        countdown.action === "start-online"
          ? "Nhận phiếu trực tuyến"
          : countdown.action === "start-checking"
            ? "Kiểm phiếu thủ công"
            : "Chuyển sang kiểm phiếu thủ công"
      }
      description={
        countdown.action === "manual-checking"
          ? "Đóng cổng nhận phiếu trực tuyến và chuyển sang kiểm phiếu thủ công? Các phiếu trực tuyến đã gửi vẫn được giữ nguyên."
          : `${countdown.action === "start-online" ? "Bắt đầu nhận phiếu trực tuyến" : "Bắt đầu kiểm phiếu thủ công"} cho bầu cử #${round.election_id}? ${countdown.action === "start-online" ? "Bắt đầu nhận phiếu trực tuyến" : "Bắt đầu kiểm phiếu thủ công"} cho bầu cử #${round.election_id}? ${candidateCount} ứng viên; ${scrutineerCount} nhân sự kiểm phiếu.`
      }
      closeLabel="Hủy"
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            variant="outline"
            disabled={submitting}
            onClick={cancelCountdown}
          >
            Hủy
          </Button>
        </div>
      }
    >
      <div className="text-center py-4">
        <p className="text-4xl font-bold text-[#215e3d] mb-2">
          {countdown.seconds}s
        </p>
        <p className="text-sm text-[#6b6963]">
          Tự động bắt đầu sau {countdown.seconds} giây...
        </p>
      </div>
    </Dialog>
  );
}
