import { useState } from "react";
import { apiRequest } from "@org/core";
import {
  Button,
  Dialog,
  DropdownMenu,
  Input,
  MenuItem,
  useToast,
} from "@org/ui";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

type Election = {
  id: number;
  name: string;
  description: string;
  status: string;
  phase: string;
  version: number;
};
export function ElectionActions({
  election,
  onChanged,
  onDeleted,
}: {
  election: Election;
  onChanged: () => Promise<unknown>;
  onDeleted: (id: number) => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const editable = election.status === "draft" && election.phase === "draft";
  const running = election.phase === "online" || election.phase === "checking";
  const open = (next: "edit" | "delete") => {
    setName(election.name);
    setDescription(election.description ?? "");
    setError("");
    setDialog(next);
  };
  const save = async () => {
    if (busy || !dialog) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/elections/${election.id}/${dialog}`, {
        method: "POST",
        body: JSON.stringify(
          dialog === "edit"
            ? { name: name.trim(), description, version: election.version }
            : { version: election.version },
        ),
      });
      setDialog(null);
      toast({
        title:
          dialog === "edit"
            ? "Đã cập nhật cuộc bầu cử."
            : "Đã xóa cuộc bầu cử.",
      });
      try {
        if (dialog === "delete") await onDeleted(election.id);
        else await onChanged();
      } catch {
        toast({
          title:
            "Thay đổi đã được lưu. Vui lòng tải lại trang để cập nhật danh sách.",
        });
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Không thể xử lý yêu cầu.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <DropdownMenu
        label="Thao tác cuộc bầu cử"
        showLabel={false}
        trigger={
          <Button
            variant="outline"
            size="icon"
            aria-label={`Thao tác ${election.name}`}
          >
            <MoreHorizontal size={20} />
          </Button>
        }
      >
        <MenuItem disabled={!editable || busy} onSelect={() => open("edit")}>
          <Pencil size={16} /> Sửa cuộc bầu cử
        </MenuItem>
        <MenuItem disabled={running || busy} onSelect={() => open("delete")}>
          <Trash2 size={16} /> Xóa cuộc bầu cử
        </MenuItem>
        {!editable && (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Chỉ sửa khi Chưa bắt đầu.
          </p>
        )}
        {running && (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Đóng bầu cử trước khi xóa.
          </p>
        )}
      </DropdownMenu>
      <Dialog
        open={dialog !== null}
        onOpenChange={(value) => {
          if (!busy && !value) setDialog(null);
        }}
        title={dialog === "edit" ? "Sửa cuộc bầu cử" : "Xóa cuộc bầu cử"}
        description={
          dialog === "edit"
            ? "Chỉ được sửa tên và mô tả khi cuộc bầu cử chưa bắt đầu."
            : "Cuộc bầu cử sẽ được gỡ khỏi danh sách. Phiếu đã ghi nhận và nhật ký được giữ lại."
        }
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDialog(null)}
            >
              Hủy
            </Button>
            <Button
              variant={dialog === "delete" ? "destructive" : "default"}
              disabled={busy || (dialog === "edit" && !name.trim())}
              onClick={() => void save()}
            >
              {busy
                ? "Đang xử lý…"
                : dialog === "edit"
                  ? "Lưu thay đổi"
                  : "Xác nhận xóa"}
            </Button>
          </div>
        }
      >
        {error && (
          <p role="alert" className="mb-4 text-sm text-destructive">
            {error}
          </p>
        )}
        {dialog === "edit" ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Tên cuộc bầu cử</span>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={200}
                disabled={busy}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Mô tả</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={5000}
                disabled={busy}
                style={{ width: "100%" }}
                className="block min-h-28 rounded-lg border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>
        ) : (
          <p className="break-words font-medium">{election.name}</p>
        )}
      </Dialog>
    </>
  );
}
