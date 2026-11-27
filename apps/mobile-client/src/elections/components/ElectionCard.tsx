import { ElectionActions } from "../election-actions";
import type { ElectionPhase } from "../domain/types";
import { ELECTION_PHASE_LABELS } from "../domain/types";

interface ElectionCardProps {
  election: {
    id: number;
    name?: string;
    description?: string;
    status: string;
    phase?: string;
    ended_at?: string;
    created_at?: string;
    ticket_count?: number;
    version: number;
  };
  admin: boolean;
  onChanged: () => Promise<unknown>;
  onDeleted: (id: number) => void | Promise<void>;
}

export function ElectionCard({ election, admin, onChanged, onDeleted }: ElectionCardProps) {
  const endedAt = election.ended_at
    ? new Date(election.ended_at).toLocaleDateString("vi-VN")
    : null;
  const createdAt = election.created_at
    ? new Date(election.created_at).toLocaleDateString("vi-VN")
    : "";
  const phaseLabel =
    ELECTION_PHASE_LABELS[
      (election.status === "archived"
        ? "closed"
        : (election.phase ?? "draft")) as ElectionPhase
    ] ?? "Không xác định";

  return (
    <article key={election.id} className="relative flex h-full">
      <a
        href={`/client/admin/elections/${election.id}`}
        className="flex flex-1 flex-col gap-3 h-full rounded-xl border border-[#e6e4dd] bg-white p-4"
      >
        <div className="min-w-0 flex-1 flex flex-col">
          <h3 className="truncate pr-12 font-semibold">
            {election.name ?? ""}
          </h3>
          <p className="mt-2 text-sm font-medium text-primary">
            {phaseLabel}
          </p>
          <div className="mt-2 text-sm text-[#6b6963] space-y-1 flex-1">
            <p>Tạo: {createdAt}</p>
            {endedAt && <p>Kết thúc: {endedAt}</p>}
            <p>
              Tổng số phiếu:{" "}
              {typeof election.ticket_count === "number"
                ? election.ticket_count
                : Number(election.ticket_count ?? 0)}
            </p>
          </div>
        </div>
        <span className="mt-auto text-sm font-semibold text-[#215e3d]">
          Vào phòng
        </span>
      </a>
      {admin && (
        <div className="absolute right-3 top-3">
          <ElectionActions
            election={{
              id: election.id,
              name: election.name ?? "",
              description: election.description ?? "",
              status: election.status ?? "draft",
              phase: election.phase ?? "draft",
              version: election.version ?? 0,
            }}
            onChanged={onChanged}
            onDeleted={onDeleted}
          />
        </div>
      )}
    </article>
  );
}