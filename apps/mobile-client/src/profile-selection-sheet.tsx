import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Dialog } from "@org/ui";
import { ProfileChoiceList } from "./directory-fields";

export function ProfileSelectionSheet({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; disabled?: boolean }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="mt-2 flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm"
      >
        <span>
          {options.find((option) => option.value === value)?.label ??
            "Chọn thành viên"}
        </span>
        <ChevronDown size={17} />
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        bottomSheet
        title={label}
        description=""
        closeLabel={`Đóng ${label}`}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (event.target instanceof HTMLElement)
            event.target.focus({ preventScroll: true });
        }}
      >
        <ProfileChoiceList
          label={label}
          options={options}
          selected={[value]}
          searchable
          onSelect={(next) => {
            onChange(next);
            setOpen(false);
          }}
        />
      </Dialog>
    </>
  );
}
