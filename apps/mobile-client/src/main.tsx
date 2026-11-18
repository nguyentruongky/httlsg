import { Toaster } from "@org/ui";
import { PwaRoot } from "./pwa";
import { ClientAuthGate } from "./login-form";
import { StrictMode } from "react";
import { PageErrorBoundary } from "./page-error-boundary";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { App } from "./app";
import { PublicWorshipPage } from "./calendar/public-worship-page";
import { demo, useWorkspace, AuthSessionProvider } from "@org/core";
import "./styles.css";
const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      gcTime: 24 * 60 * 60 * 1000,
      staleTime: 5 * 60 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: { retry: 0 },
  },
});
const root = createRoot(document.getElementById("root")!);
async function start() {
  if (window.location.pathname.replace(/\/+$/, "") === "/worship") {
    root.render(
      <StrictMode>
        <PageErrorBoundary reload>
          <PublicWorshipPage />
        </PageErrorBoundary>
      </StrictMode>,
    );
    return;
  }
  const demoMode =
    import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === "true";
  if (demoMode) {
    const response = await fetch("/__local-data/believers", {
      cache: "no-store",
    });
    if (response.ok)
      useWorkspace
        .getState()
        .setOrganization(demo.loadLocalDataset(await response.json()));
    else if (response.status !== 404)
      throw new Error("Không thể tải dữ liệu cục bộ.");
  }
  root.render(
    <StrictMode>
      <PageErrorBoundary reload>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="gather-appearance-v2"
        >
          <QueryClientProvider client={client}>
            <Toaster>
              {demoMode ? (
                <App />
              ) : (
                <AuthSessionProvider>
                  <PwaRoot>
                    <ClientAuthGate>
                      <App />
                    </ClientAuthGate>
                  </PwaRoot>
                </AuthSessionProvider>
              )}
            </Toaster>
          </QueryClientProvider>
        </ThemeProvider>
      </PageErrorBoundary>
    </StrictMode>,
  );
}
void start().catch(() =>
  root.render(
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-xl font-semibold">
        Không thể tải dữ liệu kiểm thử cục bộ
      </h1>
      <p className="mt-3">
        Kiểm tra tệp nhập hoặc tạo lại bằng lệnh nhập dữ liệu.
      </p>
      <button
        className="mt-5 rounded-lg bg-primary p-3 text-primary-foreground"
        onClick={() => location.reload()}
      >
        Thử lại
      </button>
    </div>,
  ),
);
