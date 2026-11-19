import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import rawSeedRecords from './seed-data.json';

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

const REGION_METADATA: Record<string, { name: string; areaDescription: string; coordinatorName: string }> = {
  I: {
    name: 'Khu vực I',
    areaDescription: 'Trung tâm Sài Gòn, Chợ Lớn, Quận 1, 3, 4, 5, 8, 10, Nhà Bè, Cần Giờ',
    coordinatorName: 'Mục sư Phạm Trọng Huy',
  },
  II: {
    name: 'Khu vực II',
    areaDescription: 'TP. Thủ Đức (Quận 2, Quận 9, Thủ Đức cũ) & Khu Đông',
    coordinatorName: 'Mục sư Trương Văn Ngành',
  },
  III: {
    name: 'Khu vực III',
    areaDescription: 'Tân Bình, Tân Phú, Phú Nhuận, Bình Thạnh, Gò Vấp',
    coordinatorName: 'Mục sư Dương Quang Nhân',
  },
  IV: {
    name: 'Khu vực IV',
    areaDescription: 'Quận 6, Quận 11, Bình Tân, Quận 12, Hóc Môn, Củ Chi',
    coordinatorName: 'Mục sư Nguyễn Đình Trung',
  },
  V: {
    name: 'Khu vực V',
    areaDescription: 'Bình Dương mở rộng (Thủ Dầu Một, Thuận An, Dĩ An, Bến Cát, Tân Uyên)',
    coordinatorName: 'Mục sư Phan Quang Trung',
  },
  VI: {
    name: 'Khu vực VI',
    areaDescription: 'Bà Rịa – Vũng Tàu mở rộng (Vũng Tàu, Phú Mỹ, Châu Đức, Xuyên Mộc, Long Điền)',
    coordinatorName: 'Mục sư Nguyễn Hoàng Thanh Lâm',
  },
};

const GOVERNANCE_LEVEL_DATA = [
  {
    tier: 1,
    code: 'LVL-BĐD',
    name: 'Cấp 1: Ban Đại Diện Tin Lành TP.HCM',
    description: 'Cơ quan điều hành cao nhất cấp Thành phố, trực thuộc Tổng Liên Hội.',
    permissionsSummary: 'Phê duyệt thành lập Chi hội, bổ nhiệm Quản nhiệm, điều phối 6 Khu vực & các Ban Chuyên Môn.',
  },
  {
    tier: 2,
    code: 'LVL-KV',
    name: 'Cấp 2: Ban Điều Hành Khu vực (KV I – VI)',
    description: 'Quản lý hành chính và mục vụ theo cụm địa bàn liên phường/xã sau sáp nhập 2026.',
    permissionsSummary: 'Giám sát hoạt động Chi hội, Điểm nhóm, báo cáo số liệu tín hữu và hiệp nguyện Khu vực.',
  },
  {
    tier: 3,
    code: 'LVL-CH',
    name: 'Cấp 3: Chi hội Cơ Sở (Tự Lập / Tự Dưỡng)',
    description: 'Đơn vị Hội Thánh cơ sở có Ban Chấp Sự điều hành và Mục sư Quản nhiệm.',
    permissionsSummary: 'Quản lý danh sách tín hữu, tài chánh nội bộ, các Ban Ngành và bảo trợ Hội nhánh / Điểm nhóm.',
  },
  {
    tier: 4,
    code: 'LVL-ĐN',
    name: 'Cấp 4: Hội nhánh & Điểm nhóm Trực Thuộc',
    description: 'Điểm sinh hoạt truyền giảng và gây dựng đức tin trực thuộc một Chi hội mẹ.',
    permissionsSummary: 'Sinh hoạt thờ phượng định kỳ dưới sự kiêm nhiệm hoặc đặc trách của Truyền đạo / Mục sư.',
  },
];

