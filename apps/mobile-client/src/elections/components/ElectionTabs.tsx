import { BottomNavigation } from "@org/ui";
import { List, Settings2, Users, ClipboardList, BarChart3 } from "lucide-react";

interface ElectionTabsProps {
  tab: number;
  setTab: (tab: number) => void;
  round: any;
  admin: boolean;
}

export function ElectionTabs({ tab, setTab, round, admin }: ElectionTabsProps) {
  const tabs = [
    { id: 0, label: "Ứng viên", icon: List },
    { id: 1, label: "Kiểm phiếu", icon: Users },
    { id: 2, label: "Log sự kiện", icon: ClipboardList },
    {
      id: 3,
      label: "Kết quả",
      icon: BarChart3,
      disabled: !round,
    },
    ...(admin
      ? [
          {
            id: 4,
            label: "Cài đặt",
            icon: Settings2,
            disabled: false,
          },
        ]
      : []),
  ];

  return (
    <BottomNavigation
      aria-label="Quản trị bầu cử"
      className="fixed bottom-0 left-0 right-0 z-50 flex w-full items-center justify-center border-t border-[#cfd2c9] bg-white px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2"
      contentClassName="flex w-full max-w-6xl justify-between p-1"
      itemClassName={({ active, disabled }) =>
        `px-1 py-1.5 text-[10px] sm:px-3 sm:text-xs font-medium transition-colors ${disabled ? "pointer-events-none opacity-40" : active ? "font-semibold text-[#1c1b18]" : "text-[#8a8881] hover:text-[#1c1b18]"}`
      }
      labelClassName="text-center leading-tight sm:whitespace-nowrap"
      items={tabs.map(({ id, label, disabled, icon: Icon }) => ({
        id,
        label,
        disabled,
        active: tab === id,
        onSelect: () => setTab(id),
        icon: (
          <Icon
            size={20}
            strokeWidth={tab === id ? 2.25 : 1.5}
            className={tab === id ? "text-[#1c1b18]" : "text-[#8a8881]"}
          />
        ),
      }))}
    />
  );
}
