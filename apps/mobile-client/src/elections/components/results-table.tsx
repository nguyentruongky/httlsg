import type { ElectionResult } from "../domain/types";
import { sortResults, searchResults } from "../domain";

interface ResultsTableProps {
  results: ElectionResult[];
  sortBy: "votes" | "name" | "number";
  onSortChange: (sort: "votes" | "name" | "number") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ResultsTable({
  results,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
}: ResultsTableProps) {
  const filtered = searchResults(results, searchQuery);
  const sorted = sortResults(filtered, sortBy);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Tìm ứng viên..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="min-h-10 rounded-lg border border-[#e2e0d8] bg-[#f8f7f3] px-3 py-1.5 text-sm text-[#1c1b18] focus:border-[#215e3d] focus:outline-none flex-1 min-w-50"
        />
        <select
          value={sortBy}
          onChange={(e) =>
            onSortChange(e.target.value as "votes" | "name" | "number")
          }
          className="min-h-10 rounded-lg border border-[#e2e0d8] bg-white px-3 py-1.5 text-sm text-[#1c1b18] focus:border-[#215e3d] focus:outline-none"
        >
          <option value="votes">Sắp xếp: Số phiếu</option>
          <option value="name">Sắp xếp: Họ tên</option>
          <option value="number">Sắp xếp: Số ứng viên</option>
        </select>
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
            {sorted.map((result, index) => {
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
            {!sorted.length && (
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
    </div>
  );
}
