import { EntryInstructions } from "./entry-instructions";
import type { RefObject } from "react";
import { Input } from "@org/ui";
import { entryPanel } from "./styles";
export function EntrySearch({
  value,
  onChange,
  onCommand,
  inputRef,
  disabled,
  hint,
}: {
  value: string;
  onChange: (value: string) => void;
  onCommand: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  disabled: boolean;
  hint: string;
}) {
  return (
    <section className={`${entryPanel} shrink-0 p-4 sm:p-6`}>
      <Input
        id="election-command"
        ref={inputRef}
        autoFocus
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            onCommand();
          }
        }}
        placeholder="Tìm tên hoặc số ứng viên (VD: tran van, 14) • -2 chọn vị trí 2 • -pt phiếu trắng • -bhl bất hợp lệ • -s lưu phiếu…"
        className="h-14 rounded-xl border-[#e1dfd6] bg-[#f8f7f3] px-4 text-base shadow-none placeholder:text-[#929087] focus-visible:ring-[#21633f] sm:h-16 sm:text-lg"
      />
      {hint && (
        <p role="status" className="mt-3 text-sm text-[#68665e]">
          {hint}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <EntryInstructions />
      </div>
    </section>
  );
}
