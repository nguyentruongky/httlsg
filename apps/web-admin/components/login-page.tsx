"use client";
import { useEffect } from "react";
import { useAuth } from "@org/core";
import { useRouter } from "next/navigation";
import { LoginForm } from "../../mobile-client/src/login-form";
export function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  useEffect(() => {
    if (auth?.user)
      router.replace(
        auth.user.requiresPasswordSetup ? "/set-password" : "/client",
      );
  }, [auth?.user, router]);
  if (auth?.loading || auth?.user)
    return (
      <p role="status" className="p-8">
        Đang tải…
      </p>
    );
  return (
    <LoginForm
      onSuccess={(user) => {
        router.replace(
          user.requiresPasswordSetup ? "/set-password" : "/client",
        );
        router.refresh();
      }}
    />
  );
}
