import { electionPhaseFromRound } from "../domain";
import { ELECTION_PHASE_LABELS } from "../domain/types";

interface ActionsPanelProps {
  round: {
    id: number;
    election_id: number;
    status: string;
    phase?: string | null;
  };
  summary: {
    received: number;
  };
  canManage: boolean;
  submitting: boolean;
  candidateCount: number;
  scrutineerCount: number;
  needsScrutineers: boolean;
  onStartOnline: () => void;
  onStartChecking: () => void;
  onManualChecking: () => void;
  onStop: () => void;
  onExport: () => void;
}

export function ActionsPanel({
  round,
  summary,
  canManage,
  submitting,
  candidateCount,
  scrutineerCount,
  needsScrutineers,
  onStartOnline,
  onStartChecking,
  onManualChecking,
  onStop,
  onExport,
}: ActionsPanelProps) {
  const phase = electionPhaseFromRound(round);
  const isNotStarted = round.status === "draft";
  const isOnline = phase === "online";
  const isChecking = phase === "checking";
  const isClosed = round.status === "closed";

  const actionClass = "h-10 min-h-10 gap-2 rounded-xl px-4 text-sm font-medium";
  const primaryBtn =
    "bg-[#215e3d] text-white hover:bg-[#19492f] border-[#215e3d]";
  const outlineBtn =
    "border-[#e6e4dd] bg-white text-[#1c1b18] hover:bg-[#f2f0e8]";

  return (
    <div
      className="flex flex-wrap items-center gap-2 lg:justify-end"
      aria-label="Thao tác kết quả"
    >
      {canManage && isNotStarted && candidateCount > 0 && (
        <button
          disabled={
            submitting ||
            candidateCount === 0 ||
            (needsScrutineers && scrutineerCount === 0)
          }
          onClick={onStartOnline}
          className={`${primaryBtn} ${actionClass} min-w-[140px]`}
        >
          {submitting ? "Đang mở…" : "Nhận phiếu trực tuyến"}
        </button>
      )}
      {canManage && isNotStarted && (
        <button
          disabled={
            submitting ||
            candidateCount === 0 ||
            (needsScrutineers && scrutineerCount === 0)
          }
          onClick={onStartChecking}
          className={`${outlineBtn} ${actionClass}`}
        >
          Kiểm phiếu thủ công
        </button>
      )}
      {canManage && isOnline && (
        <button
          disabled={submitting}
          onClick={onManualChecking}
          className={`${actionClass}`}
        >
          Chuyển sang kiểm phiếu thủ công
        </button>
      )}
      {canManage && isChecking && (
        <button
          disabled={submitting}
          onClick={onStop}
          className={`${actionClass} min-w-[140px] bg-red-600 text-white hover:bg-red-700`}
        >
          {submitting ? "Đang đóng…" : "Đóng bầu cử"}
        </button>
      )}
      {isClosed && (
        <button onClick={onExport} className={`${outlineBtn} ${actionClass}`}>
          Xuất Excel
        </button>
      )}
    </div>
  );
}
