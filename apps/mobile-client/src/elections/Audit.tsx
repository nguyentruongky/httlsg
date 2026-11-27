import { useCallback, useEffect, useState } from "react";
import {
  apiRequest,
  useAuth,
} from "@org/core";

type Run = (fn: () => Promise<unknown>) => Promise<void>;

interface AuditProps {
  election: number;
  run: Run;
}

export function Audit({ election, run }: AuditProps) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    void run(async () =>
      setItems(
        (await apiRequest<any>(`/api/elections/${election}/audit`)).items,
      ),
    );
  }, [election, run]);
  return (
    <div className="rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {items.map((a) => (
        <details key={a.id}>
          <summary className="min-h-11 cursor-pointer text-sm">
            {new Date(a.created_at).toLocaleString("vi-VN")} · {a.full_name} ·{" "}
            {a.action}
          </summary>
          <pre className="overflow-auto rounded-lg bg-[#f8f7f3] p-3 text-xs">
            {JSON.stringify(a.payload, null, 2)}
          </pre>
        </details>
      ))}
    </div>
  );
}