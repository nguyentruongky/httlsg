"use client";
import { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, invalidateMemberReads, useWorkspace } from "@org/core";
import {
  Button,
  Dialog,
  DropdownMenu,
  MenuItem,
  Input,
  ErrorMessage,
  useToast,
} from "@org/ui";
export function DepartmentMenu({
  department,
  onAdd,
  onBoard,
  disabled,
}: {
  department: { id: string; name: string };
  onAdd: () => void;
  onBoard: () => void;
  disabled?: boolean;
}) {
  const [action, setAction] = useState<string | null>(null),
    [name, setName] = useState(department.name);
  const pendingAdd = useRef<"add" | "board" | null>(null);
  function afterClose(event: Event) {
    if (!pendingAdd.current) return;
    event.preventDefault();
    const next = pendingAdd.current;
    pendingAdd.current = null;
    if (next === "board") onBoard();
    else onAdd();
  }
  const org = useWorkspace((state) => state.organizationId);
  const client = useQueryClient(),
    { toast } = useToast();
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/admin/departments", {
        method: action === "delete" ? "DELETE" : "PATCH",
        body: JSON.stringify({
          id: department.id,
          ...(action === "delete" ? {} : { name }),
        }),
      }),
    onSuccess: async () => {
      await invalidateMemberReads(client, org);
      toast({
        title: action === "delete" ? "Đã xóa ban" : "Đã đổi tên ban",
        variant: "success",
      });
      if (action === "delete") window.location.assign("/dashboard/departments");
      else setAction(null);
    },
  });
  const items = [
    { id: "add", label: "Thêm ban viên" },
    { id: "rename", label: "Đổi tên ban" },
    { id: "delete", label: "Xóa ban" },
    { id: "board", label: "Cập nhật Ban điều hành" },
  ];
  function choose(id: string) {
    mutation.reset();
    if (id === "add" || id === "board") {
      pendingAdd.current = id;
      return;
    }
    setName(department.name);
    setAction(id);
  }
  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-11 shrink-0"
      aria-label="Tùy chọn Ban ngành"
      disabled={disabled}
    >
      <MoreHorizontal className="size-5" aria-hidden="true" />
    </Button>
  );
  return (
    <>
      <DropdownMenu
        animateOnMobile
        trigger={trigger}
        align="end"
        onCloseAutoFocus={afterClose}
      >
        {items.map((item) => (
          <MenuItem
            key={item.id}
            onSelect={() => choose(item.id)}
            className="min-h-11"
          >
            {item.label}
          </MenuItem>
        ))}
      </DropdownMenu>
      {(action === "rename" || action === "delete") && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !mutation.isPending) setAction(null);
          }}
          title={action === "delete" ? "Xóa ban?" : "Đổi tên ban"}
          description={
            action === "delete"
              ? "Xóa ban và các liên kết thành viên? Hồ sơ và lịch sử Ban điều hành vẫn được lưu."
              : ""
          }
          closeLabel="Đóng cài đặt ban"
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            {action === "rename" && (
              <label className="block text-sm">
                Tên Ban ngành
                <Input
                  className="mt-2 w-full"
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  disabled={mutation.isPending}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            )}
            {mutation.error && <ErrorMessage error={mutation.error} />}
            <div className="flex gap-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending
                  ? "Đang lưu…"
                  : action === "delete"
                    ? "Xóa ban"
                    : "Lưu"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => setAction(null)}
              >
                Hủy
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
