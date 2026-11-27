import { Dialog, Button, Input } from "@org/ui";

interface CreateElectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createName: string;
  setCreateName: (name: string) => void;
  createType: "church" | "department";
  setCreateType: (type: "church" | "department") => void;
  createBusy: boolean;
  createError: string;
  onCreate: () => void;
  onCancel: () => void;
}

export function CreateElectionDialog({
  open,
  onOpenChange,
  createName,
  setCreateName,
  createType,
  setCreateType,
  createBusy,
  createError,
  onCreate,
  onCancel,
}: CreateElectionDialogProps) {
  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tạo cuộc bầu cử mới"
      description="Nhập thông tin để tạo cuộc bầu cử mới."
      closeLabel="Hủy"
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            variant="outline"
            disabled={createBusy}
            onClick={onCancel}
            className="min-h-11"
          >
            Hủy
          </Button>
          <Button
            disabled={createBusy || !createName.trim()}
            onClick={onCreate}
            className="min-h-11 bg-[#215e3d] text-white hover:bg-[#19492f]"
          >
            {createBusy ? "Đang tạo…" : "Tạo cuộc bầu cử"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {createError && (
          <p role="alert" className="text-sm text-red-600">
            {createError}
          </p>
        )}
        <div className="space-y-2">
          <label
            htmlFor="election-name"
            className="block text-sm font-medium text-[#1c1b18]"
          >
            Tên cuộc bầu cử <span className="text-red-500">*</span>
          </label>
          <Input
            id="election-name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="Ví dụ: Hội đồng thường niên Ban Thanh niên 2027"
            disabled={createBusy}
            className="min-h-11"
            maxLength={200}
          />
          <p className="text-xs text-[#6b6963]">Tối đa 200 ký tự.</p>
        </div>
        <fieldset className="space-y-2">
          <legend className="block text-sm font-medium text-[#1c1b18]">
            Loại bầu cử <span className="text-red-500">*</span>
          </legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 flex-1 cursor-pointer">
              <input
                type="radio"
                name="election-type"
                value="church"
                checked={createType === "church"}
                onChange={() => setCreateType("church")}
                disabled={createBusy}
                className="h-4 w-4 text-[#215e3d] border-[#e6e4dd] focus:ring-2 focus:ring-[#215e3d]/20"
              />
              <span className="text-sm text-[#1c1b18]">Hội Thánh</span>
            </label>
            <label className="flex items-center gap-2 flex-1 cursor-pointer">
              <input
                type="radio"
                name="election-type"
                value="department"
                checked={createType === "department"}
                onChange={() => setCreateType("department")}
                disabled={createBusy}
                className="h-4 w-4 text-[#215e3d] border-[#e6e4dd] focus:ring-2 focus:ring-[#215e3d]/20"
              />
              <span className="text-sm text-[#1c1b18]">Ban ngành</span>
            </label>
          </div>
        </fieldset>
      </div>
    </Dialog>
  );
}