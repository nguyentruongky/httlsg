import { LoadingView } from "@org/ui";
import { Button } from "@org/ui";
import { Clock3 } from "lucide-react";

interface DraftStateViewProps {
  round: { election_id: number; status: string };
  onReload: () => void;
  loading: boolean;
}

export function DraftStateView({
  round,
  onReload,
  loading,
}: DraftStateViewProps) {
  if (loading) return <LoadingView message="Đang tải cuộc bầu cử…" />;

  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-2xl border bg-card px-5 py-12 text-center"
    >
      <Clock3 className="mx-auto mb-4 text-primary" size={44} />
      <h2 className="text-xl font-semibold">
        Đang chờ mở bầu cử #{round.election_id}
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
        Bạn đã được phân công kiểm phiếu. Chọn Làm mới trạng thái sau khi quản
        trị viên bắt đầu bầu cử để mở màn hình nhập phiếu.
      </p>
      <Button variant="outline" className="mt-4" onClick={onReload}>
        Làm mới
      </Button>
    </section>
  );
}
