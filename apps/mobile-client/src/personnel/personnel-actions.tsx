import { useRef } from "react";
import {
  MoreVertical,
  Pencil,
  BriefcaseBusiness,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@org/core";
import { Button, DropdownMenu, MenuItem } from "@org/ui";
import type { AssignedMember } from "./types";

export function PersonnelActions({
  member,
  onEdit,
  onMissions,
  onCredentials,
}: {
  member: AssignedMember;
  onEdit: () => void;
  onMissions: () => void;
  onCredentials: () => void;
}) {
  const readOnly = useAuth()?.user?.role === "deacon";
  const pending = useRef<"edit" | "missions" | "credentials" | null>(null);
  if (readOnly) return null;
  return (
    <DropdownMenu
      animateOnMobile
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          aria-label={`Thao tác cho ${member.name}`}
        >
          <MoreVertical size={20} />
        </Button>
      }
      onCloseAutoFocus={(event) => {
        const action = pending.current;
        if (!action) return;
        event.preventDefault();
        pending.current = null;
        if (action === "edit") onEdit();
        else if (action === "credentials") onCredentials();
        else onMissions();
      }}
    >
      <MenuItem
        onSelect={() => {
          pending.current = "edit";
        }}
      >
        <Pencil size={16} />
        Cập nhật thông tin
      </MenuItem>
      <MenuItem
        onSelect={() => {
          pending.current = "missions";
        }}
      >
        <BriefcaseBusiness size={16} />
        Thay đổi công tác
      </MenuItem>
      <MenuItem
        onSelect={() => {
          pending.current = "credentials";
        }}
      >
        <KeyRound size={16} />
        Thông tin đăng nhập
      </MenuItem>
    </DropdownMenu>
  );
}