const DEPARTMENT_DATA = [
  {
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
    code: 'BAN-TC',
    name: 'Ban Tài Chánh & Quản Trị Cơ Sở',
    levelScope: 'Ban Đại Diện & Chi hội',
    headName: 'Mục sư Võ Hoàng Sinh Nhựt',
    headTitle: 'Thủ Quỹ Ban Đại Diện',
    activeUnitsCount: 110,
    totalMembersCount: 890,
    description: 'Minh bạch ngân sách, hỗ trợ các Chi hội Tự dưỡng và thủ tục pháp lý cơ sở tôn giáo.',
  },
];

const NORMALIZE_PASTOR_NAME: Record<string, string> = {
  'v. h. thiên ân': 'Vũ Hoàng Thiên Ân',
};

function normalizePastorName(raw: string): string {
  const key = raw.toLowerCase().trim();
  return NORMALIZE_PASTOR_NAME[key] ?? raw;
}

function parsePastorInfo(raw: string | null) {
  if (!raw) return null;
  const isConcurrent = /\(Kiêm\)/i.test(raw);
  const isSpecial = /\(ĐT\)/i.test(raw);
  const cleanName = normalizePastorName(
    raw.replace(/\((Kiêm|ĐT)\)/gi, '').trim()
  );

  let title = 'Mục sư';
  if (cleanName.startsWith('MsNc')) title = 'Mục sư Nhiệm chức';
  else if (cleanName.startsWith('Tđ')) title = 'Truyền đạo';

  const role = isConcurrent ? 'Kiêm nhiệm' : isSpecial ? 'Đặc trách' : 'Quản nhiệm';
  return { cleanName, title, role };
}

