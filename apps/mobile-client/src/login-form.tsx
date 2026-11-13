import { dismissKeyboard } from "./keyboard";
("use client");
import { currentClientPath, navigateClient } from "./client-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  LoginSchema,
  IdentifierSchema,
  apiRequest,
  useAuth,
  type AuthUser,
} from "@org/core";
import { Button, Input } from "@org/ui";
import { LoaderCircle, ArrowRight } from "lucide-react";
import { AuthFrame } from "./auth-frame";
import { OtpOnboarding } from "./otp-onboarding";
import { PasswordSetupForm } from "./password-setup-form";
export function LoginForm({
  onSuccess,
}: {
  onSuccess?: (user: AuthUser) => void;
}) {
  const auth = useAuth();
  const [stage, setStage] = useState<"identify" | "password" | "otp">(
      "identify",
    ),
    [otpMessage, setOtpMessage] = useState<string | undefined>(),
    [otpDelivery, setOtpDelivery] = useState<"ADMIN" | "EMAIL" | undefined>(),
    [error, setError] = useState<string | null>(null);
  const form = useForm<{ identifier: string; password: string }>({
    resolver: stage === "password" ? zodResolver(LoginSchema) : undefined,
    defaultValues: { identifier: "", password: "" },
  });
  if (stage === "otp")
    return (
      <OtpOnboarding
        initialIdentifier={form.getValues("identifier")}
        initialMessage={otpMessage}
        initialDelivery={otpDelivery}
        onBack={() => {
          setStage("identify");
          form.setValue("password", "");
          form.clearErrors();
          setError(null);
        }}
        onSuccess={(user) => onSuccess?.(user)}
      />
    );
  return (
    <AuthFrame title="Đăng nhập" description="">
      {auth?.sessionMessage && (
        <p
          role="status"
          className="mt-5 text-center text-sm text-muted-foreground"
        >
          {auth.sessionMessage}
        </p>
      )}
      <form
        className="mt-8 space-y-5"
        noValidate
        onSubmitCapture={dismissKeyboard}
        onSubmit={form.handleSubmit(async (fields) => {
          setError(null);
          try {
            if (stage === "identify") {
              const parsed = IdentifierSchema.safeParse(fields.identifier);
              if (!parsed.success) {
                form.setError("identifier", {
                  message: parsed.error.issues[0].message,
                });
                return;
              }
              form.setValue("identifier", parsed.data);
              form.setValue("password", "");
              const result = await apiRequest<{
                next: "password" | "otp";
                message?: string;
              }>("/api/auth/identify", {
                method: "POST",
                body: JSON.stringify({ identifier: parsed.data }),
              });
              if (result.next === "password") {
                setStage("password");
                return;
              }
              if (parsed.data.includes("@")) {
                const response = await apiRequest<{
                  message: string;
                  delivery?: "ADMIN" | "EMAIL";
                }>("/api/auth/request-email-otp", {
                  method: "POST",
                  body: JSON.stringify({ email: parsed.data }),
                });
                setOtpMessage(response.message);
                setOtpDelivery(response.delivery ?? "EMAIL");
              } else {
                setOtpMessage(result.message);
                setOtpDelivery("ADMIN");
              }
              setStage("otp");
              return;
            }
            if (!auth) throw new Error("Không thể kết nối máy chủ.");
            const user = await auth.signIn(fields);
            onSuccess?.(user);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Không thể đăng nhập.");
          }
        })}
      >
        {stage === "identify" ? (
          <div>
            <label
              htmlFor="login-identifier"
              className="mb-2 block text-[15px] font-medium"
            >
              Số điện thoại hoặc email
            </label>
            <Input
              id="login-identifier"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              placeholder="Số điện thoại hoặc email của bạn"
              className="h-13 w-full rounded-xl bg-background/60 px-4 text-[17px]"
              {...form.register("identifier")}
              aria-invalid={!!form.formState.errors.identifier}
            />
            {form.formState.errors.identifier && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {form.formState.errors.identifier.message}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-4 py-2">
            <p className="min-w-0 break-all text-[15px]">
              {form.getValues("identifier")}
            </p>
            <button
              type="button"
              disabled={form.formState.isSubmitting}
              className="min-h-11 shrink-0 text-[14px] text-primary underline underline-offset-4"
              onClick={() => {
                setStage("identify");
                form.setValue("password", "");
                form.clearErrors();
                setError(null);
              }}
            >
              Thay đổi
            </button>
          </div>
        )}
        {stage === "password" && (
          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block text-[15px] font-medium"
            >
              Mật khẩu
            </label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              className="h-13 w-full rounded-xl bg-background/60 px-4 text-[17px]"
              {...form.register("password")}
              aria-invalid={!!form.formState.errors.password}
            />
            {form.formState.errors.password && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          type="submit"
          size="touch"
          className="mt-2 h-13 w-full rounded-xl text-[16px] font-semibold shadow-sm"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : null}
          {form.formState.isSubmitting
            ? stage === "identify"
              ? "Đang kiểm tra…"
              : "Đang đăng nhập…"
            : stage === "identify"
              ? "Tiếp tục"
              : "Đăng nhập"}
          {!form.formState.isSubmitting && (
            <ArrowRight size={18} aria-hidden="true" />
          )}
        </Button>
      </form>
    </AuthFrame>
  );
}
export function ClientAuthGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (!auth) return null;
  if (auth.loading)
    return (
      <p role="status" className="p-8 text-center">
        Đang tải…
      </p>
    );
  if (auth.error)
    return (
      <div className="mx-auto max-w-md p-8">
        <p role="alert">{auth.error}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Thử lại
        </Button>
      </div>
    );
  if (auth.user?.requiresPasswordSetup)
    return (
      <PasswordSetupForm
        onSuccess={() => {
          navigateClient(currentClientPath(), true);
        }}
      />
    );
  return auth.user ? (
    <>{children}</>
  ) : (
    <LoginForm
      onSuccess={() => {
        navigateClient(currentClientPath(), true);
      }}
    />
  );
}
