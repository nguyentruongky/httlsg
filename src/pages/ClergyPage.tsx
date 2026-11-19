import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Phone,
  Church,
  User,
  Shield,
  MapPin,
  Calendar,
  Mail,
  Briefcase,
} from "lucide-react";
import { api } from "@/lib/api";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import {
  matchesSearch,
  displayChurchName,
  displayPastorName,
} from "@/lib/utils";

type ClergyItem = {
  name: string;
  title: string | null;
  phone: string | null;
  email?: string | null;
  chucVu?: string | null;
  chucDanh?: string | null;
  namSinh?: number | null;
  tenNhiemSo?: string | null;
  diaChi?: string | null;
  nhuDanh?: string | null;
  status?: string | null;
  assignments: {
    churchId: number;
    churchName: string;
    form: string;
    regionCode: string;
    role: string;
    memberCount: number;
  }[];
};

export function ClergyPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<ClergyItem | null>(null);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => setDebouncedSearch(val), 250);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["clergy"],
    queryFn: async () => {
      const res = await api.api.clergy.$get();
      if (!res.ok) throw new Error("Failed to load clergy");
      return res.json();
    },
  });

  const clergyList = useMemo(() => {
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
        chucDanh?: string | null;
        namSinh?: number | null;
        tenNhiemSo?: string | null;
        diaChi?: string | null;
        nhuDanh?: string | null;
        status?: string | null;
        assignments: {
          churchId: number;
          churchName: string;
          form: string;
          regionCode: string;
          role: string;
          memberCount: number;
        }[];
      }
    >();

    for (const person of data?.clergy ?? []) {
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
          !existing.chucDanh &&
          (person as { chucDanh?: string | null }).chucDanh
        ) {
          existing.chucDanh = (person as { chucDanh?: string | null }).chucDanh;
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

    let list = Array.from(pastorMap.values()).sort((a, b) => {
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
  }, [data?.clergy, debouncedSearch]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Danh Bộ Giáo Phẩm ({clergyList.length})
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Mục sư Quản nhiệm, Kiêm nhiệm & Truyền đạo Đặc trách tại KV TP.HCM
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={handleSearchChange}
          placeholder="Tìm tên Mục sư, Truyền đạo, số điện thoại hoặc Hội Thánh..."
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-indigo-600 min-h-[44px]"
        />
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
          {clergyList.map((person) => (
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

                {person.assignments.length > 0 || person.chucDanh ? (
                  <div className="space-y-1">
                    {[
                      ...(person.chucDanh
                        ? person.chucDanh
                            .split(" | ")
                            // Drop chuc_danh parts that duplicate an assignment
                            // (assignment has higher priority)
                            .filter((part) => {
                              const churchPart = part
                                .split(":")
                                .pop()
                                ?.trim()
                                .toLowerCase() ?? part.toLowerCase();
                              return !person.assignments.some(
                                (a) =>
                                  a.churchName
                                    .toLowerCase()
                                    .includes(churchPart) ||
                                  churchPart.includes(
                                    a.churchName.toLowerCase()
                                  )
                              );
                            })
                            .map((part) => ({
                              label: part,
                              role: null as string | null,
                              isChucDanh: true,
                            }))
                        : []),
                      ...person.assignments.map((a) => ({
                        label: `${displayChurchName(a.form, a.churchName)} (KV ${a.regionCode})`,
                        role: a.role,
                        isChucDanh: false,
                      })),
                    ].map((item, i) => (
                      <div
                        key={`assign-${i}`}
                        className="flex items-center justify-between gap-2 text-xs rounded-lg  px-3 py-2"
                      >
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                          {item.isChucDanh &&
                          /quản nhiệm|chi hội|điểm nhóm/i.test(item.label) ? (
                            <Church className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          ) : item.isChucDanh ? (
                            <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <Church className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          )}
                          <span>{item.label}</span>
                        </span>
                        {!item.isChucDanh && (
                          <span className="shrink-0 rounded bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {item.role}
                          </span>
                        )}
                      </div>
                    ))}
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
                      const infoItems = [
                        selectedPerson.chucVu,
                        selectedPerson.chucDanh,
                        selectedPerson.namSinh,
                        selectedPerson.tenNhiemSo,
                        selectedPerson.nhuDanh,
                        selectedPerson.diaChi,
                      ].filter(Boolean);
                      const isSingle = infoItems.length === 1;
                      return (
                        <>
                          {selectedPerson.chucVu && (
                            <div
                              className={`rounded-xl border border-slate-200/80 p-4 bg-white ${isSingle ? "md:col-span-2" : ""}`}
                            >
                              <p className="text-[11px] font-semibold uppercase text-slate-400 mb-2">
                                Chức vụ
                              </p>
                              <p className="text-sm text-slate-900">
                                {selectedPerson.chucVu}
                              </p>
                            </div>
                          )}
                          {selectedPerson.chucDanh && (
                            <div
                              className={`rounded-xl border border-slate-200/80 p-4 bg-white ${isSingle ? "md:col-span-2" : ""}`}
                            >
                              <p className="text-[11px] font-semibold uppercase text-slate-400 mb-2">
                                Chức danh
                              </p>
                              <div className="space-y-1">
                                {selectedPerson.chucDanh
                                  .split(" | ")
                                  .map((part, i) => (
                                    <p
                                      key={i}
                                      className="text-sm text-slate-900"
                                    >
                                      {part}
                                    </p>
                                  ))}
                              </div>
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
                        Nhiệm vụ tại Hội Thánh (
                        {selectedPerson.assignments.length})
                      </h2>
                      <div className="space-y-2">
                        {selectedPerson.assignments.map((a) => (
                          <div
                            key={`${a.churchId}-${a.role}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Church className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {displayChurchName(a.form, a.churchName)}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                                  <span>KV {a.regionCode}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="shrink-0 rounded bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                {a.role}
                              </span>
                              {a.memberCount > 0 && (
                                <div className="mt-1 text-[11px] font-medium text-slate-500">
                                  {a.memberCount.toLocaleString("vi-VN")} tín
                                  hữu
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </ResponsiveSheet>
    </div>
  );
}
