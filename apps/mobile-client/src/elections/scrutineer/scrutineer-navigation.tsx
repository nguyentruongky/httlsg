import { BottomNavigation } from "@org/ui";
import { FileText, Archive } from "lucide-react";
export function ScrutineerNavigation({
  tab,
  closed,
  ticketCount,
  onChange,
}: {
  tab: "entry" | "tickets";
  closed: boolean;
  ticketCount: number;
  onChange: (tab: "entry" | "tickets") => void;
}) {
  const selected = closed ? "tickets" : tab;
  return (
    <BottomNavigation
      aria-label="Công việc kiểm phiếu"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[#e4e2da] bg-[#f8f7f3] px-4 pb-[env(safe-area-inset-bottom)]"
      itemClassName={({ active }) =>
        `min-h-20 text-sm font-semibold ${active ? "text-[#20211d]" : "text-[#929087]"} disabled:opacity-50`
      }
      items={(
        [
          { id: "entry", label: "Nhập phiếu", icon: FileText },
          {
            id: "tickets",
            label: `Phiếu của tôi (${ticketCount})`,
            icon: Archive,
          },
        ] as const
      ).map(({ id, label, icon: Icon }) => ({
        id,
        label,
        active: selected === id,
        disabled: closed && id === "entry",
        onSelect: () => onChange(id),
        icon: <Icon size={25} strokeWidth={selected === id ? 2 : 1.6} />,
      }))}
    />
  );
}
