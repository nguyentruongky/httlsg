"use client";
import { useRouter } from "next/navigation";
import { PasswordSetupForm } from "../../mobile-client/src/password-setup-form";
export function PasswordSetupPage() {
  const router = useRouter();
  return (
    <PasswordSetupForm
      onSuccess={() => {
        router.replace("/client");
        router.refresh();
      }}
    />
  );
}
