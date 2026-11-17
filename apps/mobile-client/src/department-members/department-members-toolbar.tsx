import {
  ArrowLeft,
  ArrowRightLeft,
  ListChecks,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@org/ui";
import { ListSearchToolbar } from "../list-controls";
import { DepartmentMenu } from "../department-menu";
import type { DepartmentMembersState } from "./use-department-members";
export function DepartmentMembersToolbar({
  state,
  department,
  embedded,
}: {
  state: DepartmentMembersState;
  department: { id: string; name: string };
  embedded: boolean;
}) {
  const {
    departmentListHref,
    readOnly,
    fullMembers,
    boardYear,
    setBoardYear,
    setShowYears,
    searchAll,
    setSearchAll,
    search,
    setSearch,
    selecting,
    selected,
    setMoving,
    setChangingStatus,
    setConfirmRemove,
    filterStatuses,
    setFilterOpen,
    searchInput,
    leaveSelection,
    openBoard,
    add,
    bulk,
    busy,
    findProfiles,
    items,
    hasCandidates,
    activeFilterChips,
  } = state;
  return (
    <div
      data-scroll-top-bar={!selecting || undefined}
      className="sticky top-[var(--list-sticky-top,0px)] z-30 space-y-3 bg-background pb-3 pt-1"
    >
      <nav
        aria-label="Điều hướng Ban ngành"
        className="flex h-11 min-h-11 items-center gap-3"
      >
        {selecting ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            aria-label="Thoát chọn thành viên"
            disabled={busy}
            onClick={leaveSelection}
          >
            <X className="size-5" aria-hidden="true" />
          </Button>
        ) : boardYear !== null ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            aria-label="Về danh sách Ban ngành"
            onClick={() => {
              setBoardYear(null);
              setSearch("");
            }}
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Button>
        ) : searchAll ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            aria-label="Về danh sách Ban ngành"
            disabled={busy}
            onClick={() => {
              setSearchAll(false);
              setSearch("");
            }}
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Button>
        ) : (
          embedded && (
            <a
              href={departmentListHref}
              data-navigation="back"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-primary"
              aria-label="Quay lại quản lý Ban ngành"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </a>
          )
        )}
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold">
          {selecting
            ? "Đã chọn " + selected.length + " thành viên"
            : department.name}
        </h1>
        {selecting || !fullMembers ? (
          <span className="size-11 shrink-0" aria-hidden="true" />
        ) : (
          <DepartmentMenu
            onAdd={findProfiles}
            onBoard={openBoard}
            onYears={() => setShowYears(true)}
            readOnly={readOnly}
            disabled={busy}
          />
        )}
      </nav>
      {boardYear !== null && (
        <p className="text-sm font-medium">Ban điều hành năm {boardYear}</p>
      )}
      {!selecting ? (
        <div data-department-action-slot>
          <ListSearchToolbar
            value={search}
            onChange={setSearch}
            label="Tìm thành viên Ban ngành"
            inputRef={searchInput}
            disabled={busy}
            onFilter={() => setFilterOpen(true)}
            filterCount={filterStatuses.length}
            chips={activeFilterChips}
          />
        </div>
      ) : (
        <div className="h-11" data-department-action-slot>
          <div
            role="toolbar"
            aria-label="Thao tác thành viên đã chọn"
            className="flex h-11 items-center gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-none [&::-webkit-scrollbar]:hidden [&_.ui-button]:h-11 [&_.ui-button]:min-h-11 [&_.ui-button]:shrink-0 [&_.ui-button]:whitespace-nowrap [&_.ui-button]:py-0"
          >
            <Button
              disabled={busy || !selected.length || hasCandidates}
              onClick={() => {
                setMoving((value) => !value);
                setChangingStatus(false);
              }}
            >
              <ArrowRightLeft className="size-4" aria-hidden="true" />
              Chuyển ban hát
            </Button>

            <Button
              variant="outline"
              disabled={busy || !selected.length || hasCandidates}
              onClick={() => {
                setChangingStatus((value) => !value);
                setMoving(false);
              }}
            >
              <ListChecks className="size-4" aria-hidden="true" />
              Cập nhật tình trạng
            </Button>
            <Button
              variant="outline"
              className="text-destructive"
              aria-label="Xóa khỏi danh sách"
              disabled={busy || !selected.length || hasCandidates}
              onClick={() => setConfirmRemove(true)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Xóa khỏi danh sách
            </Button>
            {hasCandidates && (
              <Button
                disabled={busy || !selected.length}
                onClick={() => bulk.mutate("add")}
              >
                <Plus className="size-4" aria-hidden="true" />
                Thêm vào Ban ngành
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
