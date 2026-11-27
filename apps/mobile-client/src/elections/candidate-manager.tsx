import { LoadingView } from "@org/ui";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  apiRequest,
  createRequestId,
  listMembersCompact,
  DirectoryQuerySchema,
  type CompactMember,
  departments,
  stripDiacritics,
  searchMatches,
} from "@org/core";
import { Button, Dialog, Input, NavigationDialog, useToast } from "@org/ui";
import {
  Upload,
  Users,
  Filter,
  ArrowLeft,
  X,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { MemberFilters, type MemberFiltersValue } from "../member-filters";
type Row = {
  key: string;
  candidate_no: number | null;
  full_name: string;
  member_id: string | null;
  included: boolean;
  extra: Record<string, unknown>;
  departments: string[];
};
const post = (path: string, data: unknown) =>
  apiRequest<any>(path, { method: "POST", body: JSON.stringify(data) });
const decorate = (rows: any[]): Row[] =>
  rows.map((row) => ({
    ...row,
    key: createRequestId(),
    member_id: row.member_id ?? null,
    included: row.included ?? true,
    extra: row.extra ?? {},
    departments: Array.isArray(row.departments) ? row.departments : [],
  }));
export const CandidateManager = forwardRef<
  { triggerImport: () => void },
  {
    election: number;
    organizationId?: string;
    frozen: boolean;
    refresh: () => Promise<void>;
  }
>((props, ref) => {
  const { election, organizationId, frozen, refresh } = props;
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [revision, setRevision] = useState("");
  const [persistedNumbers, setPersistedNumbers] = useState<Set<number>>(
    new Set(),
  );
  const [locked, setLocked] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileHash, setFileHash] = useState<string>();
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(true);
  const [removed, setRemoved] = useState(0);
  const readOnly = locked || frozen;
  const [displayCount, setDisplayCount] = useState(50);
  const pageSize = 50;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addResults, setAddResults] = useState<
    Array<{ id: string; name: string; departments?: string[] }>
  >([]);
  const [addLoading, setAddLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<MemberFiltersValue>({
    departmentIds: [],
    churchStatuses: [],
    area: [],
    location: [],
    ageUnknownOnly: false,
    minAge: null,
    maxAge: null,
    personnelOnly: false,
  });
  const [filterResults, setFilterResults] = useState<
    Array<{
      id: string;
      name: string;
      email?: string;
      phone?: string;
      departments?: string[];
    }>
  >([]);
  const [filterLoading, setFilterLoading] = useState(false);
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any>(
        `/api/elections/${election}/candidates`,
      );
      setRows(decorate(data.rows));
      setPersistedNumbers(new Set(data.rows.map((r: any) => r.candidate_no)));
      setRevision(data.revision);
      setLocked(data.locked);
      setDirty(false);
      setRemoved(0);
      setFilename("");
      setFileHash(undefined);
      setWarnings([]);
      setDisplayCount(pageSize);
    } finally {
      setLoading(false);
    }
  }, [election]);
  useImperativeHandle(ref, () => ({
    triggerImport: () => fileInput.current?.click(),
  }));
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchMembers = useCallback(
    async (query: string) => {
      if (!organizationId || !query.trim()) {
        setAddResults([]);
        return;
      }
      setAddLoading(true);
      try {
        const data = await apiRequest<any>(
          `/api/elections/${election}/candidate-search?search=${encodeURIComponent(
            query.trim(),
          )}`,
        );
        setAddResults(
          data.members.map((m: any) => ({
            id: m.id,
            name: m.name,
            departments: m.departments,
          })),
        );
      } catch {
        setAddResults([]);
      } finally {
        setAddLoading(false);
      }
    },
    [organizationId, election],
  );
  useEffect(() => {
    if (!addDialogOpen) return;
    if (!addSearch.trim()) {
      setAddResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void searchMembers(addSearch);
    }, 1000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [addDialogOpen, addSearch, searchMembers]);
  const fetchFilteredMembers = useCallback(async () => {
    if (!organizationId) return;
    setFilterLoading(true);
    try {
      const query = DirectoryQuerySchema.parse({
        search: "",
        pageSize: 50,
        personnelOnly: filterValues.personnelOnly,
        departmentIds: filterValues.departmentIds,
        churchStatuses: filterValues.churchStatuses as any,
        areas: filterValues.area,
        locations: filterValues.location,
        minAge: filterValues.minAge,
        maxAge: filterValues.maxAge,
        ageUnknownOnly: filterValues.ageUnknownOnly,
        area: filterValues.area[0] ?? "all",
        location: filterValues.location[0] ?? "all",
      });
      const members: CompactMember[] = [];
      let page: number | undefined = 1;
      do {
        const data = await listMembersCompact(organizationId, {
          ...query,
          page,
        });
        members.push(...data.items);
        page = data.nextPage;
      } while (page !== undefined);
      setFilterResults(
        members.map((m) => ({
          id: m.userId,
          name: m.user.name,
          email: m.user.email ?? undefined,
          phone: m.phone ?? undefined,
          departments: m.departments.map((d) => d.name),
        })),
      );
    } catch {
      setFilterResults([]);
    } finally {
      setFilterLoading(false);
    }
  }, [organizationId, filterValues]);
  useEffect(() => {
    const hasFilters =
      filterValues.departmentIds.length > 0 ||
      (filterValues.churchStatuses?.length ?? 0) > 0 ||
      filterValues.area.length > 0 ||
      filterValues.location.length > 0 ||
      filterValues.minAge !== null ||
      filterValues.maxAge !== null ||
      filterValues.ageUnknownOnly ||
      filterValues.personnelOnly;
    if (hasFilters && !filterOpen) {
      fetchFilteredMembers();
    }
  }, [filterOpen, filterValues, fetchFilteredMembers]);
  const extraColumns = useMemo(
    () => [...new Set(rows.flatMap((r) => Object.keys(r.extra)))],
    [rows],
  );
  const shown = rows.slice(0, displayCount);
  const update = (key: string, patch: Partial<Row>) => {
    setRows((old) => old.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setDirty(true);
    setError("");
  };
  const perform = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể xử lý danh sách.");
    } finally {
      setBusy(false);
    }
  };
  const addCandidate = async (memberId: string, name: string) => {
    if (rows.some((r) => r.member_id === memberId)) return;
    await perform(async () => {
      const data = await apiRequest<any>(
        `/api/elections/${election}/candidates`,
        {
          method: "PUT",
          body: JSON.stringify({
            member_id: memberId,
          }),
        },
      );
      const candidate =
        data.rows.find((row: any) => row.member_id === memberId) ??
        data.candidate;
      const [added] = decorate([candidate]);
      setRows((current) => [...current, added]);
      setPersistedNumbers(
        (current) => new Set([...current, candidate.candidate_no]),
      );
      setRevision(data.revision);
      setLocked(data.locked);
      setDisplayCount((current) => Math.max(current, rows.length + 1));
      setFilterResults([]);
      setFilterValues({
        departmentIds: [],
        churchStatuses: [],
        area: [],
        location: [],
        ageUnknownOnly: false,
        minAge: null,
        maxAge: null,
        personnelOnly: false,
      });
      toast({
        title: "Đã thêm ứng viên",
        description: `${name} đã được thêm vào danh sách.`,
      });
    });
  };
  const importFile = (file: File) =>
    perform(async () => {
      if (
        dirty &&
        !window.confirm(
          "Nhập tệp sẽ thay thế các chỉnh sửa chưa lưu. Tiếp tục?",
        )
      )
        return;
      if (file.size > 10000000) throw new Error("Tệp tối đa 10 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const preview = await post(
        `/api/elections/${election}/candidates/import`,
        { file: btoa(binary), dryRun: true },
      );
      setRows(decorate(preview.rows));
      setRevision(preview.revision);
      setFileHash(preview.hash);
      setFilename(file.name);
      setDirty(true);
      setRemoved(preview.removed.length);
      setWarnings([...preview.errors, ...preview.warnings]);
      setDisplayCount(50);
    });
  const save = () =>
    perform(async () => {
      const invalid = rows.findIndex((r) => !r.full_name.trim());
      if (invalid >= 0) {
        throw new Error(`Dòng ${invalid + 1}: vui lòng nhập họ tên.`);
      }
      if (
        removed > 0 &&
        !window.confirm(
          `Lưu danh sách sẽ loại ${removed} ứng viên khỏi danh sách hiện tại. Tiếp tục?`,
        )
      )
        return;
      const result = await post(`/api/elections/${election}/candidates`, {
        rows: rows.map(({ key, ...row }) => row),
        revision,
        sourceFileHash: fileHash,
      });
      setRows(decorate(result.rows));
      setPersistedNumbers(new Set(result.rows.map((r: any) => r.candidate_no)));
      setRevision(result.revision);
      setLocked(result.locked);
      setDirty(false);
      setRemoved(0);
      setWarnings(result.warnings);
      setFilename("");
      setFileHash(undefined);
      setFilterResults([]);
      setFilterValues({
        departmentIds: [],
        churchStatuses: [],
        area: [],
        location: [],
        ageUnknownOnly: false,
        minAge: null,
        maxAge: null,
        personnelOnly: false,
      });
      toast({
        title: "Đã lưu danh sách ứng viên",
        description: `${result.rows.length} ứng viên đã được lưu vào cơ sở dữ liệu.`,
      });
      await refresh();
    });
  return (
    <>
      <div className="space-y-4" aria-label="Danh sách ứng viên">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Danh sách ứng viên</h2>
            <p className="text-sm text-muted-foreground">
              {rows.length} ứng viên
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx"
              className="hidden"
              aria-label="Nhập danh sách ứng viên từ Excel"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void importFile(file);
              }}
            />
            <Button
              variant="outline"
              disabled={readOnly || busy || loading}
              onClick={() => {
                setAddSearch("");
                setAddResults([]);
                setAddDialogOpen(true);
              }}
            >
              <Users size={16} className="mr-1" />
              Thêm ứng viên
            </Button>
            {!revision && (
              <Button
                disabled={readOnly || busy || loading || !dirty}
                onClick={() => void save()}
              >
                {busy ? "Đang xử lý…" : "Lưu danh sách"}
              </Button>
            )}
          </div>
        </div>
        {readOnly && (
          <p className="rounded-lg bg-muted p-3 text-sm">
            Danh sách đã khóa vì có cuộc bầu cử đã mở. Bạn vẫn có thể xem toàn
            bộ ứng viên.
          </p>
        )}
        {filename && (
          <p className="text-sm">
            Đã nhập: {filename}. Kiểm tra các dòng bên dưới rồi chọn Lưu danh
            sách.
          </p>
        )}
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {warnings.length > 0 && (
          <details className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <summary>Thông tin cần kiểm tra ({warnings.length})</summary>
            <ul className="mt-2 list-disc pl-5">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
            <p className="mt-2">
              Bạn có thể sửa danh sách bên dưới trước khi lưu.
            </p>
          </details>
        )}
        {filterResults.length > 0 && (
          <div className="rounded-lg border-2 border-[#cfd2c9] bg-white">
            <div className="flex items-center justify-between p-4 border-b bg-[#f8f7f3]">
              <h3 className="text-lg font-semibold text-[#1c1b18]">
                Kết quả lọc ({filterResults.length})
              </h3>
            </div>
            <div className="divide-y overflow-hidden rounded-b-2xl border-t-0">
              {filterResults.map((m) => (
                <label
                  key={m.id}
                  className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 text-sm hover:bg-[#f8f7f3]"
                  onClick={() => {
                    if (rows.some((r) => r.member_id === m.id)) return;
                    void addCandidate(m.id, m.name);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{m.name}</p>
                    <p className="text-xs text-[#6b6963] truncate">
                      {m.departments?.length && `${m.departments.join(", ")}`}
                    </p>
                  </div>
                  <span className="text-xs text-[#215e3d] font-medium shrink-0">
                    {rows.some((r) => r.member_id === m.id) ? "Đã có" : "Thêm"}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
        {!loading && !rows.length ? (
          <div className="rounded-lg border-2 border-[#cfd2c9] bg-white p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#edf4ed] flex items-center justify-center mb-4">
              <Users size={32} className="text-[#215e3d]" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-[#1c1b18] mb-2">
              Chưa có ứng viên
            </h3>
            <p className="text-sm text-[#6b6963] mb-6">
              Thêm ứng viên bằng cách nhập từ tệp Excel hoặc chọn từ danh sách
              thành viên.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                disabled={readOnly || busy || loading}
                onClick={() => fileInput.current?.click()}
                className="min-w-45 gap-2"
              >
                <Upload size={18} />
                Nhập từ Excel
              </Button>
              <Button
                variant="outline"
                disabled={readOnly || busy || loading}
                onClick={() => {
                  setFilterOpen(true);
                }}
                className="min-w-45 gap-2"
              >
                <Filter size={18} />
                Chọn từ danh sách
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-[#cfd2c9] bg-white">
            <table className="w-full min-w-160 border-collapse text-left text-sm">
              <thead className="sm:sticky sm:top-0 z-10 bg-muted">
                <tr>
                  {[
                    "STT",
                    "Họ và tên",
                    ...extraColumns.filter(
                      (c) => c !== "Area" && c !== "Location",
                    ),
                    "Ban ngành/Ban hát lễ",
                    "Thao tác",
                  ].map((h, i) => (
                    <th
                      key={`${h}:${i}`}
                      className="whitespace-nowrap border-b border-r px-3 py-3 font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={
                        4 +
                        extraColumns.filter(
                          (c) => c !== "Area" && c !== "Location",
                        ).length
                      }
                      className="p-6 text-center"
                    >
                      <LoadingView
                        message="Đang tải danh sách…"
                        className="min-h-48"
                      />
                    </td>
                  </tr>
                ) : (
                  shown.map((row, index) => (
                    <tr key={row.key} className="even:bg-muted/30">
                      <td className="border-b border-r px-3 text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="min-w-64 border-b border-r px-3 py-2">
                        <span className="block text-sm font-medium">
                          {row.full_name}
                        </span>
                      </td>
                      {extraColumns
                        .filter((c) => c !== "Area" && c !== "Location")
                        .map((column) => (
                          <td
                            key={column}
                            className="min-w-40 border-b border-r p-1"
                          >
                            <Input
                              aria-label={`${column}: ${row.full_name}`}
                              disabled={readOnly || busy}
                              value={String(row.extra[column] ?? "")}
                              onChange={(e) =>
                                update(row.key, {
                                  extra: {
                                    ...row.extra,
                                    [column]: e.target.value,
                                  },
                                })
                              }
                              className="min-h-11 border-transparent bg-transparent shadow-none"
                            />
                          </td>
                        ))}
                      <td className="border-b border-r p-1">
                        {row.departments.length > 0 ? (
                          <span className="text-sm text-muted-foreground">
                            {row.departments.join(", ")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Chưa có ban ngành
                          </span>
                        )}
                      </td>
                      <td className="border-b p-1">
                        <Button
                          variant="ghost"
                          disabled={readOnly || busy}
                          aria-label={`Xóa ${row.full_name || "ứng viên mới"}`}
                          onClick={() => {
                            if (
                              row.candidate_no !== null &&
                              !window.confirm(
                                `Xóa ứng viên ${row.full_name || ""}?`,
                              )
                            )
                              return;
                            setRows((old) =>
                              old.filter((r) => r.key !== row.key),
                            );
                            if (row.candidate_no !== null)
                              setRemoved((n) => n + 1);
                            setDirty(true);
                          }}
                        >
                          Xóa
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) {
            setAddSearch("");
            setAddResults([]);
          }
        }}
        title="Thêm ứng viên"
        description="Tìm kiếm và chọn thành viên để thêm vào danh sách ứng viên"
        className="-translate-y-60"
      >
        <Input
          aria-label="Tìm kiếm thành viên"
          placeholder="Tìm kiếm tên thành viên…"
          value={addSearch}
          onChange={(e) => setAddSearch(e.target.value)}
          className="mb-4"
        />
        {addLoading && (
          <p className="text-sm text-muted-foreground mb-4">Đang tìm kiếm…</p>
        )}
        <div className="max-h-56 overflow-y-auto border rounded-lg transition-all duration-200 ease-in-out">
          <table className="w-full text-left text-sm transition-all duration-200 ease-in-out">
            <tbody className="transition-all duration-200 ease-in-out">
              {addResults.slice(0, 5).map((m) => (
                <tr
                  key={m.id}
                  onClick={() => {
                    void addCandidate(m.id, m.name);
                    setAddDialogOpen(false);
                    setAddSearch("");
                    setAddResults([]);
                  }}
                  className="border-b hover:bg-accent cursor-pointer transition-all duration-200 ease-in-out"
                >
                  <td className="px-3 py-3">
                    <p className="font-medium">{m.name}</p>
                    {m.departments?.length && (
                      <p className="text-xs text-muted-foreground">
                        {m.departments.join(", ")}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-xs text-primary font-medium">
                      Chọn
                    </span>
                  </td>
                </tr>
              ))}
              {addResults.length === 0 &&
                addSearch.trim() !== "" &&
                !addLoading && (
                  <tr className="transition-all duration-200 ease-in-out">
                    <td
                      colSpan={2}
                      className="px-3 py-3 text-center text-muted-foreground"
                    >
                      Không tìm thấy thành viên phù hợp.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </Dialog>
      <MemberFilters
        open={filterOpen}
        onOpenChange={setFilterOpen}
        value={filterValues}
        onApply={setFilterValues}
        departmentOptions={departments}
        sections={[
          "personnel",
          "department",
          "area",
          "location",
          "age",
          "status",
        ]}
        placement="right"
      />
    </>
  );
});
CandidateManager.displayName = "CandidateManager";
