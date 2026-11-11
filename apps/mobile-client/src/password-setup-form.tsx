"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  SetPasswordSchema,
  apiRequest,
  useAuth,
  advanceAuthEpoch,
} from "@org/core";
import { Button, Input } from "@org/ui";
import { LoaderCircle } from "lucide-react";
import { AuthFrame } from "./auth-frame";
export function PasswordSetupForm({ onSuccess }: { onSuccess?: () => void }) {
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<{ new_password: string; confirm_password: string }>({
    resolver: zodResolver(SetPasswordSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });
  return (
    <AuthFrame
      title="Đặt mật khẩu"
      description="Để bảo vệ tài khoản, vui lòng đặt mật khẩu riêng trước khi tiếp tục."
    >
      <form
        className="mt-8 space-y-5"
        noValidate
        onSubmit={form.handleSubmit(async (fields) => {
          setError(null);
          try {
            await apiRequest("/api/auth/set-password", {
              method: "POST",
              body: JSON.stringify(fields),
            });
            advanceAuthEpoch();
            await auth?.refresh();
            onSuccess?.();
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Không thể đặt mật khẩu.",
            );
          }
        })}
      >
        {(["new_password", "confirm_password"] as const).map((field) => (
          <div key={field}>
            <label
              htmlFor={field}
              className="mb-2 block text-[15px] font-medium"
            >
              {field === "new_password" ? "Mật khẩu mới" : "Xác nhận mật khẩu"}
            </label>
            <Input
              id={field}
              type="password"
              autoComplete="new-password"
              className="h-13 w-full rounded-xl px-4 text-[17px]"
              {...form.register(field)}
              aria-invalid={!!form.formState.errors[field]}
            />
            {form.formState.errors[field] && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {form.formState.errors[field]?.message}
              </p>
            )}
          </div>
        ))}
        <p className="text-[14px] text-muted-foreground">
          Mật khẩu ít nhất 4 ký tự, không dùng lại mật khẩu tạm thời.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          type="submit"
          size="touch"
          className="h-13 w-full rounded-xl"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting && (
            <LoaderCircle size={18} className="animate-spin" />
          )}
          {form.formState.isSubmitting
            ? "Đang lưu…"
            : "Lưu mật khẩu và tiếp tục"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={form.formState.isSubmitting}
          onClick={() => {
            void auth?.signOut().catch(() => setError("Không thể đăng xuất."));
          }}
        >
          Đăng xuất
        </Button>
      </form>
    </AuthFrame>
  );
}
