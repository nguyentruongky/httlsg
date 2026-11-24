import { LoadingView } from "@org/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, createRequestId, listMembersCompact } from "@org/core";
import { Button, Dialog, Input, useToast } from "@org/ui";
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
export function CandidateManager({
  election,
  organizationId,
  frozen,
  refresh,
}: {
  election: number;
  organizationId?: string;
  frozen: boolean;
  refresh: () => Promise<void>;
}) {
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
    Array<{ id: string; name: string }>
  >([]);
  const [addLoading, setAddLoading] = useState(false);
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
        const data = await listMembersCompact(organizationId, {
          page: 1,
          pageSize: 20,
          search: query.trim(),
        } as any);
        setAddResults(
          data.items.map((m) => ({ id: m.userId, name: m.user.name })),
        );
      } catch {
        setAddResults([]);
      } finally {
        setAddLoading(false);
      }
    },
    [organizationId],
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
              onClick={() => fileInput.current?.click()}
            >
              Nhập Excel
            </Button>
            <Button
              variant="outline"
              disabled={readOnly || busy || loading}
              onClick={() => {
                setAddSearch("");
                setAddResults([]);
                setAddDialogOpen(true);
              }}
            >
              Thêm ứng viên
            </Button>
            <Button
              disabled={readOnly || busy || loading || !dirty || !revision}
              onClick={() => void save()}
            >
              {busy ? "Đang xử lý…" : "Lưu danh sách"}
            </Button>
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
                    <LoadingView message="Đang tải danh sách…" className="min-h-48" />
                  </td>
                </tr>
              ) : (
                shown.map((row, index) => (
                  <tr key={row.key} className="even:bg-muted/30">
                    <td className="border-b border-r px-3 text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="min-w-64 border-b border-r p-1">
                      <Input
                        aria-label={`Họ tên dòng ${index + 1}`}
                        maxLength={200}
                        disabled={readOnly || busy}
                        value={row.full_name}
                        onChange={(e) =>
                          update(row.key, { full_name: e.target.value })
                        }
                        className="min-h-11 border-transparent bg-transparent shadow-none focus:border-primary"
                      />
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
                        <span className="px-2 text-muted-foreground">
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
              {!loading && !rows.length && (
                <tr>
                  <td
                    colSpan={
                      4 +
                      extraColumns.filter(
                        (c) => c !== "Area" && c !== "Location",
                      ).length
                    }
                    className="p-8 text-center text-muted-foreground"
                  >
                    Chưa có ứng viên. Chọn Nhập Excel hoặc Thêm ứng viên để bắt
                    đầu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {dirty && (
          <div className="flex gap-2 mt-3">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Bỏ các thay đổi chưa lưu và tải lại danh sách?",
                  )
                )
                  void perform(load);
              }}
            >
              Hủy thay đổi
            </Button>
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
                    setRows((old) => [
                      ...old,
                      {
                        key: createRequestId(),
                        candidate_no: null,
                        full_name: m.name,
                        member_id: m.id,
                        included: true,
                        extra: {},
                        departments: [],
                      },
                    ]);
                    setDirty(true);
                    setAddDialogOpen(false);
                    setAddSearch("");
                    setAddResults([]);
                  }}
                  className="border-b hover:bg-accent cursor-pointer transition-all duration-200 ease-in-out"
                >
                  <td className="px-3 py-3">{m.name}</td>
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
    </>
  );
}
