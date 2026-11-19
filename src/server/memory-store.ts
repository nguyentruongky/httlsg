import rawSeedRecords from '../db/seed-data.json';

interface RawChurchSeed {
  stt: number;
  form: string;
  legalType: string;
  autonomy: string | null;
  name: string;
  shortName: string;
  displayName: string;
  parentName: string | null;
  regionCode: string;
  foundedYear: number | null;
  oldWard: string | null;
  oldAddress: string | null;
  newAddress: string | null;
  newWard: string | null;
  pastorRaw: string | null;
  phone: string | null;
  memberCount: number;
  note: string | null;
  isInHcm: boolean;
}

export interface MemoryChurch {
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
  pastorEmail: string | null;
}

export interface MemoryDepartment {
  id: number;
  code: string;
  name: string;
  levelScope: string;
  headName: string;
  headTitle: string;
  activeUnitsCount: number;
  totalMembersCount: number;
  description: string;
}

const REGION_NAMES: Record<string, { name: string; area: string; coordinator: string }> = {
  I: {
    name: 'Khu vực I',
    area: 'Sài Gòn, Chợ Lớn, Q.1, Q.3, Q.4, Q.5, Q.8, Q.10, Nhà Bè, Cần Giờ',
    coordinator: 'Mục sư Phạm Trọng Huy',
  },
  II: {
    name: 'Khu vực II',
    area: 'TP. Thủ Đức (Q.2, Q.9, Thủ Đức cũ) & Khu Đông',
    coordinator: 'Mục sư Trương Văn Ngành',
  },
  III: {
    name: 'Khu vực III',
    area: 'Tân Bình, Tân Phú, Phú Nhuận, Bình Thạnh, Gò Vấp',
    coordinator: 'Mục sư Dương Quang Nhân',
  },
  IV: {
    name: 'Khu vực IV',
    area: 'Q.6, Q.11, Bình Tân, Q.12, Hóc Môn, Củ Chi',
    coordinator: 'Mục sư Nguyễn Đình Trung',
  },
  V: {
    name: 'Khu vực V',
    area: 'Bình Dương mở rộng (Thủ Dầu Một, Thuận An, Dĩ An, Bến Cát, Tân Uyên)',
    coordinator: 'Mục sư Phan Quang Trung',
  },
  VI: {
    name: 'Khu vực VI',
    area: 'Bà Rịa – Vũng Tàu mở rộng (Vũng Tàu, Phú Mỹ, Châu Đức, Xuyên Mộc, Long Điền)',
    coordinator: 'Mục sư Nguyễn Hoàng Thanh Lâm',
  },
};

function parsePastor(raw: string | null) {
  if (!raw) return { name: null, title: null, role: null };
  const isConcurrent = /\(Kiêm\)/i.test(raw);
  const isSpecial = /\(ĐT\)/i.test(raw);
  const name = raw.replace(/\((Kiêm|ĐT)\)/gi, '').trim();
  let title = 'Mục sư';
  if (name.startsWith('MsNc')) title = 'Mục sư Nhiệm chức';
  else if (name.startsWith('Tđ')) title = 'Truyền đạo';
  const role = isConcurrent ? 'Kiêm nhiệm' : isSpecial ? 'Đặc trách' : 'Quản nhiệm';
  return { name, title, role };
}

const initialChurches: MemoryChurch[] = (rawSeedRecords as RawChurchSeed[]).map((r) => {
  const prefix = r.form === 'Chi hội' ? 'CH' : r.form === 'Hội nhánh' ? 'HN' : 'DN';
  const p = parsePastor(r.pastorRaw);
  return {
    id: r.stt,
    stt: r.stt,
    code: `${prefix}-${String(r.stt).padStart(3, '0')}`,
    form: r.form,
    legalType: r.legalType,
    autonomy: r.autonomy,
    name: r.name,
    shortName: r.shortName,
    parentChurchId: null,
    parentChurchName: r.parentName,
    regionCode: r.regionCode,
    regionName: REGION_NAMES[r.regionCode]?.name ?? `Khu vực ${r.regionCode}`,
    foundedYear: r.foundedYear,
    oldWard: r.oldWard,
    oldAddress: r.oldAddress,
    newAddress: r.newAddress,
    newWard: r.newWard,
    isInHcm: r.isInHcm,
    memberCount: r.memberCount,
    regularAttendanceCount: Math.round((r.memberCount ?? 0) * 0.65),
    note: r.note,
    pastorName: p.name,
    pastorTitle: p.title,
    pastorRole: p.role,
    pastorPhone: r.phone,
    pastorEmail: null,
  };
});

