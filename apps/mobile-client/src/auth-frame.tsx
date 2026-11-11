"use client";
import type { ReactNode } from "react";
import { Card } from "@org/ui";
export function AuthFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-dvh w-full place-items-center bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_65%)] px-5 py-[max(2.5rem,env(safe-area-inset-top),env(safe-area-inset-bottom))] sm:px-8 sm:py-16">
      <div className="w-full min-w-0 max-w-[440px]">
        <Card className="w-full rounded-3xl border-border/70 px-6 py-8 shadow-[0_16px_64px_-24px_rgb(0_0_0/0.16)] sm:px-9 sm:py-10">
          <img
            src="/pwa/icon-192.png"
            alt="HTTL Sài Gòn"
            className="mx-auto mb-6 size-16 rounded-full bg-white object-contain"
          />
          <h1 className="text-center text-[30px] font-semibold leading-tight tracking-tight">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-[310px] text-center text-[16px] leading-relaxed text-muted-foreground">
            {description}
          </p>
          {children}
        </Card>
        <p className="mt-6 text-center text-[14px] leading-relaxed text-muted-foreground">
          Cần hỗ trợ? Vui lòng liên hệ trưởng Ban ngành.
        </p>
      </div>
    </main>
  );
}
