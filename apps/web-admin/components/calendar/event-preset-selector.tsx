"use client";
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { EVENT_PRESETS, type EventPreset } from "@org/core";
import { Button, Command, Dialog } from "@org/ui";
const categories = [...new Set(EVENT_PRESETS.map((preset) => preset.category))];

export function EventPresetSelector({
  value,
  disabled,
  onSelect,
}: {
  value?: string;
  disabled?: boolean;
  onSelect: (preset: EventPreset) => void;
}) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const selected = EVENT_PRESETS.find((preset) => preset.id === value);
  return (
    <div className="space-y-2">
      <p id={labelId} className="text-sm font-medium">
        Mẫu chương trình
      </p>
      <Button
        type="button"
        variant="outline"
        className="h-auto min-h-11 w-full justify-between whitespace-normal text-left"
        aria-labelledby={labelId}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <span>{selected?.name ?? "Chọn mẫu chương trình"}</span>
        <ChevronDown size={16} className="ml-2 shrink-0" />
      </Button>
      {selected?.description && (
        <p className="text-sm text-muted-foreground">{selected.description}</p>
      )}
      <p className="text-sm text-muted-foreground">
        Chọn mẫu để điền nội dung. Bạn có thể chỉnh sửa trước khi lưu.
      </p>
      {open && (
        <Dialog
          open
          onOpenChange={setOpen}
          title="Chọn mẫu chương trình"
          description="Tìm mẫu theo tên hoặc Ban ngành."
          closeLabel="Đóng danh sách mẫu"
          fullScreenOnMobile
        >
          <Command label="Tìm mẫu chương trình">
            <Command.Input
              aria-label="Tìm mẫu chương trình"
              placeholder="Tìm mẫu chương trình…"
              className="mb-3 min-h-11 w-full rounded-lg border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Command.List className="max-h-[60dvh] overflow-y-auto overscroll-contain">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                Không tìm thấy mẫu chương trình.
              </Command.Empty>
              {categories.map((category) => (
                <Command.Group
                  key={category}
                  heading={category}
                  className="mb-4 [&_[cmdk-group-heading]]:mb-2 [&_[cmdk-group-heading]]:text-sm [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {EVENT_PRESETS.filter(
                    (preset) => preset.category === category,
                  ).map((preset) => (
                    <Command.Item
                      key={preset.id}
                      value={preset.id}
                      keywords={[
                        preset.name,
                        preset.category,
                        preset.description ?? "",
                      ]}
                      className="min-h-12 cursor-pointer rounded-lg px-3 py-3 outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                      onSelect={() => {
                        setOpen(false);
                        onSelect(preset);
                      }}
                    >
                      <span className="block font-medium">{preset.name}</span>
                      {preset.description && (
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {preset.description}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </Dialog>
      )}
    </div>
  );
}
