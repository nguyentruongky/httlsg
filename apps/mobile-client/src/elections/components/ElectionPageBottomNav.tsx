import { BottomNavigation } from "@org/ui";
import { FilePlus2, FileCheck2 } from "lucide-react";

interface ElectionPageBottomNavProps {
  roundData: unknown;
  tab: string;
  setTab: (tab: string) => void;
  showIcons?: boolean;
}

export function ElectionPageBottomNav({
  roundData,
  tab,
  setTab,
  showIcons = false,
}: ElectionPageBottomNavProps) {
  return (
    <BottomNavigation
      aria-label="Điều hướng kiểm phiếu"
      className="fixed bottom-0 left-0 right-0 z-50 flex w-full items-center justify-center border-t border-[#e6e4dd] bg-[#f8f7f3] px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2"
      contentClassName="flex w-full max-w-6xl justify-between p-1"
      itemClassName={({ active, disabled }) =>
        `px-3 py-1.5 text-xs transition-colors ${disabled ? "pointer-events-none opacity-40" : active ? "font-semibold text-[#1c1b18]" : "font-medium text-[#8a8881] hover:text-[#1c1b18]"}`
      }
      labelClassName="whitespace-nowrap"
      items={[
        { id: "entry", label: "Nhập phiếu", icon: FilePlus2 },
        { id: "tickets", label: "Phiếu của tôi", icon: FileCheck2 },
      ].map(({ id, label, icon: Icon }) => ({
        id,
        label,
        active: tab === id,
        disabled: !roundData,
        onSelect: () => setTab(id),
        icon: showIcons ? (
          <Icon
            size={20}
            strokeWidth={tab === id ? 2.25 : 1.5}
            className={tab === id ? "text-[#215e3d]" : "text-[#8a8881]"}
          />
        ) : undefined,
      }))}
    />
  );
}
