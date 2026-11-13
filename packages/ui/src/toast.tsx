"use client";
import * as React from "react";
import { cn } from "./cn";
type ToastInput = {
  title: string;
  description?: string;
  variant?: "success" | "error";
};
type ToastItem = ToastInput & { id: number };
const ToastContext = React.createContext<{
  toast: (input: ToastInput) => void;
} | null>(null);
export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <Toaster>.");
  return context;
}
export function Toaster({ children }: { children?: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const toast = React.useCallback((input: ToastInput) => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { ...input, id }]);
    setTimeout(
      () => setItems((current) => current.filter((item) => item.id !== id)),
      5000,
    );
  }, []);
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-60 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role={item.variant === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto wrap-anywhere rounded-xl border p-4 text-sm shadow-xl",
              item.variant === "error"
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-border bg-card text-card-foreground",
            )}
          >
            <p className="font-medium">{item.title}</p>
            {item.description && (
              <p className="mt-1 text-xs leading-relaxed opacity-80">
                {item.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
