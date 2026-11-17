import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button, Input } from "@org/ui";
import { FilterChips, memberFilterChips } from "../filter-chips";
import { ProfileBackButton } from "../profile-back-button";
import type { MemberDirectoryState } from "./use-member-directory";
type Props = Pick<
  MemberDirectoryState,
  | "team"
  | "search"
  | "setSearch"
  | "count"
  | "setOpen"
  | "options"
  | "setOptions"
  | "departmentOptions"
>;
export function DirectoryToolbar({
  team,
  search,
  setSearch,
  count,
  setOpen,
  options,
  setOptions,
  departmentOptions,
}: Props) {
  return (
    <div className="relative isolate z-20 shrink-0 bg-background px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
      {team && (
        <div className="mb-2">
          <ProfileBackButton />
        </div>
      )}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-label="Tìm thành viên"
            placeholder="Tìm tên, gia đình, ban ngành…"
            maxLength={200}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 min-h-11 rounded-lg bg-card pl-10 pr-10 text-base sm:text-sm"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
              }}
              aria-label="Xóa nội dung tìm kiếm"
              className="absolute right-0 top-0 flex size-11 items-center justify-center text-muted-foreground"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="relative size-11 shrink-0 rounded-lg bg-card"
          aria-label={`Bộ lọc${count ? `, ${count} tùy chọn đang áp dụng` : ""}`}
          onClick={() => {
            setOpen(true);
          }}
        >
          <SlidersHorizontal size={17} />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {count}
            </span>
          )}
        </Button>
      </div>
      <FilterChips
        chips={memberFilterChips(options, setOptions, departmentOptions)}
      />
    </div>
  );
}
