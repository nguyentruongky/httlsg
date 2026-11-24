const commands = [
  ["Tên hoặc số", "lọc ứng viên (VD: tran van, 14)"],
  ["-số + Enter", "chọn ứng viên theo vị trí trong kết quả lọc"],
  ["Enter", "chọn khi chỉ có 1 kết quả"],
  ["-pt + Enter", "lưu phiếu trắng"],
  ["-bhl + Enter", "lưu phiếu bất hợp lệ"],
  ["-s + Enter", "lưu phiếu đang nhập"],
];
export function EntryInstructions() {
  return (
    <ul
      aria-label="Hướng dẫn lệnh kiểm phiếu"
      className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#60605a] sm:text-sm"
    >
      {commands.map(([command, description]) => (
        <li key={command} className="inline-flex items-center gap-2">
          <kbd className="whitespace-nowrap rounded border font-bold border-[#e3e1d9] bg-[#f8f7f3] px-2 py-1 font-mono">
            {command}
          </kbd>
          <span>{description}</span>
        </li>
      ))}
    </ul>
  );
}
