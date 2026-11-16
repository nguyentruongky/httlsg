"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, departments } from "@org/core";
import { Button, Dialog, ErrorMessage } from "@org/ui";
import { RoleAssignForm, type AssignTarget } from "./role-assign-dialog";

export function MemberRoleAssignment({
  memberId,
  onClose,
}: {
  memberId: string;
  org: string;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const query = useQuery({
    queryKey: ["admin-member-role", memberId],
    queryFn: async () => {
      const members = await apiRequest<{ items: AssignTarget[] }>(
        `/api/admin/members/search?memberId=${encodeURIComponent(memberId)}`,
      );
      const target = members.items.find((member) => member.id === memberId);
      if (!target) throw new Error("Không tìm thấy thành viên.");
      return { target };
    },
    staleTime: 0,
    gcTime: 0,
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      title="Phân công"
      description="Chọn vai trò quản trị và Ban ngành cho thành viên."
      fullScreenOnMobile
    >
      {query.isPending && <p role="status">Đang tải phân công…</p>}
      {query.error && (
        <div className="space-y-3">
          <ErrorMessage error={query.error} />
          <Button variant="outline" onClick={() => void query.refetch()}>
            Thử lại
          </Button>
        </div>
      )}
      {query.data && (
        <div className="space-y-6">
          <div>
            <p className="text-lg font-semibold">{query.data.target.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query.data.target.allDepartments?.join(", ") ||
                "Chưa có Ban ngành"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query.data.target.hasAccount
                ? "Đã có tài khoản"
                : "Chưa có tài khoản"}
            </p>
          </div>
          <RoleAssignForm
            target={query.data.target}
            departments={departments}
            onPendingChange={setPending}
            onSaved={() => {
              onClose();
            }}
          />
        </div>
      )}
    </Dialog>
  );
}
