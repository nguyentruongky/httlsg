import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Building, UserCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ResponsiveSheet } from '@/components/ui/responsive-sheet';

export function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [levelScope, setLevelScope] = useState('Toàn Khu vực & Chi hội');
  const [headName, setHeadName] = useState('');
  const [headTitle, setHeadTitle] = useState('Trưởng Ban Chuyên Trách');
  const [description, setDescription] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.api.departments.$get();
      if (!res.ok) throw new Error('Failed to load departments');
      return res.json();
    },
  });

  const createDeptMutation = useMutation({
    mutationFn: async () => {
      const res = await api.api.departments.$post({
        json: {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          levelScope,
          headName: headName.trim(),
          headTitle: headTitle.trim(),
          activeUnitsCount: 30,
          totalMembersCount: 650,
          description: description.trim(),
        },
      });
      if (!res.ok) throw new Error('Failed to create department');
      return res.json();
    },
    onSuccess: () => {
      setSheetOpen(false);
      setCode('');
      setName('');
      setHeadName('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const depts = data?.departments ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Ban Ngành & Mục Vụ
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Hệ thống ban chuyên môn từ cấp Ban Đại Diện Khu vực đến từng Chi hội cơ sở
          </p>
        </div>

        <Button variant="primary" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          <span>Thêm Ban Ngành</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-white border border-slate-200/70 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {depts.map((dept) => (
            <div
              key={dept.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {dept.code}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {dept.levelScope}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-base font-bold text-slate-900">{dept.name}</h2>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{dept.description}</p>

              <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-slate-50 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-slate-400 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900">{dept.activeUnitsCount} Chi hội</p>
                    <p className="text-[10px] text-slate-500">Đang sinh hoạt</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-500 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900">
                      {dept.totalMembersCount.toLocaleString('vi-VN')}
                    </p>
                    <p className="text-[10px] text-slate-500">Ban viên tham gia</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
                <UserCircle2 className="h-4 w-4 text-slate-400 shrink-0" />
                <span>
                  <strong className="text-slate-900">{dept.headName}</strong> · {dept.headTitle}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <ResponsiveSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Thành Lập Ban Ngành Chuyên Môn"
        description="Bổ sung ban ngành mới vào cơ cấu tổ chức Hội Thánh."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!code.trim() || !name.trim() || !headName.trim() || !description.trim()) return;
            createDeptMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mã Ban</label>
              <input
                type="text"
                required
                placeholder="BAN-XH"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm uppercase outline-none focus:border-indigo-600 min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phạm vi cấp</label>
              <select
                value={levelScope}
                onChange={(e) => setLevelScope(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-600 min-h-[44px]"
              >
                <option value="Toàn Khu vực & Chi hội">Toàn Khu vực & Chi hội</option>
                <option value="Ban Đại Diện TP.HCM">Ban Đại Diện TP.HCM</option>
                <option value="Cấp Chi hội">Cấp Chi hội</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tên Ban Ngành</label>
            <input
              type="text"
              required
              placeholder="VD: Ban Y Tế & Từ Thiện Xã Hội"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-600 min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Trưởng Ban</label>
              <input
                type="text"
                required
                placeholder="Ms / Chấp sự..."
                value={headName}
                onChange={(e) => setHeadName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-600 min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Chức danh</label>
              <input
                type="text"
                value={headTitle}
                onChange={(e) => setHeadTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-600 min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Chức năng & Nhiệm vụ</label>
            <textarea
              rows={3}
              required
              placeholder="Mô tả hoạt động mục vụ của ban ngành..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-600"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full">
            Lưu Ban Ngành
          </Button>
        </form>
      </ResponsiveSheet>
    </div>
  );
}
