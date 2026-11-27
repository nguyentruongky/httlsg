import { ElectionCard } from "./ElectionCard";

interface ElectionListViewProps {
  elections: any[];
  admin: boolean;
  onChanged: () => Promise<unknown>;
  onDeleted: (id: number) => void | Promise<void>;
}

export function ElectionListView({
  elections,
  admin,
  onChanged,
  onDeleted,
}: ElectionListViewProps) {
  const electionsArray = Array.isArray(elections) ? elections : [];

  const upcoming = electionsArray.filter(
    (e) => e && e.status !== "archived" && !e.ended_at,
  );
  const past = electionsArray.filter(
    (e) => e && (e.status === "archived" || e.ended_at),
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 pb-24">
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Sắp diễn ra</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => (
              <ElectionCard
                key={e.id}
                election={e}
                admin={admin}
                onChanged={onChanged}
                onDeleted={onDeleted}
              />
            ))}
          </div>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Đã kết thúc</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((e) => (
              <ElectionCard
                key={e.id}
                election={e}
                admin={admin}
                onChanged={onChanged}
                onDeleted={onDeleted}
              />
            ))}
          </div>
        </section>
      )}
      {electionsArray.length === 0 && (
        <p className="text-sm text-[#6b6963]">Chưa có cuộc bầu cử nào.</p>
      )}
    </main>
  );
}
