import { LoadingView } from "@org/ui";
import { createElectionPolling } from "./polling";
import { useEffect, useState } from "react";
import { apiRequest } from "@org/core";
import { AuditSummary } from "./audit-summary";
import { ActivityLogs, ConnectionLogs, SubmissionLogs } from "./audit-log-list";
import type { AuditData } from "./audit-types";

import { useClientRoute } from "../client-router";

type Tab = "connections" | "submissions" | "activity";
export function ElectionAudit({
  election,
  run,
}: {
  election: number;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const route = useClientRoute();
  const onDetails = route === `/client/admin/elections/${election}`;
  const [data, setData] = useState<AuditData | null>(null);
  const [tab, setTab] = useState<Tab>("connections");
  const [invalidOnly, setInvalidOnly] = useState(false);
  useEffect(() => {
    if (!onDetails) return;
    setData(null);
    const polling = createElectionPolling({
      load: async (signal) => {
        const value = await apiRequest<AuditData>(
          `/api/elections/${election}/audit`,
          { signal },
        );
        if (signal.aborted) return false;
        setData(value);
        return value.polling === true;
      },
      onError: (error) =>
        run(async () => {
          throw error;
        }),
    });
    return polling.stop;
  }, [election, run, onDetails]);
  if (!data) return <LoadingView message="Đang tải nhật ký…" />;
  const connections = data.connections.items.filter(
    (item) => !invalidOnly || item.status === "invalid",
  );
  const count =
    tab === "connections"
      ? connections.length
      : tab === "submissions"
        ? data.submissions.items.length
        : data.items.length;
  return (
    <div className="space-y-4 text-[#20231f]">
      <AuditSummary
        data={data}
        onInvalid={() => {
          setTab("connections");
          setInvalidOnly(true);
        }}
      />
      <section className="overflow-hidden rounded-xl border-2 border-[#cfd2c9] bg-white">
        <div
          className="flex flex-wrap gap-2 border-b border-[#e6e4dd] p-3"
          aria-label="Loại nhật ký"
        >
          {(
            [
              ["connections", "Kết nối"],
              ["submissions", "Gửi phiếu"],
              ["activity", "Hoạt động khác"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
              className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${tab === value ? "bg-[#215e3d] text-white" : "text-stone-600 hover:bg-stone-100"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6e4dd] px-4 py-3 text-sm text-stone-500">
          <p>
            {data.polling ? "Cập nhật tự động · " : ""}Hiển thị {count} mục gần
            nhất (tối đa 1.000)
          </p>
          {tab === "connections" && (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-stone-700">
              <input
                type="checkbox"
                checked={invalidOnly}
                onChange={(event) => setInvalidOnly(event.target.checked)}
                className="h-4 w-4 accent-[#215e3d]"
              />
              Chỉ kết nối không hợp lệ
            </label>
          )}
        </div>
        {tab === "connections" && <ConnectionLogs items={connections} />}
        {tab === "submissions" && (
          <SubmissionLogs items={data.submissions.items} />
        )}
        {tab === "activity" && <ActivityLogs items={data.items} />}
        {count === 0 && (
          <p className="p-8 text-center text-sm text-stone-500">
            {invalidOnly && tab === "connections"
              ? "Không có kết nối không hợp lệ trong nhật ký gần nhất."
              : "Chưa có hoạt động."}
          </p>
        )}
      </section>
    </div>
  );
}
