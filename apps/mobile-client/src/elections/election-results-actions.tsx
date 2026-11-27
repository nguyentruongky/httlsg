import { cn } from "@org/ui";
import { Button } from "@org/ui";
import { Play, FileChartColumn, Square } from "lucide-react";
import type { ElectionType } from "./types";

interface ElectionResultsActionsProps {
  round: any;
  data: any;
  canManageRound: boolean;
  submitting: boolean;
  isNotStarted: boolean;
  isOnline: boolean;
  isChecking: boolean;
  candidateCount: number;
  scrutineerCount: number;
  needsScrutineers: boolean;
  handleStartRound: (nextPhase: "online" | "checking") => void;
  handleManualChecking: () => void;
  onExport: () => void;
  actionClass: string;
  exportClass: string;
}

export function ElectionResultsActions({
  round,
  data,
  canManageRound,
  submitting,
  isNotStarted,
  isOnline,
  isChecking,
  candidateCount,
  scrutineerCount,
  needsScrutineers,
  handleStartRound,
  handleManualChecking,
  onExport,
  actionClass,
  exportClass,
}: ElectionResultsActionsProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-3 lg:shrink-0 lg:justify-end"
      aria-label="Thao tác kết quả"
    >
      {canManageRound && isNotStarted && (
        <Button
          disabled={
            submitting ||
            candidateCount === 0 ||
            (needsScrutineers && scrutineerCount === 0)
          }
          onClick={() => handleStartRound("online")}
          className={cn(
            actionClass,
            "min-w-36 bg-[#216e4a] text-white hover:bg-[#195639]",
          )}
        >
          <Play size={17} className="fill-current" aria-hidden="true" />
          {submitting ? "Đang mở…" : "Nhận phiếu trực tuyến"}
        </Button>
      )}
      {canManageRound && isNotStarted && (
        <Button
          variant="outline"
          disabled={
            submitting ||
            candidateCount === 0 ||
            (needsScrutineers && scrutineerCount === 0)
          }
          onClick={() => handleStartRound("checking")}
          className={actionClass}
        >
          Kiểm phiếu thủ công
        </Button>
      )}
      {canManageRound && isOnline && (
        <Button
          disabled={submitting}
          onClick={handleManualChecking}
          className={actionClass}
        >
          Chuyển sang kiểm phiếu thủ công
        </Button>
      )}
      {canManageRound && isChecking && (
        <Button
          variant="destructive"
          disabled={submitting}
          className={cn(actionClass, "min-w-36")}
        >
          <Square size={16} className="fill-current" aria-hidden="true" />
          {submitting ? "Đang đóng…" : "Đóng bầu cử"}
        </Button>
      )}
      {round.status === "closed" && (
        <Button variant="outline" className={exportClass} onClick={onExport}>
          <FileChartColumn
            size={19}
            className="text-[#216e4a]"
            aria-hidden="true"
          />
          Xuất Excel
        </Button>
      )}
    </div>
  );
}
