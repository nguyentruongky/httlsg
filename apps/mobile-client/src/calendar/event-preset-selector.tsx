"use client";
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  EVENT_PRESETS,
  eventPresetsForDate,
  type EventPreset,
} from "@org/core";
import { Dropdown, Command } from "@org/ui";

export function EventPresetSelector({
  value,
  date,
  disabled,
  onSelect,
}: {
  value?: string;
  date: string;
  disabled?: boolean;
  onSelect: (preset: EventPreset) => void;
}) {
  const [open, setOpen] = useState(true);
  const labelId = useId();
  const presets = eventPresetsForDate(date);
  const categories = [...new Set(presets.map((preset) => preset.category))];
  const selected = EVENT_PRESETS.find((preset) => preset.id === value);
  if (presets.length === 1) return null;
  return (
    <div className="space-y-2">
      <p id={labelId} className="text-sm font-medium">
        Mẫu chương trình
      </p>
      <Dropdown.Trigger
        indicator={false}
        type="button"
        className="h-auto min-h-11 w-full justify-between whitespace-normal text-left"
        aria-labelledby={labelId}
        aria-controls={labelId + "-list"}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.name ?? "Chọn mẫu chương trình"}</span>
        <ChevronDown size={16} className="ml-2 shrink-0" />
      </Dropdown.Trigger>
      <p className="text-sm text-muted-foreground">
        Chọn mẫu để điền nội dung. Bạn có thể chỉnh sửa trước khi lưu.
      </p>
      {open && (
        <div id={labelId + "-list"} className="rounded-xl border p-3">
          <Command label="Danh sách mẫu chương trình" shouldFilter={false}>
            <Command.List className="max-h-56 overflow-y-auto overscroll-contain">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                Không tìm thấy mẫu chương trình.
              </Command.Empty>
              {categories.map((category) => (
                <Command.Group
                  key={category}
                  heading={category}
                  className="mb-4 [&_[cmdk-group-heading]]:mb-2 [&_[cmdk-group-heading]]:text-sm [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {presets
                    .filter((preset) => preset.category === category)
                    .map((preset) => (
                      <Command.Item
                        key={preset.id}
                        value={preset.id}
                        keywords={[
                          preset.name,
                          preset.category,
                          preset.description ?? "",
                        ]}
                        className="min-h-12 cursor-pointer rounded-lg px-3 py-3 outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                        disabled={disabled}
                        aria-selected={preset.id === value}
                        onSelect={() => {
                          onSelect(preset);
                        }}
                      >
                        <span className="block font-medium">{preset.name}</span>
                      </Command.Item>
                    ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </div>
      )}
    </div>
  );
}
