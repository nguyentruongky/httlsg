import { electionPhase, ELECTION_PHASE_LABELS } from "@org/core";
import type { AssignedElectionRound } from "@org/core";
import {
  ScrutineerExportMenu,
  type ScrutineerExportKind,
} from "./scrutineer-export-menu";
export function ScrutineerHeader({
  name,
  round,
  onExport,
  exporting,
}: {
  name: string;
  round?: AssignedElectionRound;
  onExport: (kind: ScrutineerExportKind) => void;
  exporting: boolean;
}) {
  return (
    <header className="flex shrink-0 items-start justify-between gap-4 pb-1">
      <div className="min-w-0">
        <p className="text-sm text-[#60605a] sm:text-lg">
          Người nhập phiếu:{" "}
          <strong className="font-semibold text-[#20211d]">{name}</strong>
        </p>
        <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-4xl">
          {round?.election_name ?? "Phòng kiểm phiếu"}
        </h1>
        {round && (
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#60605a] sm:text-lg">
            <span>{round.assignment.team_name ?? "Chưa phân tổ"}</span>
            <span
              className={`inline-flex items-center gap-2 ${round.status === "open" ? "text-[#21633f]" : ""}`}
            >
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${round.status === "open" ? "bg-[#8eaa97]" : "bg-[#aaa79d]"}`}
              />
              {ELECTION_PHASE_LABELS[electionPhase(round)]}
            </span>
          </p>
        )}
      </div>
      <ScrutineerExportMenu
        available={Boolean(round)}
        finished={
          round?.status === "closed" && Boolean(round.assignment.team_id)
        }
        busy={exporting}
        onExport={onExport}
      />
    </header>
  );
}
