import { Hono } from 'hono';
import { db } from '../../db';
import { churches, regions, governanceLevels, pastors, departments } from '../../db/schema';
import { memoryStore } from '../memory-store';

export const dashboardRoute = new Hono().get('/', async (c) => {
  if (!db) {
    const list = memoryStore.churches;
    const totalMembers = list.reduce((sum, item) => sum + item.memberCount, 0);
    const chiHoiCount = list.filter((x) => x.form === 'Chi hội').length;
    const diemNhomCount = list.filter((x) => x.form === 'Điểm nhóm').length;
    const hoiNhanhCount = list.filter((x) => x.form === 'Hội nhánh').length;
    const tuLapCount = list.filter((x) => x.autonomy === 'Tự lập').length;
    const tuDuongCount = list.filter((x) => x.autonomy === 'Tự dưỡng').length;
    const chinhThucCount = list.filter((x) => x.legalType === 'Chính thức').length;
    const noiBoCount = list.filter((x) => x.legalType === 'Nội bộ').length;

    const uniquePastors = new Set(
      list.map((x) => x.pastorName).filter((n): n is string => Boolean(n))
    );

    const regionBreakdown = memoryStore.regions.map((reg) => {
      const regChurches = list.filter((x) => x.regionCode === reg.code);
      return {
        ...reg,
        totalUnits: regChurches.length,
        chiHoiCount: regChurches.filter((x) => x.form === 'Chi hội').length,
        diemNhomCount: regChurches.filter((x) => x.form === 'Điểm nhóm').length,
        hoiNhanhCount: regChurches.filter((x) => x.form === 'Hội nhánh').length,
        memberCount: regChurches.reduce((s, x) => s + x.memberCount, 0),
      };
    });

    return c.json({
      mode: 'memory' as const,
      summary: {
        totalCongregations: list.length,
        totalMembers,
        chiHoiCount,
        diemNhomCount,
        hoiNhanhCount,
        tuLapCount,
        tuDuongCount,
        chinhThucCount,
        noiBoCount,
        totalPastors: uniquePastors.size,
        totalDepartments: memoryStore.departments.length,
      },
      regionBreakdown,
      governanceLevels: memoryStore.governanceLevels,
    });
  }

  const [allChurches, allRegions, allLevels, allPastors, allDepartments] = await Promise.all([
    db.select().from(churches),
    db.select().from(regions),
    db.select().from(governanceLevels),
    db.select().from(pastors),
    db.select().from(departments),
  ]);

  const totalMembers = allChurches.reduce((sum, item) => sum + item.memberCount, 0);

  const regionBreakdown = allRegions
    .sort((a, b) => a.id - b.id)
    .map((reg) => {
      const regChurches = allChurches.filter((x) => x.regionId === reg.id);
      return {
        ...reg,
        totalUnits: regChurches.length,
        chiHoiCount: regChurches.filter((x) => x.form === 'Chi hội').length,
        diemNhomCount: regChurches.filter((x) => x.form === 'Điểm nhóm').length,
        hoiNhanhCount: regChurches.filter((x) => x.form === 'Hội nhánh').length,
        memberCount: regChurches.reduce((s, x) => s + x.memberCount, 0),
      };
    });

  return c.json({
    mode: 'postgres' as const,
    summary: {
      totalCongregations: allChurches.length,
      totalMembers,
      chiHoiCount: allChurches.filter((x) => x.form === 'Chi hội').length,
      diemNhomCount: allChurches.filter((x) => x.form === 'Điểm nhóm').length,
      hoiNhanhCount: allChurches.filter((x) => x.form === 'Hội nhánh').length,
      tuLapCount: allChurches.filter((x) => x.autonomy === 'Tự lập').length,
      tuDuongCount: allChurches.filter((x) => x.autonomy === 'Tự dưỡng').length,
      chinhThucCount: allChurches.filter((x) => x.legalType === 'Chính thức').length,
      noiBoCount: allChurches.filter((x) => x.legalType === 'Nội bộ').length,
      totalPastors: allPastors.length,
      totalDepartments: allDepartments.length,
    },
    regionBreakdown,
    governanceLevels: allLevels.sort((a, b) => a.tier - b.tier),
  });
});
