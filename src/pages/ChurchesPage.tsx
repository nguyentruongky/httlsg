import React, { useState, useRef, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  MapPin,
  Phone,
  Users,
  GitBranch,
  User,
  Calendar,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import {
  cn,
  normalizeSearch,
  matchesSearch,
  displayChurchName,
  displayPastorName,
  capitalize,
} from "@/lib/utils";

type ChurchItem = {
  id: number;
  stt: number;
  code: string;
  form: string;
  legalType: string;
  autonomy: string | null;
  name: string;
  shortName: string;
  parentChurchId: number | null;
  parentChurchName: string | null;
  regionCode: string;
  regionName: string;
  foundedYear: number | null;
  oldWard: string | null;
  oldAddress: string | null;
  newAddress: string | null;
  newWard: string | null;
  isInHcm: boolean;
  memberCount: number;
  regularAttendanceCount: number;
  note: string | null;
  pastorName: string | null;
  pastorTitle: string | null;
  pastorRole: string | null;
  pastorPhone: string | null;
  affiliatedCount: number;
};

export function ChurchesPage() {
  const queryClient = useQueryClient();
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [formFilter, setFormFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedChurch, setSelectedChurch] = useState<ChurchItem | null>(null);
  const [churchPastors, setChurchPastors] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  // Create form state
  const [name, setName] = useState("");
  const [form, setForm] = useState<"Chi hội" | "Điểm nhóm" | "Hội nhánh">(
    "Điểm nhóm",
  );
  const [legalType, setLegalType] = useState<"Chính thức" | "Nội bộ">(
    "Chính thức",
  );
  const [autonomy, setAutonomy] = useState<"Tự lập" | "Tự dưỡng">("Tự dưỡng");
  const [regionCode, setRegionCode] = useState<
    "I" | "II" | "III" | "IV" | "V" | "VI"
  >("I");
  const [parentChurchName, setParentChurchName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newWard, setNewWard] = useState("");
  const [pastorName, setPastorName] = useState("");
  const [pastorRole, setPastorRole] = useState<
    "Quản nhiệm" | "Kiêm nhiệm" | "Đặc trách"
  >("Đặc trách");
  const [pastorPhone, setPastorPhone] = useState("");
  const [memberCount, setMemberCount] = useState("60");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(val), 250);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["churches", regionFilter, formFilter],
    queryFn: async () => {
      const res = await api.api.churches.$get({
        query: {
          region: regionFilter,
          form: formFilter,
        },
      });
      if (!res.ok) throw new Error("Failed to load congregations");
      return res.json();
    },
  });

  const churchList = useMemo(() => {
    const query = debouncedSearch;
    return (data?.churches ?? []).filter((church) => {
      if (!query) return true;
      return (
        matchesSearch(church.name, query) ||
        matchesSearch(church.code, query) ||
        matchesSearch(church.pastorName, query) ||
        matchesSearch(church.newAddress, query) ||
        matchesSearch(church.newWard, query) ||
        matchesSearch(church.oldAddress, query) ||
        matchesSearch(church.regionName, query)
      );
    });
  }, [data?.churches, debouncedSearch]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.api.churches.$post({
        json: {
          name: name.trim(),
          form,
          legalType,
          autonomy: form === "Chi hội" ? autonomy : null,
          regionCode,
          parentChurchName: parentChurchName.trim() || null,
          newAddress: newAddress.trim(),
          newWard: newWard.trim(),
          pastorName: pastorName.trim() || null,
          pastorRole,
          pastorPhone: pastorPhone.trim() || null,
          memberCount: Number(memberCount) || 0,
        },
      });
      if (!res.ok) throw new Error("Failed to create congregation");
      return res.json();
    },
    onSuccess: () => {
      setCreateOpen(false);
      setName("");
      setNewAddress("");
      setNewWard("");
      setPastorName("");
      queryClient.invalidateQueries({ queryKey: ["churches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["pastor"] });
    },
  });

  const updateMembersMutation = useMutation({
    mutationFn: async ({
      id,
      memberCount,
      regularAttendanceCount,
    }: {
      id: number;
      memberCount: number;
      regularAttendanceCount: number;
    }) => {
      const res = await api.api.churches[":id"].$patch({
        param: { id: String(id) },
        json: { memberCount, regularAttendanceCount },
      });
      if (!res.ok) throw new Error("Failed to update member count");
      return res.json();
    },
    onSuccess: (_data, vars) => {
      if (selectedChurch && selectedChurch.id === vars.id) {
        setSelectedChurch({
          ...selectedChurch,
          memberCount: vars.memberCount,
          regularAttendanceCount: vars.regularAttendanceCount,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["churches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Danh bộ Hội Thánh ({churchList.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Chi hội, Hội nhánh & Điểm nhóm trực thuộc - Kèm địa chỉ cũ & sau sáp
            nhập 2026
          </p>
        </div>

        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          <span>Thêm Cơ Sở</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={handleSearchChange}
          placeholder="Tìm tên Hội Thánh, Mục sư quản nhiệm, phường/xã mới hoặc địa chỉ..."
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-indigo-600 min-h-[44px]"
        />
      </div>

      {/* Region & Form Filter Pills */}
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] &::-webkit-scrollbar:[hidden]">
          {["ALL", "I", "II", "III", "IV", "V", "VI"].map((kv) => (
            <button
              key={kv}
              type="button"
              onClick={() => setRegionFilter(kv)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer min-h-[34px]",
                regionFilter === kv
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100",
              )}
            >
              {kv === "ALL" ? "Tất cả KV" : `Khu vực ${kv}`}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] &::-webkit-scrollbar:[hidden]">
          {["ALL", "Chi hội", "Điểm nhóm", "Hội nhánh"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormFilter(f)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer min-h-[32px]",
                formFilter === f
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50",
              )}
            >
              {f === "ALL" ? "Mọi hình thức" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Congregation Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-white border border-slate-200/70 animate-pulse"
            />
          ))}
        </div>
      ) : churchList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-900">
            Không tìm thấy cơ sở phù hợp
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Thử thay đổi bộ lọc Khu vực hoặc từ khóa tìm kiếm.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {churchList.map((ch) => (
            <div
              key={ch.id}
              onClick={async () => {
                setSelectedChurch(ch);
                try {
                  const res = await api.api.churches[":id"]["pastors"].$get({
                    param: { id: String(ch.id) },
                  });
                  if (res.ok) {
                    const json = await res.json();
                    setChurchPastors(json.pastors ?? []);
                  }
                } catch {}
              }}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 hover:border-indigo-300 transition-all active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      KV {ch.regionCode}
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                        ch.form === "Chi hội" && "bg-indigo-50 text-indigo-700",
                        ch.form === "Điểm nhóm" && "bg-sky-50 text-sky-700",
                        ch.form === "Hội nhánh" &&
                          "bg-violet-50 text-violet-700",
                      )}
                    >
                      {ch.form}
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-medium",
                        ch.legalType === "Chính thức"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700",
                      )}
                    >
                      {ch.legalType}
                    </span>
                    {ch.autonomy && (
                      <span className="rounded-md bg-slate-900 text-white px-2 py-0.5 text-[10px] font-semibold">
                        {ch.autonomy}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 text-base font-bold text-slate-900">
                    {displayChurchName(ch.form, ch.shortName ?? ch.name)}
                  </h3>

                  {ch.parentChurchName && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-indigo-600">
                      <GitBranch className="h-3.5 w-3.5" />
                      <span>Hội Thánh {capitalize(ch.parentChurchName)}</span>
                    </p>
                  )}

                  <p className="mt-1.5 text-xs text-slate-600 flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                    {ch.newAddress || ch.oldAddress ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((ch.newAddress || ch.oldAddress) as string)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer"
                      >
                        {ch.newAddress || ch.oldAddress}
                      </a>
                    ) : (
                      <span>Đang cập nhật địa chỉ</span>
                    )}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-1 rounded-xl bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 text-xs font-bold text-slate-900">
                    <Users className="h-3.5 w-3.5 text-indigo-600" />
                    <span>{ch.memberCount.toLocaleString("vi-VN")}</span>
                  </div>
                  {ch.affiliatedCount > 0 && (
                    <p className="mt-1 text-[11px] font-medium text-indigo-600">
                      +{ch.affiliatedCount} ĐN/HN
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  {ch.pastorName ? (
                    <>
                      <strong className="text-slate-800">
                        {displayPastorName(ch.pastorTitle, ch.pastorName)}
                      </strong>
                      {ch.pastorRole && (
                        <span className="ml-1 text-[11px] font-medium text-slate-400">
                          ({ch.pastorRole})
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="italic text-slate-400">
                      Khuyết Quản nhiệm
                    </span>
                  )}
                </span>

                {ch.pastorPhone && (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <a
                      href={`tel:${ch.pastorPhone}`}
                      className="hover:underline cursor-pointer"
                    >
                      {ch.pastorPhone}
                    </a>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Inspection Drawer/Modal */}
      <ResponsiveSheet
        open={Boolean(selectedChurch)}
        onOpenChange={(open) => !open && setSelectedChurch(null)}
        title={
          selectedChurch
            ? displayChurchName(
                selectedChurch.form,
                selectedChurch.shortName ?? selectedChurch.name,
              )
            : ""
        }
      >
        {selectedChurch && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              {selectedChurch.legalType !== "Cơ quan" && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-400">Pháp lý & Tự trị</p>
                  <p className="mt-1 font-bold text-slate-900">
                    {selectedChurch.legalType}
                    {selectedChurch.autonomy
                      ? ` · ${selectedChurch.autonomy}`
                      : ""}
                  </p>
                </div>
              )}
              {(selectedChurch.form === "Chi hội" ||
                selectedChurch.form === "Hội nhánh" ||
                selectedChurch.form === "Điểm nhóm") && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-400">Năm thành lập</p>
                  <p className="mt-1 font-bold text-slate-900 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {selectedChurch.foundedYear ?? "Chưa cập nhật"}
                  </p>
                </div>
              )}
              {(selectedChurch.form === "Chi hội" ||
                selectedChurch.form === "Hội nhánh" ||
                selectedChurch.form === "Điểm nhóm") && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-400">Khu vực</p>
                  <p className="mt-1 font-bold text-slate-900 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {selectedChurch.regionName ?? "Khu vực I"}
                  </p>
                </div>
              )}
            </div>

            {(selectedChurch.form === "Chi hội" ||
              selectedChurch.form === "Hội nhánh" ||
              selectedChurch.form === "Điểm nhóm") && (
              <div className="rounded-xl border border-slate-200/80 p-3.5 space-y-2">
                <div>
                  <p className="text-[11px] font-semibold text-indigo-600 uppercase">
                    Địa chỉ sau sáp nhập 2026
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-900">
                    {selectedChurch.newAddress ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedChurch.newAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer"
                      >
                        {selectedChurch.newAddress}
                      </a>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>

                {selectedChurch.oldAddress && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase">
                      Địa chỉ cũ
                    </p>
                    <p className="mt-0.5 text-slate-700">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedChurch.oldAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer"
                      >
                        {selectedChurch.oldAddress}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            )}

            {(selectedChurch.form === "Chi hội" ||
              selectedChurch.form === "Hội nhánh" ||
              selectedChurch.form === "Điểm nhóm") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200/80 p-3.5">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">
                    Số tín hữu
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      value={selectedChurch.memberCount}
                      onChange={(e) => {
                        const v = Math.max(0, Number(e.target.value) || 0);
                        setSelectedChurch({
                          ...selectedChurch,
                          memberCount: v,
                        });
                        updateMembersMutation.mutate({
                          id: selectedChurch.id,
                          memberCount: v,
                          regularAttendanceCount:
                            selectedChurch.regularAttendanceCount,
                        });
                      }}
                      className="w-full text-lg font-bold text-slate-900 border-none bg-transparent focus:ring-0 text-right"
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200/80 p-3.5">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">
                    Tín hữu trung tín
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      value={selectedChurch.regularAttendanceCount}
                      onChange={(e) => {
                        const v = Math.max(0, Number(e.target.value) || 0);
                        setSelectedChurch({
                          ...selectedChurch,
                          regularAttendanceCount: v,
                        });
                        updateMembersMutation.mutate({
                          id: selectedChurch.id,
                          memberCount: selectedChurch.memberCount,
                          regularAttendanceCount: v,
                        });
                      }}
                      className="w-full text-lg font-bold text-slate-900 border-none bg-transparent focus:ring-0 text-right"
                    />
                  </div>
                </div>
              </div>
            )}

            {churchPastors.length > 0 && (
              <div className="rounded-xl border border-slate-200/80 p-3.5 space-y-2">
                <p className="text-[11px] font-semibold uppercase text-slate-400">
                  Nhân sự
                </p>
                <div className="space-y-2">
                  {churchPastors.map((p) => (
                    <div
                      key={p.id || p.name}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <div>
                          {p.title ? (
                            <div className="text-[11px] text-slate-500">
                              {p.title}
                            </div>
                          ) : null}
                          <div className="text-sm font-medium text-slate-900">
                            {p.name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="shrink-0 rounded bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {p.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ResponsiveSheet>

      {/* Create New Congregation Sheet */}
      <ResponsiveSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Thêm Cơ Sở Hội Thánh Mới"
        description="Đăng ký Chi hội, Hội nhánh hoặc Điểm nhóm vào hệ thống KV TP.HCM."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !newAddress.trim() || !newWard.trim()) return;
            createMutation.mutate();
          }}
          className="space-y-3.5"
        >
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Tên Chi hội / Điểm nhóm
            </label>
            <input
              type="text"
              required
              placeholder="VD: TÂN PHÚ ĐÔNG"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm uppercase outline-none focus:border-indigo-600 min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Hình thức
              </label>
              <select
                value={form}
                onChange={(e) =>
                  setForm(
                    e.target.value as "Chi hội" | "Điểm nhóm" | "Hội nhánh",
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-600 min-h-[44px]"
              >
                <option value="Chi hội">Chi hội</option>
                <option value="Điểm nhóm">Điểm nhóm</option>
                <option value="Hội nhánh">Hội nhánh</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Khu vực
              </label>
              <select
                value={regionCode}
                onChange={(e) =>
                  setRegionCode(
                    e.target.value as "I" | "II" | "III" | "IV" | "V" | "VI",
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-600 min-h-[44px]"
              >
                {["I", "II", "III", "IV", "V", "VI"].map((r) => (
                  <option key={r} value={r}>
                    Khu vực {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Loại hình
              </label>
              <select
                value={legalType}
                onChange={(e) =>
                  setLegalType(e.target.value as "Chính thức" | "Nội bộ")
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-600 min-h-[44px]"
              >
                <option value="Chính thức">Chính thức</option>
                <option value="Nội bộ">Nội bộ</option>
              </select>
            </div>

            {form === "Chi hội" ? (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tự trị
                </label>
                <select
                  value={autonomy}
                  onChange={(e) =>
                    setAutonomy(e.target.value as "Tự lập" | "Tự dưỡng")
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-600 min-h-[44px]"
                >
                  <option value="Tự lập">Tự lập</option>
                  <option value="Tự dưỡng">Tự dưỡng</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Chi hội trực thuộc
                </label>
                <input
                  type="text"
                  placeholder="VD: NGUYỄN TRI PHƯƠNG"
                  value={parentChurchName}
                  onChange={(e) => setParentChurchName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm uppercase outline-none focus:border-indigo-600 min-h-[44px]"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Phường / Xã (Mới 2026)
              </label>
              <input
                type="text"
                required
                placeholder="VD: P. An Đông"
                value={newWard}
                onChange={(e) => setNewWard(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-600 min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Số lượng tín hữu
              </label>
              <input
                type="number"
                value={memberCount}
                onChange={(e) => setMemberCount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-600 min-h-11"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 uppercase">
              Địa chỉ sau sáp nhập 2026
            </label>
            <input
              type="text"
              required
              placeholder="Số nhà, Đường, Phường/Xã, Tp. HCM"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-600 min-h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                MS Quản nhiệm / Đặc trách
              </label>
              <input
                type="text"
                placeholder="Ms Nguyễn Văn A"
                value={pastorName}
                onChange={(e) => setPastorName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-600 min-h-11"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                SĐT liên lạc
              </label>
              <input
                type="tel"
                placeholder="090..."
                value={pastorPhone}
                onChange={(e) => setPastorPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-600 min-h-[44px]"
              />
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full">
            Lưu Cơ Sở Hội Thánh
          </Button>
        </form>
      </ResponsiveSheet>
    </div>
  );
}
