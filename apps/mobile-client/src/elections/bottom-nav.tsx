import { BottomNavigation } from "@org/ui";
import { canCheckElection } from "@org/core";
import type { Round } from "./types";

interface BottomNavProps {
  round: Round;
  tab: "entry" | "tickets";
  onTabChange: (tab: "entry" | "tickets") => void;
}

export function BottomNav({ round, tab, onTabChange }: BottomNavProps) {
  const canCheck = canCheckElection(round);

  return (
    <BottomNavigation
      aria-label="Điều hướng kiểm phiếu"
      className="fixed bottom-0 left-0 right-0 z-50 flex w-full items-center justify-center border-t border-[#cfd2c9] bg-white px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2"
      contentClassName="flex w-full max-w-360 justify-between p-1"
      itemClassName={({ active, disabled }) =>
        `px-1 py-1.5 text-[10px] sm:px-3 sm:text-xs font-medium transition-colors ${active ? "font-semibold text-[#1c1b18]" : "text-[#8a8881] hover:text-[#1c1b18]"} ${disabled ? "pointer-events-none opacity-40" : ""}`
      }
      labelClassName="text-center leading-tight sm:whitespace-nowrap"
      items={(
        [
          { id: "entry", label: "Nhập phiếu" },
          { id: "tickets", label: "Phiếu đã nhập" },
        ] as const
      ).map(({ id, label }) => ({
        id,
        label,
        active: tab === id,
        disabled: id === "entry" && !canCheck,
        onSelect: () => onTabChange(id),
      }))}
    />
  );
}
