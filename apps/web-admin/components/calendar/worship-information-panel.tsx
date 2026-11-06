"use client";
import { useMemo } from "react";
import { Flag } from "lucide-react";
import {
  composeWorshipInformationRequest,
  findDuplicateWorshipHymns,
} from "@org/core";
import { WorshipMissingInformation } from "@org/ui";
/** Live draft analysis only; all mail is dispatched by the server on save. */
export function WorshipInformationPanel({ draft }: { draft: string }) {
  const information = useMemo(
    () => composeWorshipInformationRequest(draft),
    [draft],
  );
  const duplicates = useMemo(() => findDuplicateWorshipHymns(draft), [draft]);
  return (
    <section
      aria-label="Thông tin chương trình thờ phượng"
      className="space-y-3 rounded-xl border p-4"
    >
      <h2 className="font-semibold">Thông tin chương trình thờ phượng</h2>
      <WorshipMissingInformation missingFields={information.missingFields} />
      {duplicates.length > 0 && (
        <div
          role="alert"
          aria-label="Cảnh báo Thánh Ca trùng"
          className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-destructive"
        >
          <h3 className="flex items-center gap-2 font-semibold">
            <Flag className="size-4 shrink-0" aria-hidden="true" /> Có Thánh Ca
            bị trùng
          </h3>
          <ul className="space-y-2">
            {duplicates.map((item) => (
              <li key={item.hymn} className="break-words">
                <p className="font-medium">
                  {item.hymn} xuất hiện {item.occurrences.length} lần
                </p>
                <p className="text-sm">
                  {item.occurrences
                    .map(
                      (occurrence) =>
                        occurrence.section +
                        " (dòng " +
                        occurrence.lineNumber +
                        ")",
                    )
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-sm">
            Vui lòng kiểm tra lại. Bạn vẫn có thể lưu nếu đây là chủ ý.
          </p>
        </div>
      )}
    </section>
  );
}
