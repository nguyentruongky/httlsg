import { cn } from "@org/ui";

export function AdminTicketFilters({
  teams,
  team,
  onTeam,
}: {
  teams: Array<{ id: string; name: string }>;
  team: string;
  onTeam: (value: string) => void;
}) {
  const chips = [{ id: "all", name: "Tất cả" }, ...teams];
  return (
    <div
      role="group"
      aria-label="Lọc theo tổ"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {chips.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={team === item.id}
          onClick={() => onTeam(item.id)}
          className={cn(
            "min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
            team === item.id
              ? "border-[#215e3d] bg-[#215e3d] text-white"
              : "border-[#e6e4dd] bg-white text-[#60635b] hover:bg-stone-50",
          )}
        >
          {item.name}
        </button>
      ))}
    </div>
  );
}