import { UserRound } from "lucide-react";
import { useAuth } from "@org/core";
import { ConnectionIssue } from "./connection-issue";

export function ListLoading({
  description = "Đang tải danh sách thành viên…",
}: {
  description?: string;
}) {
  const auth = useAuth();
  if (auth?.offline) return <ConnectionIssue />;
  return (
    <div
      role="status"
      className="list-loading mx-auto flex w-full max-w-sm flex-col items-center px-5 py-10 text-center"
    >
      <div
        aria-hidden="true"
        className="flex h-20 items-center justify-center gap-3"
      >
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={`list-loading-person flex size-12 items-center justify-center rounded-2xl border ${
              index === 1
                ? "border-primary/20 bg-primary/12 text-primary"
                : "border-border/70 bg-muted text-muted-foreground"
            }`}
            style={{ animationDelay: `${index * 180}ms` }}
          >
            <UserRound size={24} strokeWidth={1.6} />
          </span>
        ))}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <div
        aria-hidden="true"
        className="mt-6 w-full max-w-56 space-y-2.5 rounded-2xl border border-border/50 bg-muted/30 p-3.5"
      >
        {["w-3/4", "w-1/2", "w-2/3"].map((width, index) => (
          <div
            key={width}
            className="list-loading-row flex items-center gap-3"
            style={{ animationDelay: `${index * 180}ms` }}
          >
            <span className="size-6 shrink-0 rounded-full bg-primary/10" />
            <span className={`h-1.5 rounded-full bg-primary/10 ${width}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
