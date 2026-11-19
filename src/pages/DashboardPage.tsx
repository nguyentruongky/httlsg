import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Church,
  Users,
  MapPin,
  Layers,
  ArrowUpRight,
  Database,
  HardDrive,
  Shield,
  Map,
  UserIcon,
  UserCog,
} from "lucide-react";
import { api } from "@/lib/api";

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await api.api.dashboard.$get();
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
  });

  const summary = data?.summary;
  const regions = data?.regionBreakdown ?? [];
  const levels = data?.governanceLevels ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tổng quan Hội Thánh khu vực TP.HCM
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Thống kê hợp nhất sau sáp nhập địa giới hành chính 2026 (Khu vực I –
            VI)
          </p>
        </div>

        {data && (
          <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
            {data.mode === "postgres" ? (
              <>
                <Database className="h-3.5 w-3.5 text-emerald-600" />
                <span>PostgreSQL Live</span>
              </>
            ) : (
              <>
                <HardDrive className="h-3.5 w-3.5 text-indigo-600" />
                <span>172 Cơ Sở Đã Nạp Sẵn</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Tổng cơ sở</span>
            <Church className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2.5 text-2xl font-bold text-slate-900">
            {isLoading ? "—" : (summary?.totalCongregations ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {summary?.chiHoiCount ?? 0} Chi hội · {summary?.diemNhomCount ?? 0}{" "}
            Điểm nhóm · {summary?.hoiNhanhCount ?? 0} Hội nhánh
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Tổng số tín hữu</span>
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2.5 text-2xl font-bold text-slate-900">
            {isLoading
              ? "—"
              : (summary?.totalMembers ?? 0).toLocaleString("vi-VN")}
          </p>
          <p className="mt-1 text-[11px] text-emerald-700 font-medium">
            Theo danh sách kiểm kê 2026
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Tự lập / Tự dưỡng</span>
            <Shield className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2.5 text-2xl font-bold text-slate-900">
            {isLoading
              ? "—"
              : `${summary?.tuLapCount ?? 0} / ${summary?.tuDuongCount ?? 0}`}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {summary?.chinhThucCount ?? 0} Chính thức ·{" "}
            {summary?.noiBoCount ?? 0} Nội bộ
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Giáo phẩm</span>
            <UserCog className="h-4 w-4 text-violet-600" />
          </div>
          <p className="mt-2.5 text-2xl font-bold text-slate-900">
            {isLoading ? "—" : `${summary?.totalPastors ?? 0}`}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {summary?.totalDepartments ?? 8} Mục sư trí sự và quả phụ Mục
            sư/Truyền đạo
          </p>
        </div>
      </div>

      {/* 6 Administrative Zones (Khu vực I - VI) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Thống kê theo khu vực
          </h2>
          <Link
            to="/churches"
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            <span>Danh sách 172 Hội Thánh</span>
          </Link>
        </div>

        <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {regions.map((reg) => (
            <div
              key={reg.code}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      {reg.name}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 flex items-start gap-1">
                    <span>{reg.areaDescription}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {reg.chiHoiCount}
                  </p>
                  <p className="text-[10px] text-slate-500">Chi hội</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {reg.diemNhomCount + reg.hoiNhanhCount}
                  </p>
                  <p className="text-[10px] text-slate-500">ĐN & HN</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-indigo-600">
                    {reg.memberCount.toLocaleString("vi-VN")}
                  </p>
                  <p className="text-[10px] text-slate-500">Tín hữu</p>
                </div>
              </div>

              {reg.coordinatorName && (
                <p className="text-[11px] text-slate-500">
                  Điều phối:{" "}
                  <strong className="text-slate-800">
                    {reg.coordinatorName}
                  </strong>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
