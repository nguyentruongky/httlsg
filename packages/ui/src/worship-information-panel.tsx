"use client";
import { useMemo } from "react";
import { Flag } from "lucide-react";
import {
  composeWorshipInformationRequest,
  findDuplicateWorshipHymns,
  isWorshipProgramText,
} from "@org/core";
import { WorshipMissingInformation } from "./worship-notification-panel";

export interface WorshipInformationPanelProps {
  draft: string;
}
/** Unified panel: missing worship information fields + duplicate hymn warnings. */
export function WorshipInformationPanel({
  draft,
}: WorshipInformationPanelProps) {
  const worship = isWorshipProgramText(draft);
  const information = useMemo(
    () => worship ? composeWorshipInformationRequest(draft) : null,
    [draft, worship],
  );
  const duplicates = useMemo(
    () => worship ? findDuplicateWorshipHymns(draft) : [],
    [draft, worship],
  );
  if (!information || (!information.missingFields.length && !duplicates.length))
    return null;
  return (
    <section
      aria-label="Thông tin chương trình thờ phượng"
      className="space-y-3 rounded-xl"
    >
      {information.missingFields.length > 0 && (
        <div className="rounded-lg border border-amber-700 bg-amber-200 p-3 mt-2">
          <WorshipMissingInformation
            missingFields={information.missingFields}
          />
        </div>
      )}
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
              <li key={item.hymn} className="wrap-break-word">
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
