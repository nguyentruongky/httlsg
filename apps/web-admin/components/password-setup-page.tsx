"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@org/core";
import { LoginForm } from "../../mobile-client/src/login-form";
import { PasswordSetupForm } from "../../mobile-client/src/password-setup-form";
export function PasswordSetupPage() {
  const router = useRouter(),
    auth = useAuth();
  useEffect(() => {
    if (auth?.user && !auth.user.requiresPasswordSetup)
      router.replace("/client");
  }, [auth?.user, router]);
  if (auth?.loading)
    return (
      <p role="status" className="p-8">
        Đang tải…
      </p>
    );
  if (auth?.error)
    return (
      <p role="alert" className="p-8">
        {auth.error}
      </p>
    );
  if (!auth?.user)
    return (
      <LoginForm
        onSuccess={(user) =>
          router.replace(
            user.requiresPasswordSetup ? "/set-password" : "/client",
          )
        }
      />
    );
  if (!auth.user.requiresPasswordSetup) return null;
  return <PasswordSetupForm onSuccess={() => router.replace("/client")} />;
}
