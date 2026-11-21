"use client";
import { PageLoading } from "./page-loading";
import { useEffect } from "react";
import { useAuth } from "@org/core";
import { navigateClient } from "./client-router";
import { LoginForm } from "./login-form";
import { SessionRecovery } from "./session-recovery";
export function LoginPage() {
  const auth = useAuth();
  useEffect(() => {
    if (auth?.user)
      navigateClient(
        auth.user.requiresPasswordSetup ? "/set-password" : "/client",
        true,
      );
  }, [auth?.user]);
  if (auth?.loading || auth?.user)
    return <PageLoading />;
  if (auth?.error) return <SessionRecovery />;
  return (
    <LoginForm
      onSuccess={(user) => {
        navigateClient(
          user.requiresPasswordSetup ? "/set-password" : "/client",
          true,
        );
      }}
    />
  );
}
