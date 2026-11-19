import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Phone,
  Church,
  Building2,
  User,
  Users,
  Shield,
  Calendar,
  Mail,
} from "lucide-react";
import { api } from "@/lib/api";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import {
  matchesSearch,
  displayChurchName,
  displayPastorName,
  normalizeChurchForDedupe,
} from "@/lib/utils";

type PastorItem = {
  name: string;
  title: string | null;
  phone: string | null;
  email?: string | null;
  chucVu?: string | null;
  namSinh?: number | null;
  tenNhiemSo?: string | null;
  diaChi?: string | null;
  nhuDanh?: string | null;
  status?: string | null;
  assignments: {
    churchId: number | null;
    organizationId: number | null;
    churchName: string;
    form: string;
    regionCode: string;
    role: string;
    memberCount: number;
    source: "db" | "chuc-danh";
    isInHcm: boolean;
    isOtherWork?: boolean;
  }[];
};

export function PastorPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<PastorItem | null>(null);
  const [selectedChurch, setSelectedChurch] = useState<any>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<any>(null);
  const [churchLoading, setChurchLoading] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => setDebouncedSearch(val), 1000);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["pastor"],
    queryFn: async () => {
      const res = await api.api["giao-pham"].$get();
      if (!res.ok) throw new Error("Failed to load pastor");
      return res.json();
    },
  });

  const handleChurchClick = async (churchId: number | null) => {
    if (!churchId) return;
    setChurchLoading(true);
    try {
      const res = await api.api.churches[":id"].$get({
        param: { id: String(churchId) },
      });
      if (!res.ok) throw new Error("Failed to load church");
      const json = await res.json();
      setSelectedChurch(json.church);
    } finally {
      setChurchLoading(false);
    }
  };

  const handleOrganizationClick = async (organizationId: number | null) => {
    if (!organizationId) return;
    setChurchLoading(true);
    try {
      const res = await api.api["giao-pham"]["organizations"][":id"].$get({
        param: { id: String(organizationId) },
      });
      if (!res.ok) throw new Error("Failed to load organization");
      const json = await res.json();
      setSelectedOrganization(json.organization);
      setSelectedChurch({
        id: json.organization.id,
        code: `ORG-${String(json.organization.id).padStart(4, '0')}`,
        name: json.organization.name,
        form: 'Cơ quan',
        pastors: json.pastors,
      });
    } finally {
      setChurchLoading(false);
    }
  };

  const pastorList = useMemo(() => {
    const query = debouncedSearch;

    // Deduplicate pastors by name, merging assignments from duplicate entries
    const pastorMap = new Map<
      string,
      {
        name: string;
        title: string | null;
        phone: string | null;
        email?: string | null;
        chucVu?: string | null;
        namSinh?: number | null;
        tenNhiemSo?: string | null;
        diaChi?: string | null;
        nhuDanh?: string | null;
        status?: string | null;
        assignments: {
          churchId: number | null;
          organizationId: number | null;
          churchName: string;
          form: string;
          regionCode: string;
          role: string;
          memberCount: number;
          source: "db" | "chuc-danh";
          isInHcm: boolean;
          isOtherWork?: boolean;
        }[];
      }
    >();

    for (const person of (data?.pastor ?? []) as PastorItem[]) {
      const key = person.name.toLowerCase();
      const existing = pastorMap.get(key);
      if (existing) {
        existing.assignments.push(...person.assignments);
        if (!existing.phone && person.phone) existing.phone = person.phone;
        if (!existing.email && (person as { email?: string | null }).email) {
          existing.email = (person as { email?: string | null }).email;
        }
        if (!existing.chucVu && (person as { chucVu?: string | null }).chucVu) {
          existing.chucVu = (person as { chucVu?: string | null }).chucVu;
        }
        if (
          !existing.namSinh &&
          (person as { namSinh?: number | null }).namSinh
        ) {
          existing.namSinh = (person as { namSinh?: number | null }).namSinh;
        }
        if (
          !existing.tenNhiemSo &&
          (person as { tenNhiemSo?: string | null }).tenNhiemSo
        ) {
          existing.tenNhiemSo = (
            person as { tenNhiemSo?: string | null }
          ).tenNhiemSo;
        }
        if (!existing.diaChi && (person as { diaChi?: string | null }).diaChi) {
          existing.diaChi = (person as { diaChi?: string | null }).diaChi;
        }
        if (
          !existing.nhuDanh &&
          (person as { nhuDanh?: string | null }).nhuDanh
        ) {
          existing.nhuDanh = (person as { nhuDanh?: string | null }).nhuDanh;
        }
        if (!existing.title && person.title) existing.title = person.title;
      } else {
        pastorMap.set(key, {
          ...person,
          assignments: [...person.assignments],
        });
      }
    }

    // Deduplicate assignments within each pastor by normalized church name
    // (e.g. "Hội Thánh Tuy Lý Vương" == "Hội Thánh Chi Hội Tuy Lý Vương")
    // Prefer DB assignments over chuc-danh-derived ones
    for (const pastor of pastorMap.values()) {
      const dedupedMap = new Map<string, PastorItem["assignments"][number]>();
      for (const a of pastor.assignments) {
        const key = normalizeChurchForDedupe(a.churchName);
        const existing = dedupedMap.get(key);
        if (!existing) {
          dedupedMap.set(key, a);
        } else if (a.source === "db" && existing.source !== "db") {
          dedupedMap.set(key, a);
        } else if (
          a.source === "db" &&
          existing.source === "db" &&
          a.churchId !== null &&
          existing.churchId === null
        ) {
          dedupedMap.set(key, a);
        }
      }
      pastor.assignments = Array.from(dedupedMap.values());
    }

    let list = Array.from(pastorMap.values()).sort((a, b) => {
      const aHasHcm = a.assignments.some((x) => x.isInHcm);
      const bHasHcm = b.assignments.some((x) => x.isInHcm);
      if (aHasHcm !== bHasHcm) return bHasHcm ? 1 : -1;
      const aLast = a.name.trim().split(/\s+/).pop() ?? "";
      const bLast = b.name.trim().split(/\s+/).pop() ?? "";
      return aLast.localeCompare(bLast, "vi", { sensitivity: "base" });
    });

    if (!query) return list;

    return list.filter((person) => {
      return (
        matchesSearch(person.name, query) ||
        matchesSearch(person.phone, query) ||
        person.assignments.some(
          (a) =>
            matchesSearch(a.churchName, query) ||
            matchesSearch(a.regionCode, query),
        )
      );
    });
  }, [data?.pastor, debouncedSearch]);

  return (
    <div className="space-y-5">
      <div
        className="will-change-transform"
        style={{
          transform: `translateY(${Math.max(-scrollY, -150)}px)`,
          opacity: Math.max(1 - scrollY / 90, 0),
          transition: "none",
        }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Danh Bộ Giáo Phẩm ({pastorList.length})
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Mục sư Quản nhiệm, Kiêm nhiệm & Truyền đạo Đặc trách tại KV TP.HCM
        </p>
      </div>

      <div
        className={`sticky z-20 ${isMobile ? "top-14" : "top-4"} pb-2 rounded-2xl`}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={handleSearchChange}
            placeholder="Tìm tên Mục sư, Truyền đạo, số điện thoại hoặc Hội Thánh..."
            className="w-full rounded-3xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm outline-none focus:border-indigo-600 min-h-12"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-white border border-slate-200/70 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {pastorList.map((person) => (
            <div
              key={person.name}
              onClick={() => setSelectedPerson(person)}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3 hover:border-indigo-300 transition-colors cursor-pointer"
            >
              <div className="space-y-1">
                <h2 className="mt-1.5 text-base font-bold text-slate-900">
                  {displayPastorName(person.title, person.name)}
                </h2>
                {person.phone && (
                  <a
                    href={`tel:${person.phone}`}
                    className="inline-flex items-center gap-1 font-mono text-xs text-slate-600 hover:underline cursor-pointer mb-6"
                  >
                    <Phone className="h-3 w-3 text-slate-500 shrink-0" />
                    <span>{person.phone}</span>
                  </a>
                )}

                {person.assignments.length > 0 ? (
                  <div className="space-y-1">
                    {person.assignments.map((a, i) => {
                      const isOrg = a.organizationId !== null && a.churchId === null;
                      return (
                        <div
                          key={`assign-${i}`}
                          onClick={
                            a.isOtherWork
                              ? undefined
                              : isOrg
                                ? (e) => {
                                    e.stopPropagation();
                                    handleOrganizationClick(a.organizationId);
                                  }
                                : (e) => {
                                    e.stopPropagation();
                                    handleChurchClick(a.churchId);
                                  }
                          }
                          className="flex items-center justify-between gap-2 text-xs rounded-lg  px-3 py-2 hover:bg-slate-50 cursor-pointer"
                        >
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                            {a.isOtherWork ? (
                              <span className="h-3.5 w-3.5 text-slate-400 shrink-0">
                                {a.churchName}
                              </span>
                            ) : (
                              <>
                                {isOrg ? (
                                  <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                ) : (
                                  <Church className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                )}
                                <span>
                                  {a.churchId !== null
                                    ? displayChurchName(a.form, a.churchName)
                                    : a.churchName}
                                  {a.source === "db" && !isOrg
                                    ? ` (KV ${a.regionCode})`
                                    : ""}
                                </span>
                              </>
                            )}
                          </span>
                          {!a.isOtherWork && (
                            <span className="shrink-0 rounded bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              {a.role}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pastor Detail Sheet */}
      <ResponsiveSheet
        open={Boolean(selectedPerson)}
        onOpenChange={(open) => !open && setSelectedPerson(null)}
        title={
          selectedPerson
            ? displayPastorName(selectedPerson.title, selectedPerson.name)
            : ""
        }
      >
        {selectedPerson && (
          <div className="space-y-5 text-sm">
            {(() => {
              const hasAnyData = Boolean(
                selectedPerson.phone ||
                selectedPerson.email ||
                selectedPerson.chucVu ||
                selectedPerson.namSinh ||
                selectedPerson.tenNhiemSo ||
                selectedPerson.nhuDanh ||
                selectedPerson.diaChi ||
                selectedPerson.assignments.length > 0,
              );
              if (!hasAnyData) return null;
              return (
                <>
                  <div className="flex items-end gap-3">
                    {selectedPerson.phone && (
                      <a
                        href={`tel:${selectedPerson.phone}`}
                        className="inline-flex items-center gap-1 font-mono text-xs text-slate-600 hover:underline cursor-pointer"
                      >
                        <Phone className="h-3 w-3 text-slate-500 shrink-0" />
                        <span>{selectedPerson.phone}</span>
                      </a>
                    )}
                    {selectedPerson.email && (
                      <a
                        href={`mailto:${selectedPerson.email}`}
                        className="inline-flex items-center gap-1 font-mono text-xs text-slate-600 hover:underline cursor-pointer"
                      >
                        <Mail className="h-3 w-3 text-slate-500 shrink-0" />
                        <span>{selectedPerson.email}</span>
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      const allRoles = new Set<string>();
                      if (selectedPerson.chucVu) {
                        allRoles.add(selectedPerson.chucVu);
                      }
                      selectedPerson.assignments.forEach((a) => {
                        if (a.role) allRoles.add(a.role);
                      });
                      const rolesArray = Array.from(allRoles);

                      const infoItems = [
                        rolesArray.length > 0 ? rolesArray.join(", ") : null,
                        selectedPerson.namSinh,
                        selectedPerson.tenNhiemSo,
                        selectedPerson.nhuDanh,
                        selectedPerson.diaChi,
                      ].filter(Boolean);
                      const isSingle = infoItems.length === 1;
                      return (
                        <>
                          {rolesArray.length > 0 && (
                            <div
                              className={`rounded-xl border border-slate-200/80 p-4 bg-white ${isSingle ? "md:col-span-2" : ""}`}
                            >
                              <p className="text-[11px] font-semibold uppercase text-slate-400 mb-2">
                                Chức vụ
                              </p>
                              <p className="text-sm text-slate-900">
                                {rolesArray.join(", ")}
                              </p>
                            </div>
                          )}
                          {selectedPerson.namSinh && (
                            <div
                              className={`rounded-xl border border-slate-200/80 p-4 bg-white ${isSingle ? "md:col-span-2" : ""}`}
                            >
                              <p className="text-[11px] font-semibold uppercase text-slate-400 mb-2">
                                Năm sinh
                              </p>
                              <p className="text-sm text-slate-900">
                                {selectedPerson.namSinh}
                              </p>
                            </div>
                          )}
                          {selectedPerson.tenNhiemSo && (
                            <div
                              className={`rounded-xl border border-slate-200/80 p-4 bg-white ${isSingle ? "md:col-span-2" : ""}`}
                            >
                              <p className="text-[11px] font-semibold uppercase text-slate-400 mb-2">
                                Tên nhiệm sở
                              </p>
                              <p className="text-sm text-slate-900">
                                {selectedPerson.tenNhiemSo}
                              </p>
                            </div>
                          )}
                          {selectedPerson.nhuDanh && (
                            <div
                              className={`rounded-xl border border-slate-200/80 p-4 bg-white ${isSingle ? "md:col-span-2" : ""}`}
                            >
                              <p className="text-[11px] font-semibold uppercase text-slate-400 mb-2">
                                Nhủ danh
                              </p>
                              <p className="text-sm text-slate-900">
                                {selectedPerson.nhuDanh}
                              </p>
                            </div>
                          )}
                          {selectedPerson.diaChi && (
                            <div
                              className={`rounded-xl border border-slate-200/80 p-4 bg-white ${isSingle ? "md:col-span-2" : ""}`}
                            >
                              <p className="text-[11px] font-semibold uppercase text-slate-400 mb-2">
                                Địa chỉ
                              </p>
                              <p className="text-sm text-slate-900">
                                {selectedPerson.diaChi}
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {selectedPerson.assignments.length > 0 && (
                    <>
                      <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Church className="h-3.5 w-3.5 text-indigo-600" />
                        Công tác / Chức vụ ({selectedPerson.assignments.length})
                      </h2>
                      <div className="space-y-2">
                        {selectedPerson.assignments.map((a) => {
                        const isOrg = a.organizationId !== null && a.churchId === null;
                        return (
                          <div
                            key={`${a.organizationId || a.churchId}-${a.role}`}
                            onClick={
                              a.isOtherWork || isOrg
                                ? undefined
                                : () => handleChurchClick(a.churchId)
                            }
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              {!a.isOtherWork && !isOrg && (
                                <Church className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              )}
                              {isOrg && (
                                <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              )}
                              <div className="text-sm font-medium text-slate-900">
                                {a.isOtherWork
                                  ? a.churchName
                                  : a.churchId !== null
                                    ? displayChurchName(a.form, a.churchName)
                                    : a.churchName}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="shrink-0 rounded bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                {a.role}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </ResponsiveSheet>

      {/* Church Detail Sheet */}
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
        description={
          selectedChurch?.form === "Chi hội"
            ? `${selectedChurch?.code ?? ""} · ${selectedChurch?.regionName ?? ""} · ${selectedChurch?.form ?? ""}`
            : ""
        }
      >
        {churchLoading ? (
          <div className="h-64 rounded-2xl bg-white border border-slate-200/70 animate-pulse" />
        ) : (
          selectedChurch && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                {selectedChurch.legalType !== 'Cơ quan' && (
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
                {selectedChurch.form === "Chi hội" && (
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-slate-400">Năm thành lập</p>
                    <p className="mt-1 font-bold text-slate-900 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {selectedChurch.foundedYear ?? "Chưa cập nhật"}
                    </p>
                  </div>
                )}
              </div>

              {selectedChurch.form === "Chi hội" && (
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

              {selectedChurch.form === "Chi hội" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200/80 p-3.5">
                    <p className="text-[11px] font-semibold uppercase text-slate-400">
                      Số tín hữu
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-indigo-600" />
                      <span className="font-bold text-slate-900">
                        {selectedChurch.memberCount.toLocaleString("vi-VN")}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 p-3.5">
                    <p className="text-[11px] font-semibold uppercase text-slate-400">
                      Tín hữu trung tín
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                      <span className="font-bold text-slate-900">
                        {selectedChurch.regularAttendanceCount.toLocaleString(
                          "vi-VN",
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {selectedChurch.pastorName && (
                <div className="rounded-xl border border-slate-200/80 p-3.5 space-y-2">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">
                    {selectedChurch.pastorRole || "Quản nhiệm"}
                  </p>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-indigo-600" />
                    <span className="text-sm font-medium text-slate-900">
                      {displayPastorName(
                        selectedChurch.pastorTitle,
                        selectedChurch.pastorName,
                      )}
                      {selectedChurch.pastorRole && (
                        <span className="ml-1 text-[11px] font-medium text-slate-400">
                          ({selectedChurch.pastorRole})
                        </span>
                      )}
                    </span>
                  </div>
                  {selectedChurch.pastorPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-indigo-600" />
                      <a
                        href={`tel:${selectedChurch.pastorPhone}`}
                        className="text-sm text-indigo-600 hover:underline cursor-pointer"
                      >
                        {selectedChurch.pastorPhone}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}
      </ResponsiveSheet>

      {/* Organization Detail Sheet */}
      <ResponsiveSheet
        open={Boolean(selectedOrganization)}
        onOpenChange={(open) => !open && setSelectedOrganization(null)}
        title={
          selectedOrganization ? selectedOrganization.name : ""
        }
        description={
          selectedOrganization
            ? `ORG-${String(selectedOrganization.id).padStart(4, '0')} · Cơ quan`
            : ""
        }
      >
        {churchLoading ? (
          <div className="h-64 rounded-2xl bg-white border border-slate-200/70 animate-pulse" />
        ) : (
          selectedChurch && selectedChurch.form === "Cơ quan" && selectedChurch.pastors ? (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-slate-200/80 p-3.5 space-y-2">
                <p className="text-[11px] font-semibold uppercase text-slate-400">
                  Quản nhiệm
                </p>
                <div className="space-y-2">
                  {selectedChurch.pastors.map((p) => (
                    <div
                      key={p.id || p.name}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {p.name}
                          </div>
                          {p.title ? (
                            <div className="text-[11px] text-slate-500">
                              {p.title}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="shrink-0 rounded bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {p.role}
                        </span>
                      </div>
                    </div>
                  ))}
                  {selectedChurch.pastors.length === 0 && (
                    <div className="text-sm text-slate-500 text-center py-4">
                      Chưa có mục sư nào được phân công
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null
        )}
      </ResponsiveSheet>
    </div>
  );
}