// Link parent IDs in memory
const byShortName = new Map<string, number>();
for (const c of initialChurches) {
  if (c.form === 'Chi hội') {
    byShortName.set(c.shortName.toUpperCase(), c.id);
    byShortName.set(c.name.toUpperCase(), c.id);
  }
}
for (const c of initialChurches) {
  if (c.parentChurchName) {
    c.parentChurchId = byShortName.get(c.parentChurchName.toUpperCase()) ?? null;
  }
}

export const memoryStore = {
  regions: Object.entries(REGION_NAMES).map(([code, info], idx) => ({
    id: idx + 1,
    code,
    name: info.name,
    areaDescription: info.area,
    coordinatorName: info.coordinator,
  })),
  governanceLevels: [
    {
      id: 1,
      tier: 1,
      code: 'LVL-BĐD',
      name: 'Cấp 1: Ban Đại Diện Tin Lành TP.HCM',
      description: 'Cơ quan điều hành cao nhất cấp Thành phố, trực thuộc Tổng Liên Hội.',
      permissionsSummary: 'Phê duyệt thành lập Chi hội, bổ nhiệm Quản nhiệm, điều phối 6 Khu vực & các Ban Chuyên Môn.',
    },
    {
      id: 2,
      tier: 2,
      code: 'LVL-KV',
      name: 'Cấp 2: Ban Điều Hành Khu vực (KV I – VI)',
      description: 'Quản lý hành chính và mục vụ theo cụm địa bàn liên phường/xã sau sáp nhập 2026.',
      permissionsSummary: 'Giám sát hoạt động Chi hội, Điểm nhóm, báo cáo số liệu tín hữu và hiệp nguyện Khu vực.',
    },
    {
      id: 3,
      tier: 3,
      code: 'LVL-CH',
      name: 'Cấp 3: Chi hội Cơ Sở (Tự Lập / Tự Dưỡng)',
      description: 'Đơn vị Hội Thánh cơ sở có Ban Chấp Sự điều hành và Mục sư Quản nhiệm.',
      permissionsSummary: 'Quản lý danh sách tín hữu, tài chánh nội bộ, các Ban Ngành và bảo trợ Hội nhánh / Điểm nhóm.',
    },
    {
      id: 4,
      tier: 4,
      code: 'LVL-ĐN',
      name: 'Cấp 4: Hội nhánh & Điểm nhóm Trực Thuộc',
      description: 'Điểm sinh hoạt truyền giảng và gây dựng đức tin trực thuộc một Chi hội mẹ.',
      permissionsSummary: 'Sinh hoạt thờ phượng định kỳ dưới sự kiêm nhiệm hoặc đặc trách của Truyền đạo / Mục sư.',
    },
  ],
  churches: initialChurches,
  departments: [
    {
      id: 1,
      code: 'BAN-TT',
      name: 'Ban Thanh Tráng',
      levelScope: 'Toàn Khu vực & Chi hội',
      headName: 'Mục sư Nguyễn Công Minh Sơn',
      headTitle: 'Trưởng Ban Thanh Tráng KV',
      activeUnitsCount: 118,
      totalMembersCount: 8450,
      description: 'Mục vụ dành cho giới trẻ đi làm, gia đình trẻ và nhân sự chuyên môn tại các Chi hội.',
    },
    {
      id: 2,
      code: 'BAN-TN',
      name: 'Ban Thanh Niên',
      levelScope: 'Toàn Khu vực & Chi hội',
      headName: 'Truyền đạo Phan Tùng Nghĩa',
      headTitle: 'Đặc Trách Thanh Niên',
      activeUnitsCount: 134,
      totalMembersCount: 9620,
      description: 'Sinh hoạt sinh viên, học sinh THPT, trại hè bồi linh và huấn luyện kỹ năng lãnh đạo trẻ.',
    },
    {
      id: 3,
      code: 'BAN-TCN',
      name: 'Ban Thiếu Nhi & Trường Chúa Nhật',
      levelScope: 'Cấp Chi hội & Điểm nhóm',
      headName: 'Mục sư Nhiệm chức Phan Minh Thành',
      headTitle: 'Trưởng Ban Cơ Đốc Giáo Dục',
      activeUnitsCount: 158,
      totalMembersCount: 7840,
      description: 'Chương trình giáo dục Kinh Thánh theo lứa tuổi Ấu nhi, Nhi đồng, Thiếu nhi và Thiếu niên.',
    },
    {
      id: 4,
      code: 'BAN-PN',
      name: 'Ban Phụ Nữ',
      levelScope: 'Toàn Khu vực & Chi hội',
      headName: 'Bà Mục sư Châu Minh Tâm',
      headTitle: 'Trưởng Ban Phụ Nữ KV',
      activeUnitsCount: 142,
      totalMembersCount: 10200,
      description: 'Bồi dưỡng đời sống gia đình Cơ Đốc, thăm viếng chăm sóc và công tác từ thiện xã hội.',
    },
    {
      id: 5,
      code: 'BAN-TRN',
      name: 'Ban Tráng Niên & Lão Niên',
      levelScope: 'Cấp Chi hội',
      headName: 'Mục sư Trần Lương Đông',
      headTitle: 'Cố Vấn Mục Vụ Tráng Niên',
      activeUnitsCount: 105,
      totalMembersCount: 5993,
      description: 'Chăm sóc đời sống thuộc linh, cầu thay và nâng đỡ các tín hữu trung niên, cao tuổi.',
    },
    {
      id: 6,
      code: 'BAN-TG',
      name: 'Ban Truyền Giảng & Mở Hội Thánh Mới',
      levelScope: 'Liên Hội Thánh (KV I–VI)',
      headName: 'Mục sư Lê Khắc Cường',
      headTitle: 'Trưởng Ban Truyền Giảng',
      activeUnitsCount: 62,
      totalMembersCount: 3150,
      description: 'Phát triển các Điểm nhóm mới, chương trình truyền giảng Khu vực và huấn luyện chứng đạo.',
    },
    {
      id: 7,
      code: 'BAN-AN',
      name: 'Ban Âm Nhạc & Thờ Phượng',
      levelScope: 'Toàn Khu vực',
      headName: 'Truyền đạo Nguyễn Ngọc Tuấn',
      headTitle: 'Điều Phối Thờ Phượng',
      activeUnitsCount: 129,
      totalMembersCount: 4120,
      description: 'Đào tạo ca đoàn, ban nhạc lễ拜 và tổ chức các chương trình Thánh nhạc Khu vực.',
    },
    {
      id: 8,
      code: 'BAN-TC',
      name: 'Ban Tài Chánh & Quản Trị Cơ Sở',
      levelScope: 'Ban Đại Diện & Chi hội',
      headName: 'Mục sư Võ Hoàng Sinh Nhựt',
      headTitle: 'Thủ Quỹ Ban Đại Diện',
      activeUnitsCount: 110,
      totalMembersCount: 890,
      description: 'Minh bạch ngân sách, hỗ trợ các Chi hội Tự dưỡng và thủ tục pháp lý cơ sở tôn giáo.',
    },
  ] as MemoryDepartment[],
  nextChurchId: 173,
  nextDepartmentId: 9,
};
