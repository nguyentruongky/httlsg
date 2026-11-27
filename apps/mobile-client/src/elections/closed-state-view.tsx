import { Button } from "@org/ui";
import { Printer } from "lucide-react";

interface ClosedStateViewProps {
  onViewTickets: () => void;
}

export function ClosedStateView({ onViewTickets }: ClosedStateViewProps) {
  return (
    <section
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted p-4"
    >
      <h2 className="font-semibold">Cuộc bầu cử đã kết thúc</h2>
      <Button variant="outline" onClick={onViewTickets} className="gap-2">
        <Printer size={17} />
        Xem phiếu
      </Button>
    </section>
  );
}
