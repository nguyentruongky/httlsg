import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Check, ChevronRight, Search, X } from "lucide-react";
import {
  AgeRangeSchema,
  departments,
  areas,
  locations,
  type DirectoryQuery,
} from "@org/core";
import { Button, Input, NavigationDialog, cn } from "@org/ui";
export type MemberFiltersValue = Pick<
  DirectoryQuery,
  "departmentIds" | "area" | "location" | "minAge" | "maxAge" | "ageUnknownOnly"
>;
export const emptyMemberFilters: MemberFiltersValue = {
  departmentIds: [],
  area: "all",
  location: "all",
  ageUnknownOnly: false,
  minAge: null,
  maxAge: null,
};
type Page = "overview" | "departments" | "areas" | "locations" | "age";
const titles: Record<Page, string> = {
  overview: "Bộ lọc",
  departments: "Ban ngành",
  areas: "Khu vực",
  locations: "Phường/xã",
  age: "Khoảng tuổi",
};
export function ageRangeLabel(
  min: number | null,
  max: number | null,
  unknownOnly = false,
) {
  if (unknownOnly) return "Không có dữ liệu tuổi";
  return min === null && max === null
    ? "Tất cả độ tuổi"
    : min === null
      ? `Đến ${max} tuổi`
      : max === null
        ? `Từ ${min} tuổi`
        : `${min}–${max} tuổi`;
}
export function MemberFilters({
  open,
  onOpenChange,
  value,
  onApply,
  departmentOptions = departments,
  areaOptions = areas,
  locationOptions = locations,
}: {
  departmentOptions?: readonly { id: string; name: string }[];
  areaOptions?: readonly string[];
  locationOptions?: readonly string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: MemberFiltersValue;
  onApply: (value: MemberFiltersValue) => void;
}) {
  const [draft, setDraft] = useState(value),
    [page, setPage] = useState<Page>("overview"),
    [direction, setDirection] = useState<"forward" | "back">("forward");
  const [ageUnknownOnly, setAgeUnknownOnly] = useState(false);
  const [search, setSearch] = useState(""),
    [minText, setMinText] = useState(""),
    [maxText, setMaxText] = useState(""),
    [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null),
    searchInput = useRef<HTMLInputElement>(null),
    scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) {
      setDraft(value);
      setPage("overview");
      setDirection("forward");
      setSearch("");
      setAgeUnknownOnly(value.ageUnknownOnly);
      setMinText(value.minAge?.toString() ?? "");
      setMaxText(value.maxAge?.toString() ?? "");
      setError("");
    }
  }, [open, value]);
  useEffect(() => {
    if (!open) return;
    scroll.current?.scrollTo?.({ top: 0 });
    // Match every pushed screen: focus its heading without scrolling or opening
    // the mobile keyboard during the transition. Search receives focus on tap.
    heading.current?.focus({ preventScroll: true });
  }, [open, page]);
  function navigate(next: Page) {
    setDirection(next === "overview" ? "back" : "forward");
    setPage(next);
    setSearch("");
    setError("");
  }
  function validateAge() {
    const result = AgeRangeSchema.safeParse({
      ageUnknownOnly,
      minAge: minText === "" ? null : Number(minText),
      maxAge: maxText === "" ? null : Number(maxText),
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Khoảng tuổi không hợp lệ.");
      return null;
    }
    setError("");
    return result.data;
  }
  function back() {
    if (page === "overview") {
      onOpenChange(false);
      return;
    }
    if (page === "age" && !validateAge()) return;
    navigate("overview");
  }
  function apply() {
    const range = validateAge();
    if (range) {
      onApply({ ...draft, ...range });
      onOpenChange(false);
    }
  }
  function reset() {
    setDraft(emptyMemberFilters);
    setAgeUnknownOnly(false);
    setMinText("");
    setMaxText("");
    setError("");
  }
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .toLocaleLowerCase("vi");
  const visibleLocations = locationOptions.filter((v) =>
    normalize(v).includes(normalize(search.trim())),
  );
  const min = minText === "" ? null : Number(minText),
    max = maxText === "" ? null : Number(maxText);
  return (
    <NavigationDialog.Root open={open} onOpenChange={onOpenChange}>
      <NavigationDialog.Portal>
        <NavigationDialog.Overlay className="fixed inset-0 z-50 bg-black/15" />
        <NavigationDialog.Content
          className="filter-navigation fixed inset-y-0 left-1/2 z-[60] flex h-dvh w-full max-w-md flex-col overflow-hidden border-x bg-background outline-none"
          aria-describedby="filter-description"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            heading.current?.focus({ preventScroll: true });
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            back();
          }}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <header className="shrink-0 border-b bg-card/95 px-3 pt-[max(.5rem,env(safe-area-inset-top))]">
            <div className="flex min-h-16 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="touch"
                className="gap-1 px-2 text-primary"
                onClick={back}
                aria-label={
                  page === "overview" ? "Đóng bộ lọc" : "Quay lại bộ lọc"
                }
              >
                <ArrowLeft size={22} />
                <span>{page === "overview" ? "Danh sách" : "Bộ lọc"}</span>
              </Button>
              <NavigationDialog.Title
                ref={heading}
                tabIndex={-1}
                className="min-w-0 flex-1 text-center text-lg font-semibold outline-none"
              >
                {titles[page]}
              </NavigationDialog.Title>
              {page === "overview" ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="px-2 text-primary"
                  onClick={reset}
                >
                  Đặt lại
                </Button>
              ) : (
                <span className="w-20" />
              )}
            </div>
          </header>
          <NavigationDialog.Description
            id="filter-description"
            className="sr-only"
          >
            Chọn điều kiện tìm thành viên. Các thay đổi chỉ được áp dụng khi
            nhấn Áp dụng.
          </NavigationDialog.Description>
          <div
            key={page}
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              direction === "forward"
                ? "filter-page-forward"
                : "filter-page-back",
            )}
          >
            {page === "locations" && (
              <div className="shrink-0 border-b bg-card p-4">
                <div className="relative">
                  <Search
                    size={20}
                    className="pointer-events-none absolute left-3 top-4 text-muted-foreground"
                  />
                  <Input
                    ref={searchInput}
                    type="search"
                    aria-label="Tìm phường/xã"
                    placeholder="Tìm phường, xã, đặc khu…"
                    className="h-14 rounded-xl pl-10 pr-12 text-base"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      type="button"
                      aria-label="Xóa tìm kiếm phường/xã"
                      className="absolute right-0 top-0 flex size-14 items-center justify-center"
                      onClick={() => setSearch("")}
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            )}
            <div
              ref={scroll}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6"
            >
              {page === "overview" && (
                <>
                  <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                    Chọn điều kiện để tìm thành viên phù hợp.
                  </p>
                  <div className="overflow-hidden rounded-2xl border bg-card">
                    <FilterRow
                      label="Ban ngành"
                      summary={
                        draft.departmentIds.length
                          ? draft.departmentIds
                              .map(
                                (id) =>
                                  departmentOptions.find((d) => d.id === id)
                                    ?.name,
                              )
                              .join(", ")
                          : "Tất cả ban ngành"
                      }
                      onClick={() => navigate("departments")}
                    />
                    <FilterRow
                      label="Khu vực"
                      summary={
                        draft.area === "all" ? "Tất cả khu vực" : draft.area
                      }
                      onClick={() => navigate("areas")}
                    />
                    <FilterRow
                      label="Phường/xã"
                      summary={
                        draft.location === "all"
                          ? "Tất cả phường/xã"
                          : draft.location
                      }
                      onClick={() => navigate("locations")}
                    />
                    <FilterRow
                      label="Khoảng tuổi"
                      summary={ageRangeLabel(min, max, ageUnknownOnly)}
                      onClick={() => navigate("age")}
                    />
                  </div>
                  <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                    Khi chọn nhiều ban ngành, kết quả gồm thành viên thuộc ít
                    nhất một ban đã chọn.
                  </p>
                </>
              )}
              {page === "departments" && (
                <>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p
                      aria-live="polite"
                      className="text-sm text-muted-foreground"
                    >
                      Đã chọn {draft.departmentIds.length} ban ngành
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-primary"
                      onClick={() =>
                        setDraft((v) => ({ ...v, departmentIds: [] }))
                      }
                    >
                      Bỏ chọn tất cả
                    </Button>
                  </div>
                  <div className="divide-y overflow-hidden rounded-2xl border bg-card">
                    {departmentOptions.map((d) => (
                      <label
                        key={d.id}
                        className="flex min-h-16 cursor-pointer items-center gap-3 px-4 py-4 text-base"
                      >
                        <input
                          type="checkbox"
                          className="size-5 shrink-0 accent-primary"
                          checked={draft.departmentIds.includes(d.id)}
                          onChange={(e) =>
                            setDraft((v) => ({
                              ...v,
                              departmentIds: e.target.checked
                                ? [...v.departmentIds, d.id]
                                : v.departmentIds.filter((id) => id !== d.id),
                            }))
                          }
                        />
                        <span>{d.name}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
              {page === "areas" && (
                <SelectionList>
                  {["all", ...areaOptions].map((area) => (
                    <Selection
                      key={area}
                      label={area === "all" ? "Tất cả khu vực" : area}
                      selected={draft.area === area}
                      onClick={() => {
                        setDraft((v) => ({
                          ...v,
                          area: area as MemberFiltersValue["area"],
                        }));
                        navigate("overview");
                      }}
                    />
                  ))}
                </SelectionList>
              )}
              {page === "locations" && (
                <SelectionList>
                  <Selection
                    label="Tất cả phường/xã"
                    selected={draft.location === "all"}
                    onClick={() => {
                      setDraft((v) => ({ ...v, location: "all" }));
                      navigate("overview");
                    }}
                  />
                  {visibleLocations.map((location) => (
                    <Selection
                      key={location}
                      label={location}
                      selected={draft.location === location}
                      onClick={() => {
                        setDraft((v) => ({ ...v, location }));
                        navigate("overview");
                      }}
                    />
                  ))}
                  {!visibleLocations.length && (
                    <p role="status" className="p-5 text-muted-foreground">
                      Không tìm thấy phường/xã phù hợp.
                    </p>
                  )}
                </SelectionList>
              )}
              {page === "age" && (
                <>
                  <p className="mb-5 text-sm text-muted-foreground">
                    Nhập tuổi tối thiểu, tối đa hoặc chọn nhanh một khoảng tuổi.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="text-base font-medium">
                      Tuổi từ
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={130}
                        step={1}
                        className="mt-2 h-14 text-base"
                        placeholder="Không giới hạn"
                        value={minText}
                        onChange={(e) => {
                          setAgeUnknownOnly(false);
                          setMinText(e.target.value);
                          setError("");
                        }}
                        aria-invalid={Boolean(error)}
                      />
                    </label>
                    <label className="text-base font-medium">
                      Tuổi đến
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={130}
                        step={1}
                        className="mt-2 h-14 text-base"
                        placeholder="Không giới hạn"
                        value={maxText}
                        onChange={(e) => {
                          setAgeUnknownOnly(false);
                          setMaxText(e.target.value);
                          setError("");
                        }}
                        aria-invalid={Boolean(error)}
                      />
                    </label>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {[
                      { label: "Tất cả độ tuổi", min: null, max: null },
                      { label: "0–12 tuổi", min: 0, max: 12 },
                      { label: "13–18 tuổi", min: 13, max: 18 },
                      { label: "19–30 tuổi", min: 19, max: 30 },
                      { label: "30–40 tuổi", min: 30, max: 40 },
                      { label: "40–50 tuổi", min: 40, max: 50 },
                      { label: "Từ 50 tuổi", min: 50, max: null },
                    ].map((preset) => (
                      <Button
                        key={preset.label}
                        type="button"
                        size="touch"
                        variant={
                          !ageUnknownOnly &&
                          min === preset.min &&
                          max === preset.max
                            ? "default"
                            : "outline"
                        }
                        aria-pressed={
                          !ageUnknownOnly &&
                          min === preset.min &&
                          max === preset.max
                        }
                        onClick={() => {
                          setAgeUnknownOnly(false);
                          setMinText(preset.min?.toString() ?? "");
                          setMaxText(preset.max?.toString() ?? "");
                          setError("");
                        }}
                      >
                        {preset.label}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      size="touch"
                      className="h-auto min-h-12 min-w-0 px-2 py-2 text-[14px] leading-snug"
                      variant={ageUnknownOnly ? "default" : "outline"}
                      aria-pressed={ageUnknownOnly}
                      onClick={() => {
                        setAgeUnknownOnly(true);
                        setMinText("");
                        setMaxText("");
                        setError("");
                      }}
                    >
                      Không có dữ liệu tuổi
                    </Button>
                  </div>
                  <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                    {ageUnknownOnly
                      ? "Chỉ hiển thị hồ sơ chưa có ngày sinh hợp lệ để tính tuổi."
                      : "Tuổi được tính từ ngày sinh. Khi lọc theo khoảng tuổi, các hồ sơ chưa có ngày sinh sẽ không hiển thị."}
                  </p>
                </>
              )}
            </div>
          </div>
          <footer className="shrink-0 border-t bg-card px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {error && (
              <p role="alert" className="mb-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="button"
              size="touch"
              className="min-h-14 w-full rounded-xl text-base"
              onClick={page === "overview" ? apply : back}
            >
              {page === "overview" ? "Áp dụng" : "Xong"}
            </Button>
          </footer>
        </NavigationDialog.Content>
      </NavigationDialog.Portal>
    </NavigationDialog.Root>
  );
}
function FilterRow({
  label,
  summary,
  onClick,
}: {
  label: string;
  summary: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-20 w-full items-center gap-3 border-b px-4 py-4 text-left last:border-0 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium">{label}</span>
        <span className="mt-1 block break-words text-sm text-muted-foreground">
          {summary}
        </span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-muted-foreground" />
    </button>
  );
}
function SelectionList({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y overflow-hidden rounded-2xl border bg-card">
      {children}
    </div>
  );
}
function Selection({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-3 px-4 py-4 text-left text-base hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="flex-1">{label}</span>
      {selected && <Check size={21} className="shrink-0 text-primary" />}
    </button>
  );
}
