import { ChevronDown } from "lucide-react";
import { cn } from "@org/ui";

interface ElectionResultsCandidateTableProps {
  rows: any[];
  sort: "votes" | "name";
  setSort: (sort: "votes" | "name") => void;
  resultTab: "candidates" | "ballots";
}

export function ElectionResultsCandidateTable({
  rows,
  sort,
  setSort,
  resultTab,
}: ElectionResultsCandidateTableProps) {
  return (
    <>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="space-y-1.5">
          <h2
            id="election-candidate-results"
            className="text-xl font-bold tracking-tight text-[#1e211c] sm:text-2xl"
          >
            Kết quả ứng viên
          </h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0 mb-3">
          <div className="relative sm:w-56">
            <select
              aria-label="Sắp xếp kết quả"
              value={sort}
              onChange={(e) => setSort(e.target.value as "votes" | "name")}
              className="h-11 min-h-11 w-full appearance-none rounded-xl border border-[#e4e5de] bg-white pl-4 pr-10 text-base text-[#1e211c] outline-none focus-visible:ring-2 focus-visible:ring-[#216e4a]"
            >
              <option value="votes">Sắp xếp: Số phiếu</option>
              <option value="name">Sắp xếp: Họ tên</option>
            </select>
            <ChevronDown
              size={18}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#60635b]"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-165 table-fixed border-collapse text-left text-sm sm:text-base">
          <colgroup>
            <col className="w-[7%]" />
            <col />
            <col className="w-[9%]" />
            <col className="w-[26%]" />
          </colgroup>
          <thead>
            <tr className="border-y border-[#e4e5de] text-xs font-semibold uppercase tracking-wide text-[#60635b] sm:text-sm">
              <th scope="col" className="py-4 pr-3">
                STT
              </th>
              <th scope="col" className="py-4 pr-4">
                Họ tên
              </th>
              <th scope="col" className="py-4 pr-4 text-right">
                Phiếu
              </th>
              <th scope="col" className="py-4 text-right">
                % phiếu hợp lệ
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((result: any, index: number) => {
              const percent = Number(result.percent) || 0;
              const progress = Math.max(0, Math.min(100, percent));
              return (
                <tr
                  key={result.id}
                  className="border-b border-[#edeee8] transition-colors last:border-b-0 hover:bg-[#f9faf7]"
                >
                  <td className="py-4 pr-3 align-top tabular-nums text-[#60635b]">
                    {index + 1}
                  </td>
                  <td className="wrap-break-word py-4 pr-4 align-top font-medium text-[#1e211c]">
                    {result.full_name}
                  </td>
                  <td className="py-4 pr-4 text-right align-top font-semibold tabular-nums text-[#1e211c]">
                    {result.votes}
                  </td>
                  <td className="py-4 align-top">
                    <div className="flex min-h-6 items-center justify-end gap-3">
                      <div
                        role="progressbar"
                        aria-label={`Tỷ lệ phiếu hợp lệ của ${result.full_name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress}
                        className="h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-[#edeee8] sm:max-w-28"
                      >
                        <div
                          className="h-full rounded-full bg-[#216e4a] transition-[width] duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="w-14 shrink-0 text-right tabular-nums text-[#60635b]">
                        {percent.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td
                  colSpan={4}
                  className="py-10 text-center text-sm text-[#60635b]"
                >
                  Chưa có ứng viên trong cuộc bầu cử này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
