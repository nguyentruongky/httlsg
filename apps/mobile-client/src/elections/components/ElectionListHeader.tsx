import { Plus } from "lucide-react";
import { Button } from "@org/ui";

interface ElectionListHeaderProps {
  admin: boolean;
  onCreateClick: () => void;
}

export function ElectionListHeader({ admin, onCreateClick }: ElectionListHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-2">
      <h1 className="text-2xl font-bold tracking-tight">Bầu cử</h1>
      {admin && (
        <Button
          variant="outline"
          size="icon"
          onClick={onCreateClick}
          aria-label="Tạo cuộc bầu cử mới"
        >
          <Plus size={20} />
        </Button>
      )}
    </header>
  );
}