import { Button, Dialog, ErrorMessage } from "@org/ui";
import { FilterChips } from "./filter-chips";
import { MemberFilters } from "./member-filters";
import { AutoLoadMore } from "./auto-load-more";
import { BoardRoleEditor, BoardYears } from "./department-board";
import { DepartmentMemberCards } from "./department-members/department-member-cards";
import { DepartmentMembersToolbar } from "./department-members/department-members-toolbar";
import { useDepartmentMembers } from "./department-members/use-department-members";
import { MoveDepartmentMembersDialog } from "./department-members/move-members-dialog";
import { ChangeDepartmentStatusDialog } from "./department-members/change-status-dialog";
import { RemoveDepartmentMembersDialog } from "./department-members/remove-members-dialog";
export function DepartmentMembers({
  department,
  onClose,
  embedded = false,
  fixedViewport = false,
  onOpenProfile,
  profileHref,
}: {
  department: { id: string; name: string };
  onClose?: () => void;
  embedded?: boolean;
  fixedViewport?: boolean;
  onOpenProfile?: (id: string) => void;
  profileHref?: (id: string) => string;
}) {
  const state = useDepartmentMembers(department);
  const {
    readOnly,
    fullMembers,
    ownDepartments,
    mobile,
    org,
    currentYear,
    boardYear,
    setBoardYear,
    roleMember,
    setRoleMember,
    showYears,
    setShowYears,
    searchAll,
    search,
    setSearch,
    term,
    selecting,
    selected,
    moving,
    setMoving,
    changingStatus,
    setChangingStatus,
    transferDestination,
    setTransferDestination,
    confirmRemove,
    setConfirmRemove,
    setFilterStatuses,
    filterValue,
    filterOpen,
    setFilterOpen,
    board,
    boardSnapshot,
    query,
    add,
    bulk,
    busy,
    toggle,
    items,
    activeFilterChips,
  } = state;
  const content = (
    <div
      className={
        fixedViewport
          ? "fixed-list flex h-full min-h-0 flex-col overflow-hidden"
          : "space-y-4"
      }
    >
      <DepartmentMembersToolbar
        state={state}
        department={department}
        embedded={embedded}
      />
      <div
        data-scroll-restoration={
          fixedViewport ? `department-members-${department.id}` : undefined
        }
        className={
          fixedViewport
            ? "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-4"
            : "space-y-4"
        }
      >
        {selecting && <FilterChips chips={activeFilterChips} />}
        <MemberFilters
          open={filterOpen}
          onOpenChange={setFilterOpen}
          value={filterValue}
          onApply={(next) => setFilterStatuses(next.churchStatuses ?? [])}
          sections={["status"]}
          placement="responsive"
        />
        {selecting && confirmRemove && (
          <RemoveDepartmentMembersDialog
            department={department}
            selected={selected}
            busy={busy}
            bulk={bulk}
            setConfirmRemove={setConfirmRemove}
          />
        )}
        {selecting && changingStatus && (
          <ChangeDepartmentStatusDialog
            department={department}
            selected={selected}
            busy={busy}
            bulk={bulk}
            setChangingStatus={setChangingStatus}
            transferDestination={transferDestination}
            setTransferDestination={setTransferDestination}
          />
        )}
        {selecting && moving && (
          <MoveDepartmentMembersDialog
            department={department}
            busy={busy}
            bulk={bulk}
            setMoving={setMoving}
            mobile={mobile}
          />
        )}
        {(add.error || bulk.error) && (
          <ErrorMessage error={add.error ?? bulk.error} />
        )}
        {searchAll && !term ? null : query.isPending ? (
          <p role="status">Đang tải danh sách…</p>
        ) : query.error && !query.data ? (
          <div>
            <ErrorMessage error={query.error} />
            <Button variant="outline" onClick={() => void query.refetch()}>
              Thử lại
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {query.data?.pages[0].total ?? 0}{" "}
              {searchAll ? "kết quả" : "thành viên"}
            </p>
            {!items.length ? (
              <p className="py-6 text-center text-muted-foreground">
                {term
                  ? "Không tìm thấy thành viên phù hợp."
                  : "Ban ngành chưa có thành viên."}
              </p>
            ) : (
              <DepartmentMemberCards
                items={items}
                selected={selected}
                boardYear={boardYear}
                readOnly={readOnly}
                selecting={selecting}
                fullMembers={fullMembers}
                ownDepartments={ownDepartments}
                busy={busy}
                searchAll={searchAll}
                department={department}
                org={org}
                toggle={toggle}
                setRoleMember={setRoleMember}
                setFilterStatuses={setFilterStatuses}
                addMember={(id) => add.mutate(id)}
                onOpenProfile={onOpenProfile}
                profileHref={profileHref}
              />
            )}
            <AutoLoadMore
              query={query}
              enabled={term === search.trim() && !busy}
            />
          </>
        )}
        {showYears &&
          (board.data ? (
            <BoardYears
              items={board.data.items}
              year={boardYear ?? currentYear()}
              onClose={() => setShowYears(false)}
              onChoose={(year) => {
                setBoardYear(year);
                setSearch("");
                setShowYears(false);
              }}
            />
          ) : (
            <Dialog
              open
              title="Danh sách BĐH các năm"
              description=""
              onOpenChange={(open) => {
                if (!open) setShowYears(false);
              }}
            >
              {board.error ? (
                <>
                  <ErrorMessage error={board.error} />
                  <Button
                    variant="outline"
                    onClick={() => void board.refetch()}
                  >
                    Thử lại
                  </Button>
                </>
              ) : (
                <p role="status">Đang tải danh sách…</p>
              )}
            </Dialog>
          ))}
        {boardYear !== null && (
          <>
            {board.error && <ErrorMessage error={board.error} />}
            {roleMember && !board.isPending && !board.error && (
              <BoardRoleEditor
                departmentId={department.id}
                year={boardYear}
                revision={boardSnapshot?.revision ?? 0}
                person={roleMember}
                isBoardMember={Boolean(roleMember.isBoardMember)}
                onClose={() => setRoleMember(null)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
  if (embedded)
    return (
      <section
        className={fixedViewport ? "h-full min-h-0" : undefined}
        aria-label={"Thành viên — " + department.name}
      >
        {content}
      </section>
    );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose?.();
      }}
      title={"Thành viên — " + department.name}
      description="Chọn ảnh đại diện để chọn nhiều thành viên."
      fullScreenOnMobile
      className="sm:max-w-2xl"
      closeLabel="Đóng danh sách Ban ngành"
    >
      {content}
    </Dialog>
  );
}
