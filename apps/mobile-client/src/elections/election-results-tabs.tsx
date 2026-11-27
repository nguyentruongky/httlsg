interface ElectionResultsTabsProps {
  resultTab: "candidates" | "ballots";
  setResultTab: (tab: "candidates" | "ballots") => void;
}

export function ElectionResultsTabs({
  resultTab,
  setResultTab,
}: ElectionResultsTabsProps) {
  return (
    <div
      className="flex flex-wrap gap-2 border-b border-[#e4e5de] pb-3"
      aria-label="Nội dung kết quả"
    >
      {(
        [
          ["candidates", "Kết quả ứng viên"],
          ["ballots", "Phiếu bầu"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={resultTab === value}
          onClick={() => setResultTab(value)}
          className={`min-h-11 rounded-xl px-5 font-semibold ${
            resultTab === value
              ? "bg-[#215e3d] text-white"
              : "text-[#60635b] hover:bg-stone-100"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
