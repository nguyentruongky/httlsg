"use client";
import { useRef } from "react";
import { MoreVertical } from "lucide-react";
import { Button, DropdownMenu, MenuItem } from "@org/ui";

export function DepartmentMenu({
  onAdd,
  onBoard,
  onYears,
  readOnly = false,
  disabled,
}: {
  onAdd: () => void;
  onBoard: () => void;
  onYears: () => void;
  readOnly?: boolean;
  disabled?: boolean;
}) {
  const pending = useRef<"add" | "board" | "years" | null>(null);
  return (
    <DropdownMenu
      animateOnMobile
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          aria-label="Tùy chọn Ban ngành"
          disabled={disabled}
        >
          <MoreVertical className="size-5" aria-hidden="true" />
        </Button>
      }
      onCloseAutoFocus={(event) => {
        const next = pending.current;
        if (!next) return;
        event.preventDefault();
        pending.current = null;
        if (next === "years") onYears();
        else if (next === "board") onBoard();
        else onAdd();
      }}
    >
      {!readOnly && (
        <MenuItem
          onSelect={() => {
            pending.current = "add";
          }}
        >
          Thêm ban viên
        </MenuItem>
      )}
      <MenuItem
        onSelect={() => {
          pending.current = "board";
        }}
      >
        {readOnly ? "Ban điều hành" : "Cập nhật Ban điều hành"}
      </MenuItem>
      <MenuItem
        onSelect={() => {
          pending.current = "years";
        }}
      >
        Danh sách BĐH các năm
      </MenuItem>
    </DropdownMenu>
  );
}
