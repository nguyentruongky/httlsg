"use client";
import { Building2, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, departments, DEPARTMENT_TYPE_LABELS } from "@org/core";
import { Card, ErrorMessage } from "@org/ui";
import { navigateClient } from "./client-router";

export function DepartmentManagement() {
  const counts = useQuery({
    queryKey: ["admin-departments", "counts"],
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: false,
    queryFn: () =>
      apiRequest<{ counts: Record<string, number> }>(
        "/api/admin/departments?view=counts",
      ),
  });
  return (
    <div className="space-y-6">
      <h1 data-scroll-top-bar className="sticky top-[var(--list-sticky-top,0px)] z-30 flex items-center gap-3 bg-background py-3 text-2xl font-semibold">
        <Building2 className="shrink-0 text-primary" aria-hidden="true" />
        Ban ngành - Ban hát lễ
      </h1>
      {counts.error && <ErrorMessage error={counts.error} />}
      {(["choir", "ministry", "other"] as const).map((type) => {
        const options = departments.filter(
          (item) => item.departmentType === type,
        );
        if (!options.length) return null;
        return (
          <section key={type} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {DEPARTMENT_TYPE_LABELS[type]}
            </h2>
            <Card className="divide-y px-5">
              {options.map((item) => (
                <a
                  key={item.id}
                  href={`/dashboard/departments/${encodeURIComponent(item.id)}`}
                  onClick={(event) => {
                    event.preventDefault();
                    navigateClient(
                      `/dashboard/departments/${encodeURIComponent(item.id)}`,
                    );
                  }}
                  aria-label={`Chi tiết ${item.name}`}
                  className="flex min-h-16 items-center gap-3 py-3 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 flex-1">
                    <p className="wrap-break-word font-medium">{item.name}</p>
                    {counts.data && (
                      <p className="text-sm text-muted-foreground">
                        {counts.data.counts[item.id] ?? 0} thành viên
                      </p>
                    )}
                  </div>
                  <ChevronRight
                    className="size-5 shrink-0"
                    aria-hidden="true"
                  />
                </a>
              ))}
            </Card>
          </section>
        );
      })}
    </div>
  );
}
