"use client";
import { useEffect } from "react";
import { navigateClient } from "./client-router";
import { useAuth } from "@org/core";
import { LoginForm } from "./login-form";
import { PasswordSetupForm } from "./password-setup-form";
export function PasswordSetupPage() {
  const auth = useAuth();
  useEffect(() => {
    if (auth?.user && !auth.user.requiresPasswordSetup)
      navigateClient("/client", true);
  }, [auth?.user]);
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
          navigateClient(
            user.requiresPasswordSetup ? "/set-password" : "/client",
            true,
          )
        }
      />
    );
  if (!auth.user.requiresPasswordSetup) return null;
  return <PasswordSetupForm onSuccess={() => navigateClient("/client", true)} />;
}
