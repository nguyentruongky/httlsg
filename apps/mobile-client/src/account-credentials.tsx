"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, type Member, workspaceKey } from "@org/core";
import { Button, Dialog, Input, ErrorMessage } from "@org/ui";
export function AccountCredentials({
  member,
  org,
  onClose,
}: {
  member: Pick<Member, "id" | "phone"> & {
    user: Pick<Member["user"], "email">;
  };
  org: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState(member.user.email ?? member.phone ?? ""),
    [password, setPassword] = useState("");
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/admin/users/${member.id}/credentials`, {
        method: "POST",
        body: JSON.stringify({ identifier: email, password }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: workspaceKey(org) });
      onClose();
    },
  });
  return (
    <Dialog
      open
      className="credentials-dialog"
      onOpenAutoFocus={(event) => {
        if (window.matchMedia("(max-width: 767px)").matches) {
          event.preventDefault();
          if (event.target instanceof HTMLElement)
            event.target.focus({ preventScroll: true });
        }
      }}
      onOpenChange={(v) => {
        if (!v && !mutation.isPending) onClose();
      }}
      title="Thông tin đăng nhập"
      description={`Mật khẩu tạm thời có hiệu lực trong 24 giờ. Thành viên phải đặt mật khẩu mới sau khi đăng nhập. Các phiên cũ sẽ được đăng xuất.`}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <label className="block text-sm">
          Số điện thoại hoặc email
          <Input
            required
            type="text"
            autoComplete="off"
            className="mt-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Mật khẩu tạm thời
          <Input
            required
            minLength={4}
            maxLength={20}
            type="password"
            autoComplete="new-password"
            className="mt-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {mutation.error && <ErrorMessage error={mutation.error} />}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Đang lưu…" : "Lưu"}
        </Button>
      </form>
    </Dialog>
  );
}
