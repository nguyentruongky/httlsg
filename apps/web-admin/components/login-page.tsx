"use client";
import { useRouter } from "next/navigation";
import { LoginForm } from "../../mobile-client/src/login-form";
export function LoginPage() {
  const router = useRouter();
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
