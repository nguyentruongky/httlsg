import { useDepartmentRoster } from "./use-department-roster";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiRequest,
  invalidateMemberReads,
  useWorkspace,
  DEPARTMENT_BULK_LIMIT,
  useAuth,
  hasFullMemberAccess,
} from "@org/core";
import { useToast } from "@org/ui";
import { usePathname } from "../client-router";
import { useDebouncedSearch } from "../use-debounced-search";
import { emptyMemberFilters, type MemberFiltersValue } from "../member-filters";
import type { DepartmentMember as Person, DepartmentBulkAction } from "./types";
export function useDepartmentMembers(department: { id: string; name: string }) {
  const departmentListHref = usePathname().startsWith("/client/")
    ? "/client/departments"
    : "/dashboard/departments";
  const actor = useAuth()?.user;
  const fullMembers = hasFullMemberAccess(actor);
  const readOnly = !actor || !["admin", "secretary"].includes(actor.role);
  const ownDepartments = new Set(actor?.departmentIds ?? []);
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 767px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
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
  const [moving, setMoving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [transferDestination, setTransferDestination] = useState<string | null>(
    null,
  );
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<
    NonNullable<MemberFiltersValue["churchStatuses"]>
  >([]);
  const filterValue = useMemo(
    () => ({ ...emptyMemberFilters, churchStatuses: filterStatuses }),
    [filterStatuses],
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const client = useQueryClient(),
    { toast } = useToast();
  const path =
    "/api/admin/departments/" + encodeURIComponent(department.id) + "/members";
  function openBoard() {
    leaveSelection();
    setSearchAll(false);
    setSearch("");

    setBoardYear(currentYear());
  }
  const { board, boardSnapshot, query } = useDepartmentRoster({
    departmentId: department.id,
    boardYear,
    showYears,
    term,
    search,
    filterStatuses,
    searchAll,
  });
  function leaveSelection() {
    setSelecting(false);
    setSelected([]);
    setMoving(false);
    setChangingStatus(false);
    setTransferDestination(null);
    setConfirmRemove(false);
  }
  const add = useMutation({
    mutationFn: (memberId: string) =>
      apiRequest(path, { method: "POST", body: JSON.stringify({ memberId }) }),
    onSuccess: async (_, memberId) => {
      const name =
        query.data?.pages
          .flatMap((page) => page.items)
          .find((person) => person.id === memberId)?.name ?? "thành viên";
      await invalidateMemberReads(client, org);
      toast({
        title: `Đã thêm ${name} vào ${department.name}`,
        variant: "success",
      });
    },
  });
  const bulk = useMutation({
    mutationFn: (input: DepartmentBulkAction) => {
      const action = typeof input === "string" ? input : input.action;
      return apiRequest(path, {
        method: "PATCH",
        body: JSON.stringify({
          action,
          memberIds: selected.map((person) => person.id),
          ...(typeof input !== "string" && input.action === "move"
            ? { targetDepartmentId: input.targetDepartmentId }
            : {}),
          ...(typeof input !== "string" && input.action === "status"
            ? {
                status: input.status,
                chuyenHoiDen:
                  input.status === "Chuyển hội"
                    ? (input.destination ?? "")
                    : "",
              }
            : {}),
        }),
      });
    },
    onSuccess: async (_, input) => {
      const action = typeof input === "string" ? input : input.action;
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
    onError: (error, input) => {
      if (typeof input !== "string")
        toast({
          title:
            input.action === "move"
              ? "Không thể chuyển ban hát cho các thành viên đã chọn"
              : "Không thể cập nhật tình trạng các thành viên đã chọn",
          description: error instanceof Error ? error.message : undefined,
          variant: "error",
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
    ...filterStatuses.map((status) => ({
      key: `status:${status}`,
      label: status,
      onRemove: () =>
        setFilterStatuses((items) => items.filter((item) => item !== status)),
    })),
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
  return {
    departmentListHref,
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
    setSearchAll,
    search,
    setSearch,
    term,
    selecting,
    setSelecting,
    selected,
    setSelected,
    moving,
    setMoving,
    changingStatus,
    setChangingStatus,
    transferDestination,
    setTransferDestination,
    confirmRemove,
    setConfirmRemove,
    filterStatuses,
    setFilterStatuses,
    filterValue,
    filterOpen,
    setFilterOpen,
    searchInput,
    board,
    boardSnapshot,
    query,
    leaveSelection,
    openBoard,
    add,
    bulk,
    busy,
    toggle,
    findProfiles,
    items,
    hasCandidates,
    activeFilterChips,
  };
}
export type DepartmentMembersState = ReturnType<typeof useDepartmentMembers>;
