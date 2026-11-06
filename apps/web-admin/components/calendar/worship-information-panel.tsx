"use client";
import { useMemo } from "react";
import { composeWorshipInformationRequest } from "@org/core";
import { WorshipMissingInformation } from "@org/ui";
/** Live draft analysis only; all mail is dispatched by the server on save. */
export function WorshipInformationPanel({ draft }: { draft: string }) {
  const information = useMemo(
    () => composeWorshipInformationRequest(draft),
    [draft],
  );
  return (
    <section
      aria-label="Thông tin chương trình thờ phượng"
      className="space-y-3 rounded-xl border p-4"
    >
      <h2 className="font-semibold">Thông tin chương trình thờ phượng</h2>
      <WorshipMissingInformation missingFields={information.missingFields} />
    </section>
  );
}
