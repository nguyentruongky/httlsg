"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  CreateAccountSchema,
  AccessRoleSchema,
  accessRoleLabels,
  apiRequest,
  workspaceKey,
} from "@org/core";
import { Button, Dialog, Input, Dropdown, ErrorMessage } from "@org/ui";
import { Plus } from "lucide-react";
export function InviteDialog({
  org,
  open,
  onOpenChange,
}: {
  org: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = open !== undefined;
  const isOpen = controlled ? open : internalOpen;
  const changeOpen = (next: boolean) => {
    if (!controlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const client = useQueryClient();
  const form = useForm<z.infer<typeof CreateAccountSchema>>({
    resolver: zodResolver(CreateAccountSchema),
    defaultValues: { name: "", email: "", password: "", accessRole: "user" },
  });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof CreateAccountSchema>) =>
      apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: workspaceKey(org) });
      changeOpen(false);
      form.reset();
    },
  });
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => {
        changeOpen(v);
        mutation.reset();
      }}
      title="Thêm tài khoản"
      description="Tạo tài khoản với mật khẩu tạm thời. Thành viên sẽ phải đặt mật khẩu mới khi đăng nhập."
      fullScreenOnMobile
      trigger={
        controlled ? undefined : (
          <Button>
            <Plus size={16} />
            Thêm tài khoản
          </Button>
        )
      }
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      >
        {(["name", "email", "password"] as const).map((field) => (
          <div key={field}>
            <label htmlFor={`account-${field}`} className="mb-2 block text-sm">
              {field === "name"
                ? "Họ và tên"
                : field === "email"
                  ? "Email"
                  : "Mật khẩu tạm thời"}
            </label>
            <Input
              id={`account-${field}`}
              type={
                field === "password"
                  ? "password"
                  : field === "email"
                    ? "email"
                    : "text"
              }
              autoComplete={
                field === "password"
                  ? "new-password"
                  : field === "email"
                    ? "email"
                    : "name"
              }
              {...form.register(field)}
            />
            {form.formState.errors[field] && (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {form.formState.errors[field]?.message}
              </p>
            )}
          </div>
        ))}
        <label className="block text-sm">
          Vai trò
          <Dropdown {...form.register("accessRole")} className="mt-2 w-full">
            {AccessRoleSchema.options.map((role) => (
              <option key={role} value={role}>
                {accessRoleLabels[role]}
              </option>
            ))}
          </Dropdown>
        </label>
        {mutation.error && <ErrorMessage error={mutation.error} />}
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Đang lưu…" : "Tạo tài khoản"}
        </Button>
      </form>
    </Dialog>
  );
}
