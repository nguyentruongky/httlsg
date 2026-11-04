"use client";
import { useState, useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { demo, useWorkspace } from "@org/core";
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1 }, mutations: { retry: 0 } },
      }),
  );
  const [ready, setReady] = useState(process.env.NODE_ENV !== "development");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const controller = new AbortController();
    void fetch("/api/local-believers", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          if (!controller.signal.aborted)
            useWorkspace
              .getState()
              .setOrganization(demo.loadLocalDataset(data));
        } else if (response.status !== 404)
          throw new Error("Local data unavailable");
        if (!controller.signal.aborted) setReady(true);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setFailed(true);
          setReady(true);
        }
      });
    return () => controller.abort();
  }, []);
  if (!ready) return <p className="p-8">Loading local workspace…</p>;
  if (failed)
    return (
      <p role="alert" className="p-8">
        Unable to load the local dataset. Re-run the importer and reload.
      </p>
    );
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="gather-appearance-v2"
    >
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
