"use client";
import { PersonCard } from "./person-card";
import { MemberCardMenu } from "./member-card-menu";
import { FilterChips } from "./filter-chips";
import { ListSearchToolbar } from "./list-controls";
import { useDebouncedSearch } from "./use-debounced-search";

import { useLoadingTiming } from "./use-loading-timing";
import { AutoLoadMore } from "./auto-load-more";
import { useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRightLeft,
  ListChecks,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  ChurchStatusSchema,
  invalidateMemberReads,
  useWorkspace,
  DEPARTMENT_BULK_LIMIT,
  apiRequest,
  useAuth,
} from "@org/core";
import {
  Button,
  Dropdown,
  Dialog,
  ErrorMessage,
  Input,
  useToast,
} from "@org/ui";
import {
  BoardRoleEditor,
  BoardYears,
  type BoardYear,
} from "./department-board";
import { DepartmentMenu } from "./department-menu";
type Person = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  position: string;
  isMember: boolean;
  isBoardMember?: boolean;
  churchStatus?: string | null;
};
type Page = { items: Person[]; total?: number; nextPage: number | null };
export function DepartmentMembers({
  department,
  onClose,
  embedded = false,
  onOpenProfile,
  profileHref,
}: {
  department: { id: string; name: string };
  onClose?: () => void;
  embedded?: boolean;
  onOpenProfile?: (id: string) => void;
  profileHref?: (id: string) => string;
}) {
  const readOnly = useAuth()?.user?.role === "deacon";
  const org = useWorkspace((state) => state.organizationId);
  const currentYear = () =>
    Number(
      new Intl.DateTimeFormat("en", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
      }).format(new Date()),
    );
  const [boardYear, setBoardYear] = useState<number | null>(null);
  const [roleMember, setRoleMember] = useState<Person | null>(null);
  const [showYears, setShowYears] = useState(false);
  const [searchAll, setSearchAll] = useState(false),
    [search, setSearch] = useState("");
  const term = useDebouncedSearch(search);
  const [selecting, setSelecting] = useState(false),
    [selected, setSelected] = useState<Person[]>([]);
  const [destination, setDestination] = useState(""),
    [moving, setMoving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [status, setStatus] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusDestination, setStatusDestination] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const client = useQueryClient(),
    { toast } = useToast();
  const path =
    "/api/admin/departments/" + encodeURIComponent(department.id) + "/members";
  const catalog = useQuery({
    queryKey: ["admin-department-move-targets"],
    queryFn: () =>
      apiRequest<{ departments: { id: string; name: string }[] }>(
        "/api/admin/departments",
      ),
  });
  const board = useQuery({
    queryKey: ["department-board-history", department.id],
    queryFn: () =>
      apiRequest<{ items: BoardYear[] }>(
        "/api/admin/departments/" +
          encodeURIComponent(department.id) +
          "/board",
      ),
    enabled: boardYear !== null,
  });
  const boardSnapshot = board.data?.items.find(
    (item) => item.year === boardYear,
  );
  function openBoard() {
    leaveSelection();
    setSearchAll(false);
    setSearch("");

    setBoardYear(currentYear());
  }
  const query = useInfiniteQuery({
    queryKey: [
      "admin-department-members",
      department.id,
      boardYear !== null ? "board" : searchAll ? "all" : "members",
      boardYear,
      term,
      filterStatus,
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      apiRequest<Page>(
        path +
          "?" +
          new URLSearchParams({
            mode: boardYear !== null ? "board" : searchAll ? "all" : "members",
            ...(boardYear !== null ? { year: String(boardYear) } : {}),
            q: term,
            ...(filterStatus ? { churchStatus: filterStatus } : {}),
            page: String(pageParam),
            summary: pageParam === 1 ? "1" : "0",
          }),
        { signal },
      ),
    getNextPageParam: (page) => page.nextPage ?? undefined,
    enabled: (!searchAll || Boolean(term)) && term === search.trim(),
  });
  useLoadingTiming("department", query.isPending);
  function leaveSelection() {
    setSelecting(false);
    setSelected([]);
    setDestination("");
    setMoving(false);
    setChangingStatus(false);
    setStatus("");
    setStatusDestination("");
  }
  const add = useMutation({
    mutationFn: (memberId: string) =>
      apiRequest(path, { method: "POST", body: JSON.stringify({ memberId }) }),
    onSuccess: async () => {
      await invalidateMemberReads(client, org);
      toast({ title: "Đã thêm thành viên vào Ban ngành", variant: "success" });
    },
  });
  const bulk = useMutation({
    mutationFn: (action: "add" | "remove" | "move" | "status") =>
      apiRequest(path, {
        method: "PATCH",
        body: JSON.stringify({
          action,
          memberIds: selected.map((person) => person.id),
          ...(action === "move" ? { targetDepartmentId: destination } : {}),
          ...(action === "status"
            ? {
                status,
                chuyenHoiDen: status === "Chuyển hội" ? statusDestination : "",
              }
            : {}),
        }),
      }),
    onSuccess: async (_, action) => {
      leaveSelection();
      await invalidateMemberReads(client, org);
      toast({
        title:
          action === "status"
            ? "Đã cập nhật tình trạng các thành viên đã chọn"
            : action === "move"
              ? "Đã chuyển Ban ngành cho các thành viên đã chọn"
              : action === "add"
                ? "Đã thêm các thành viên đã chọn"
                : "Đã gỡ các thành viên đã chọn",
        variant: "success",
      });
    },
  });
  const busy = add.isPending || bulk.isPending;
  function toggle(person: Person) {
    if (readOnly) return;
    setSelecting(true);
    if (selected.some((item) => item.id === person.id)) {
      setSelected((items) => items.filter((item) => item.id !== person.id));
      return;
    }
    if (selected.length >= DEPARTMENT_BULK_LIMIT) {
      toast({
        title: "Chọn tối đa " + DEPARTMENT_BULK_LIMIT + " thành viên mỗi lần.",
        variant: "error",
      });
      return;
    }
    setSelected((items) => [...items, person]);
  }
  function findProfiles() {
    leaveSelection();
    setBoardYear(null);
    setSearchAll(true);
    searchInput.current?.focus();
  }
  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data?.pages],
  );
  const hasCandidates = selected.some((person) => !person.isMember);
  const activeFilterChips = [
    ...(filterStatus
      ? [
          {
            key: "status",
            label: filterStatus,
            onRemove: () => setFilterStatus(""),
          },
        ]
      : []),
    ...(boardYear !== null
      ? [
          {
            key: "year",
            label: `Ban điều hành ${boardYear}`,
            onRemove: () => setBoardYear(null),
          },
        ]
      : []),
    ...(searchAll
      ? [
          {
            key: "scope",
            label: "Tất cả thành viên",
            onRemove: () => setSearchAll(false),
          },
        ]
      : []),
  ];
  const content = (
    <div className="space-y-4">
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
              href="/dashboard/departments"
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
        {selecting ? (
          <span className="size-11 shrink-0" aria-hidden="true" />
        ) : !readOnly ? (
          <DepartmentMenu
            onAdd={findProfiles}
            onBoard={openBoard}
            disabled={busy}
          />
        ) : (
          <Button variant="ghost" onClick={openBoard}>
            Ban điều hành
          </Button>
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
            filterCount={Number(Boolean(filterStatus))}
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
              Chuyển
            </Button>
            <Button
              variant="outline"
              className="text-destructive"
              aria-label="Xóa khỏi danh sách"
              disabled={busy || !selected.length || hasCandidates}
              onClick={() => bulk.mutate("remove")}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Xóa khỏi danh sách
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
              Tình trạng
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
      {selecting && (
        <FilterChips
          chips={[
            ...(search.trim()
              ? [
                  {
                    key: "search",
                    label: search.trim(),
                    onRemove: () => setSearch(""),
                  },
                ]
              : []),
            ...activeFilterChips,
          ]}
        />
      )}
      <Dialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title="Bộ lọc thành viên"
        description="Lọc thành viên Ban ngành theo tình trạng."
        closeLabel="Đóng bộ lọc"
      >
        <label className="block text-sm">
          Tình trạng trong Hội Thánh
          <Dropdown
            className="mt-2 w-full"
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
          >
            <option value="">Tất cả tình trạng</option>
            {ChurchStatusSchema.options.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Dropdown>
        </label>
        <Button className="mt-4 w-full" onClick={() => setFilterOpen(false)}>
          Xong
        </Button>
      </Dialog>
      {selecting && changingStatus && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setChangingStatus(false);
          }}
          title="Cập nhật tình trạng"
          closeLabel="Đóng tình trạng"
          description="Chọn tình trạng cho các thành viên đã chọn."
        >
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-0 flex-1 basis-48 text-sm">
              Tình trạng trong Hội Thánh
              <Dropdown
                aria-label="Tình trạng mới"
                className="mt-2 w-full"
                value={status}
                disabled={busy}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">Chọn tình trạng</option>
                {ChurchStatusSchema.options.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Dropdown>
            </label>
            {status === "Chuyển hội" && (
              <label className="member-ui-enter min-w-0 flex-1 basis-full text-sm">
                Điểm đến chuyển hội (không bắt buộc)
                <Input
                  className="mt-2 w-full"
                  value={statusDestination}
                  maxLength={200}
                  disabled={busy}
                  placeholder="Nhập Hội Thánh hoặc địa điểm chuyển đến"
                  onChange={(event) => setStatusDestination(event.target.value)}
                />
              </label>
            )}
            <Button
              disabled={busy || !status}
              onClick={() => bulk.mutate("status")}
            >
              Cập nhật tình trạng
            </Button>
          </div>
          {bulk.error && <ErrorMessage error={bulk.error} />}
        </Dialog>
      )}
      {selecting && moving && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setMoving(false);
          }}
          title="Chuyển Ban ngành"
          closeLabel="Đóng chuyển Ban ngành"
          description="Chọn Ban ngành mới cho các thành viên đã chọn."
        >
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-0 flex-1 basis-48 text-sm">
              Chuyển sang Ban ngành
              <Dropdown
                aria-label="Ban ngành đích"
                className="mt-2 w-full"
                value={destination}
                disabled={busy || catalog.isPending}
                onChange={(event) => setDestination(event.target.value)}
              >
                <option value="">Chọn Ban ngành</option>
                {catalog.data?.departments
                  .filter((item) => item.id !== department.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </Dropdown>
            </label>
            <Button
              disabled={busy || !destination}
              onClick={() => bulk.mutate("move")}
            >
              Xác nhận chuyển
            </Button>
          </div>
          {bulk.error && <ErrorMessage error={bulk.error} />}
        </Dialog>
      )}
      {(add.error || bulk.error) && (
        <ErrorMessage error={add.error ?? bulk.error} />
      )}
      {catalog.error && selecting && <ErrorMessage error={catalog.error} />}
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
            <ul className="space-y-2">
              {items.map((person, index) => {
                const checked = selected.some((item) => item.id === person.id);
                const editRole = boardYear !== null && !readOnly;
                const choose = () =>
                  boardYear !== null ? setRoleMember(person) : toggle(person);
                return (
                  <li key={person.id}>
                    <PersonCard
                      name={person.name}
                      href={
                        selecting || editRole
                          ? undefined
                          : (profileHref?.(person.id) ??
                            `/client/members/${encodeURIComponent(person.id)}`)
                      }
                      onOpen={(event) => {
                        if (selecting || editRole) {
                          choose();
                          return;
                        }
                        if (
                          onOpenProfile &&
                          !event.metaKey &&
                          !event.ctrlKey &&
                          !event.shiftKey &&
                          !event.altKey &&
                          event.button === 0
                        ) {
                          event.preventDefault();
                          onOpenProfile(person.id);
                        }
                      }}
                      status={person.churchStatus ?? null}
                      onFilterStatus={setFilterStatus}
                      departments={
                        person.isMember
                          ? person.position?.trim().toLocaleLowerCase("vi") ===
                            "ban viên"
                            ? null
                            : person.position
                          : "Chưa thuộc Ban ngành"
                      }
                      phone={person.phone}
                      email={person.email}
                      colorIndex={index}
                      selected={checked}
                      onAvatarClick={readOnly ? undefined : choose}
                      avatarLabel={
                        (boardYear !== null ? "Phân công " : "Chọn ") +
                        person.name
                      }
                      disabled={busy}
                      actions={
                        <div className="flex items-center gap-1">
                          {searchAll && !person.isMember && !selecting && (
                            <Button
                              variant="outline"
                              size="icon"
                              disabled={busy}
                              aria-label={"Thêm " + person.name}
                              onClick={() => add.mutate(person.id)}
                            >
                              <Plus className="size-4" aria-hidden="true" />
                            </Button>
                          )}
                          <MemberCardMenu
                            org={org}
                            member={person}
                            onEdit={
                              onOpenProfile
                                ? () => onOpenProfile(person.id)
                                : undefined
                            }
                            profileHref={profileHref?.(person.id)}
                          />
                        </div>
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}
          <AutoLoadMore
            query={query}
            enabled={term === search.trim() && !busy}
          />
        </>
      )}
      {boardYear !== null && (
        <>
          {board.error && <ErrorMessage error={board.error} />}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={board.isPending || Boolean(board.error)}
            onClick={() => setShowYears(true)}
          >
            Danh sách BĐH các năm
          </Button>
          {showYears && board.data && (
            <BoardYears
              items={board.data.items}
              year={boardYear}
              onClose={() => setShowYears(false)}
              onChoose={(year) => {
                setBoardYear(year);
                setSearch("");

                setShowYears(false);
              }}
            />
          )}
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
  );
  if (embedded)
    return (
      <section aria-label={"Thành viên — " + department.name}>
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
