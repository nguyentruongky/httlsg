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
  return (
    <nav
      aria-label="Công việc kiểm phiếu"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[#e4e2da] bg-[#f8f7f3] px-4 pb-[env(safe-area-inset-bottom)]"
    >
      {(
        [
          { id: "entry", label: "Nhập phiếu", icon: FileText },
          {
            id: "tickets",
            label: `Phiếu của tôi (${ticketCount})`,
            icon: Archive,
          },
        ] as const
      ).map((item) => {
        const active = closed ? item.id === "tickets" : tab === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            disabled={closed && item.id === "entry"}
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(item.id)}
            className={`flex min-h-20 flex-1 flex-col items-center justify-center gap-1 text-sm font-semibold ${active ? "text-[#20211d]" : "text-[#929087]"} disabled:opacity-50`}
          >
            <Icon size={25} strokeWidth={active ? 2 : 1.6} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
