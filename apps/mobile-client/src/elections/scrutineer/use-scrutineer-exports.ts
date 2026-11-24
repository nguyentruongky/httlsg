import { printTeamMinutes } from "./print-team-minutes";
import { useRef, useState } from "react";
import { authenticatedFetch, type AssignedElectionRound } from "@org/core";
import { downloadElectionFile, exportElectionBackup } from "../local-election";
import type { ScrutineerExportKind } from "./scrutineer-export-menu";
const filename = (round: AssignedElectionRound) =>
  `E${round.election_id}_T${round.assignment.team_id ?? "unassigned"}`;
export async function exportScrutineerJson(
  userId: string,
  round: AssignedElectionRound,
) {
  const backup = await exportElectionBackup(userId, round.id);
  downloadElectionFile(
    new Blob(
      [
        JSON.stringify(
          {
            ...backup,
            election_id: round.election_id,
            team_id: round.assignment.team_id,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
    `${filename(round)}.json`,
  );
}
export function useScrutineerExports(
  userId: string | undefined,
  round: AssignedElectionRound | undefined,
  run: (fn: () => Promise<unknown>) => Promise<void>,
) {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const exportFile = (kind: ScrutineerExportKind) =>
    void run(async () => {
      if (!userId || !round || inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      try {
        if (kind === "json") {
          await exportScrutineerJson(userId, round);
          return;
        }
        if (kind === "log") {
          const backup = await exportElectionBackup(userId, round.id);
          const header = {
            election_id: round.election_id,
            election_name: round.election_name,
            team_id: round.assignment.team_id,
            team_name: round.assignment.team_name,
            user_id: userId,
            exported_at: backup.exported_at,
            full_user_chain_valid: backup.chain_valid,
          };
          const lines = [
            JSON.stringify(header),
            ...backup.actions
              .filter((action) => action.round_id === round.id)
              .map((action) => JSON.stringify(action)),
          ];
          downloadElectionFile(
            new Blob([lines.join("\n") + "\n"], {
              type: "text/plain;charset=utf-8",
            }),
            `${filename(round)}.log`,
          );
          return;
        }
        const response = await authenticatedFetch(
          `/api/rounds/${round.id}/team-report?format=${kind === "print" ? "html" : kind}`,
        );
        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(
            error?.message ?? "Không thể xuất tài liệu kiểm phiếu.",
          );
        }
        if (kind === "print") {
          await printTeamMinutes(await response.text());
          return;
        }
        downloadElectionFile(
          await response.blob(),
          `${filename(round)}_${kind === "xlsx" ? "ket-qua" : "bien-ban"}.${kind}`,
        );
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    });
  return { busy, exportFile };
}
