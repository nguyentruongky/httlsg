"use client";
import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { AuthSessionProvider } from "@org/core";
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1 }, mutations: { retry: 0 } },
      }),
  );
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="gather-appearance-v2"
    >
      <QueryClientProvider client={client}>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