async function seed() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Missing DATABASE_URL or DIRECT_URL in .env');
    process.exit(1);
  }

  console.log('🌱 Connecting to PostgreSQL and seeding Church Management System...');
  const client = postgres(connectionString, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });

  const records = rawSeedRecords as RawChurchSeed[];

  // 1. Seed Governance Levels
  for (const lvl of GOVERNANCE_LEVEL_DATA) {
    await db
      .insert(schema.governanceLevels)
      .values(lvl)
      .onConflictDoUpdate({
        target: schema.governanceLevels.tier,
        set: {
          name: lvl.name,
          description: lvl.description,
          permissionsSummary: lvl.permissionsSummary,
        },
      });
  }
  console.log(`✅ Seeded ${GOVERNANCE_LEVEL_DATA.length} governance levels`);

  // 2. Seed Regions (KV I - VI)
  const regionIdByCode = new Map<string, number>();
  for (const [code, meta] of Object.entries(REGION_METADATA)) {
    const [row] = await db
      .insert(schema.regions)
      .values({ code, ...meta })
      .onConflictDoUpdate({
        target: schema.regions.code,
        set: meta,
      })
      .returning();
    regionIdByCode.set(code, row.id);
  }
  console.log(`✅ Seeded ${regionIdByCode.size} administrative regions (KV I–VI)`);

  // 3. Seed Deduplicated Pastors
  const existingPastors = await db.select().from(schema.pastors);
  const pastorIdByName = new Map<string, number>(
    existingPastors.map((p) => [p.fullName.toLowerCase(), p.id])
  );

  for (const rec of records) {
    const parsed = parsePastorInfo(rec.pastorRaw);
    if (!parsed) continue;
    const key = parsed.cleanName.toLowerCase();
    if (!pastorIdByName.has(key)) {
      const [inserted] = await db
        .insert(schema.pastors)
        .values({
          fullName: parsed.cleanName,
          title: parsed.title,
          phone: rec.phone,
          status: 'active',
        })
        .returning();
      pastorIdByName.set(key, inserted.id);
    }
  }
  console.log(`✅ Seeded ${pastorIdByName.size} clergy records`);

  // 4. First Pass: Insert / Upsert all 172 Churches
  const churchIdByShortName = new Map<string, number>();
  const churchIdByStt = new Map<number, number>();

  for (const rec of records) {
    const regionId = regionIdByCode.get(rec.regionCode) ?? regionIdByCode.get('I')!;
    const prefix =
      rec.form === 'Chi hội' ? 'CH' : rec.form === 'Hội nhánh' ? 'HN' : 'DN';
    const code = `${prefix}-${String(rec.stt).padStart(3, '0')}`;

    const [upserted] = await db
      .insert(schema.churches)
      .values({
        stt: rec.stt,
        code,
        form: rec.form,
        legalType: rec.legalType,
        autonomy: rec.autonomy,
        name: rec.name,
        shortName: rec.shortName,
        parentChurchName: rec.parentName,
        regionId,
        foundedYear: rec.foundedYear,
        oldWard: rec.oldWard,
        oldAddress: rec.oldAddress,
        newAddress: rec.newAddress,
        newWard: rec.newWard,
        isInHcm: rec.isInHcm,
        memberCount: rec.memberCount,
        note: rec.note,
      })
      .onConflictDoUpdate({
        target: schema.churches.stt,
        set: {
          form: rec.form,
          legalType: rec.legalType,
          autonomy: rec.autonomy,
          name: rec.name,
          shortName: rec.shortName,
          parentChurchName: rec.parentName,
          regionId,
          foundedYear: rec.foundedYear,
          oldWard: rec.oldWard,
          oldAddress: rec.oldAddress,
          newAddress: rec.newAddress,
          newWard: rec.newWard,
          isInHcm: rec.isInHcm,
          memberCount: rec.memberCount,
          note: rec.note,
        },
      })
      .returning();

    churchIdByStt.set(rec.stt, upserted.id);
    if (rec.form === 'Chi hội') {
      churchIdByShortName.set(rec.shortName.toUpperCase(), upserted.id);
      churchIdByShortName.set(rec.name.toUpperCase(), upserted.id);
    }
  }

  // 5. Second Pass: Link Parent Mother Churches (CH trực thuộc) & Pastoral Assignments
  await db.delete(schema.pastoralAssignments);

  let linkedParents = 0;
  let linkedPastors = 0;

  for (const rec of records) {
    const churchId = churchIdByStt.get(rec.stt)!;

    if (rec.parentName) {
      const parentId = churchIdByShortName.get(rec.parentName.toUpperCase());
      if (parentId && parentId !== churchId) {
        await db
          .update(schema.churches)
          .set({ parentChurchId: parentId })
          .where(eq(schema.churches.id, churchId));
        linkedParents++;
      }
    }

    const parsed = parsePastorInfo(rec.pastorRaw);
    if (parsed) {
      const pastorId = pastorIdByName.get(parsed.cleanName.toLowerCase());
      if (pastorId) {
        await db.insert(schema.pastoralAssignments).values({
          churchId,
          pastorId,
          role: parsed.role,
          isPrimary: true,
        });
        linkedPastors++;
      }
    }
  }
  console.log(
    `✅ Seeded ${records.length} congregations (${linkedParents} parent Chi hội links, ${linkedPastors} pastoral assignments)`
  );

  // 6. Seed Departments
  const seededDepts = [];
  for (const dept of DEPARTMENT_DATA) {
    const [row] = await db
      .insert(schema.departments)
      .values(dept)
      .onConflictDoUpdate({
        target: schema.departments.code,
        set: dept,
      })
      .returning();
    seededDepts.push(row);
  }
  console.log(`✅ Seeded ${seededDepts.length} functional departments`);

  // 7. Seed sample local department assignments for major Chi hội
  const majorChurches = records.filter((r) => r.form === 'Chi hội' && r.memberCount >= 300).slice(0, 10);
  for (const mc of majorChurches) {
    const cId = churchIdByStt.get(mc.stt)!;
    for (const dept of seededDepts.slice(0, 4)) {
      await db
        .insert(schema.churchDepartments)
        .values({
          churchId: cId,
          departmentId: dept.id,
          leaderName: `Chấp sự Đặc trách ${dept.name.replace('Ban ', '')}`,
          memberCount: Math.max(15, Math.round(mc.memberCount * 0.14)),
          meetingSchedule: 'Chúa Nhật · 10:30',
        })
        .onConflictDoNothing();
    }
  }

  console.log('🎉 Database seed completed successfully!');
  await client.end();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
