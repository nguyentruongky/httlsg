"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, workspaceKey } from "@org/core";
import { Button, Dialog, ErrorMessage } from "@org/ui";
import { RoleAssignForm, type AssignTarget } from "./role-assign-dialog";

export function MemberRoleAssignment({
  memberId,
  org,
  onClose,
}: {
  memberId: string;
  org: string;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [pending, setPending] = useState(false);
  const query = useQuery({
    queryKey: ["admin-member-role", memberId],
    queryFn: async () => {
      const [members, assigned] = await Promise.all([
        apiRequest<{ items: AssignTarget[] }>(
          `/api/admin/members/search?memberId=${encodeURIComponent(memberId)}`,
        ),
        apiRequest<{ departments: { id: string; name: string }[] }>(
          "/api/admin/roles/assigned",
        ),
      ]);
      const target = members.items.find((member) => member.id === memberId);
      if (!target) throw new Error("Không tìm thấy thành viên.");
      return { target, departments: assigned.departments };
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
            departments={query.data.departments}
            onPendingChange={setPending}
            onSaved={() => {
              for (const queryKey of [
                workspaceKey(org),
                ["admin-assigned-roles"],
                ["admin-member-search"],
                ["admin-member-role"],
              ])
                void client.invalidateQueries({ queryKey });
              onClose();
            }}
          />
        </div>
      )}
    </Dialog>
  );
}
