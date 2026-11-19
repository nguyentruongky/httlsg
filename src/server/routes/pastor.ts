import { Hono } from 'hono';
import { db } from '../../db';
import { pastors, pastoralAssignments, churches, regions, pastorNhuDanh, organizations } from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { memoryStore } from '../memory-store';

const NORMALIZE_PASTOR_NAME: Record<string, string> = {
  'v. h. thiên ân': 'Vũ Hoàng Thiên Ân',
};

function normalizePastorName(raw: string): string {
  const key = raw.toLowerCase().trim();
  return NORMALIZE_PASTOR_NAME[key] ?? raw;
}

function parsePastorName(raw: string): {
  name: string;
  namSinh: number | null;
} {
  const match = raw.match(/[\[\(](\d{4})[\]\)]\s*$/);
  const namSinh = match ? Number(match[1]) : null;
  const name = match ? raw.replace(/[\[\(]\d{4}[\]\)]\s*$/, '').trim() : raw;
  return { name: normalizePastorName(name), namSinh };
}

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  return phone.replace(/\s+/g, '').trim() || null;
}

const CHUC_DANH_ROLE_KEYWORDS = [
  'quản nhiệm',
  'kiêm nhiệm',
  'phụ tá',
  'phụ trách',
  'đặc trách',
  'tạm lo',
  'ủy viên tlh',
  'ủy viên',
  'trưởng ban',
  'chuyên trách',
  'phó hội trưởng',
  'viện trưởng',
  'phó tổng thủ quỹ',
  'hội trưởng',
  'thư ký',
  'giám quản',
  'giám thị',
  'giám học',
  'truyền giáo tại',
  'nhân sự đại diện',
];

function stripDateSuffix(text: string): string {
  return text.replace(/\s*\(NK:\s*\d{4}-\d{4}\)\s*$/i, '');
}

export const pastorRoute = new Hono().get('/', async (c) => {
  const q = (c.req.query('q') || '').trim().toLowerCase();

  if (!db) {
    const map = new Map<
      string,
      {
        name: string;
        title: string;
        phone: string | null;
        chucVu: string | null;
        nhuDanh: string | null;
        assignments: {
          churchId: number | null;
          organizationId: number | null;
          churchName: string;
          form: string;
          regionCode: string;
          role: string;
          memberCount: number;
          source: 'db' | 'chuc-danh';
          isInHcm: boolean;
        }[];
      }
    >();

    for (const ch of memoryStore.churches) {
      if (!ch.pastorName) continue;
      const key = normalizePastorName(ch.pastorName);
      const existing = map.get(key);
      const assignment = {
        churchId: ch.id,
        organizationId: null as number | null,
        churchName: ch.name,
        form: ch.form,
        regionCode: ch.regionCode,
        role: ch.pastorRole ?? 'Quản nhiệm',
        memberCount: ch.memberCount,
        source: 'db' as const,
        isInHcm: ch.isInHcm,
      };
      if (existing) {
        existing.assignments.push(assignment);
        if (!existing.phone && ch.pastorPhone) existing.phone = normalizePhone(ch.pastorPhone);
        else if (existing.phone) existing.phone = normalizePhone(existing.phone);
      } else {
        map.set(key, {
          ...parsePastorName(ch.pastorName),
          title: ch.pastorTitle ?? 'Mục sư',
          phone: normalizePhone(ch.pastorPhone),
          chucVu: null,
          nhuDanh: null,
          assignments: [assignment],
        });
      }
    }

    let list = Array.from(map.values()).sort((a, b) => {
      const aHasHcm = a.assignments.some((x) => x.isInHcm);
      const bHasHcm = b.assignments.some((x) => x.isInHcm);
      if (aHasHcm !== bHasHcm) return bHasHcm ? 1 : -1;
      const aLast = a.name.trim().split(/\s+/).pop() ?? "";
      const bLast = b.name.trim().split(/\s+/).pop() ?? "";
      return aLast.localeCompare(bLast, "vi", { sensitivity: "base" });
    });

    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.phone && p.phone.includes(q)) ||
          p.assignments.some((a) => a.churchName.toLowerCase().includes(q))
      );
    }

    return c.json({ pastor: list, total: list.length });
  }

  const [allPastors, allAssignments, allChurches, allOrganizations, allRegions, allNhuDanh] = await Promise.all([
    db.select().from(pastors),
    db.select().from(pastoralAssignments),
    db.select().from(churches),
    db.select().from(organizations),
    db.select().from(regions),
    db.select().from(pastorNhuDanh),
  ]);

  const churchMap = new Map(allChurches.map((ch) => [ch.id, ch]));
  const orgMap = new Map(allOrganizations.map((o) => [o.id, o]));
  const regionMap = new Map(allRegions.map((r) => [r.id, r]));
  const nhuDanhMap = new Map(allNhuDanh.map((n) => [n.pastorId, n.nhuDanh]));

    const list = allPastors.map((p) => {
      const parsed = parsePastorName(p.fullName);

      const dbAssigns = allAssignments
        .filter((a) => a.pastorId === p.id)
        .map((a) => {
          if (a.assignmentType === 'other') {
            return {
              churchId: null as number | null,
              organizationId: null as number | null,
              churchName: a.workName ?? a.rawAssignmentText ?? 'Công việc khác',
              form: 'Khác' as const,
              regionCode: '—' as const,
              role: a.role,
              memberCount: 0,
              source: 'db' as const,
              isInHcm: false,
              isOtherWork: true,
            };
          }
          if (a.organizationId) {
            const org = orgMap.get(a.organizationId);
            return {
              churchId: null as number | null,
              organizationId: a.organizationId,
              churchName: org?.name ?? 'Unknown',
              form: 'Cơ quan' as const,
              regionCode: '—' as const,
              role: a.role,
              memberCount: 0,
              source: 'db' as const,
              isInHcm: false,
              isOtherWork: false,
            };
          }
          const ch = churchMap.get(a.churchId as number);
          const reg = ch ? regionMap.get(ch.regionId) : undefined;
          return {
            churchId: a.churchId as number | null,
            organizationId: null as number | null,
            churchName: ch?.name ?? 'Unknown',
            form: ch?.form ?? 'Chi hội',
            regionCode: reg?.code ?? 'I',
            role: a.role,
            memberCount: ch?.memberCount ?? 0,
            source: 'db' as const,
            isInHcm: ch?.isInHcm ?? false,
            isOtherWork: false,
          };
        });

      return {
        name: parsed.name,
        title: p.title,
        phone: normalizePhone(p.phone),
        email: p.email,
        chucVu: p.chucVu,
        namSinh: p.namSinh ?? parsed.namSinh,
        tenNhiemSo: p.tenNhiemSo,
        diaChi: p.diaChi,
        nhuDanh: nhuDanhMap.get(p.id) ?? null,
        assignments: [...dbAssigns],
      };
    });

    // Deduplicate pastors by normalized name (merge assignments, keep best data)
    const dedupedMap = new Map<
      string,
      {
        name: string;
        title: string | null;
        phone: string | null;
        email: string | null;
        chucVu: string | null;
        namSinh: number | null;
        tenNhiemSo: string | null;
        diaChi: string | null;
        nhuDanh: string | null;
        assignments: {
          churchId: number | null;
          organizationId: number | null;
          churchName: string;
          form: string;
          regionCode: string;
          role: string;
          memberCount: number;
          source: 'db' | 'chuc-danh';
          isInHcm: boolean;
          isOtherWork?: boolean;
        }[];
      }
    >();

    for (const person of list) {
      const key = normalizePastorName(person.name);
      const existing = dedupedMap.get(key);
      if (existing) {
        existing.assignments.push(...person.assignments);
        if (!existing.phone && person.phone) existing.phone = person.phone;
        if (!existing.email && person.email) existing.email = person.email;
        if (!existing.chucVu && person.chucVu) existing.chucVu = person.chucVu;
        if (!existing.namSinh && person.namSinh) existing.namSinh = person.namSinh;
        if (!existing.title && person.title) existing.title = person.title;
      } else {
        dedupedMap.set(key, { ...person, assignments: [...person.assignments] });
      }
    }

    // Deduplicate assignments within each pastor by normalized church name
    const normalizeChurchKey = (name: string) =>
      name
        .trim()
        .replace(/^(chi hội|hội nhánh|điểm nhóm)\s+/i, '')
        .replace(/\s*\([^)]*\)\s*$/, '')
        .toLowerCase()
        .replace(/\s+/g, ' ');

    for (const pastor of dedupedMap.values()) {
      const dedupedAssignments = new Map<string, (typeof pastor.assignments)[number]>();
      for (const a of pastor.assignments) {
        const key = normalizeChurchKey(a.churchName);
        const existing = dedupedAssignments.get(key);
        if (!existing) {
          dedupedAssignments.set(key, a);
        } else if (a.source === 'db' && existing.source !== 'db') {
          dedupedAssignments.set(key, a);
        } else if (
          a.source === 'db' &&
          existing.source === 'db' &&
          a.churchId !== null &&
          existing.churchId === null
        ) {
          dedupedAssignments.set(key, a);
        }
      }
      pastor.assignments = Array.from(dedupedAssignments.values());
    }

    let dedupedList = Array.from(dedupedMap.values());

    if (q) {
      dedupedList = dedupedList.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.phone && p.phone.includes(q)) ||
          p.assignments.some((a) => a.churchName.toLowerCase().includes(q))
      );
    }

    dedupedList.sort((a, b) => {
      const aHasHcm = a.assignments.some((x) => x.isInHcm);
      const bHasHcm = b.assignments.some((x) => x.isInHcm);
      if (aHasHcm !== bHasHcm) return bHasHcm ? 1 : -1;
      const aLast = a.name.trim().split(/\s+/).pop() ?? "";
      const bLast = b.name.trim().split(/\s+/).pop() ?? "";
      return aLast.localeCompare(bLast, "vi", { sensitivity: "base" });
    });
    return c.json({ pastor: dedupedList, total: dedupedList.length });
})

.get('/:name', async (c) => {
  const name = decodeURIComponent(c.req.param('name'));

  if (!db) {
    const churches = memoryStore.churches.filter(
      (ch) => ch.pastorName && ch.pastorName.toLowerCase() === name.toLowerCase()
    );
    if (churches.length === 0) return c.json({ error: 'Pastor not found' }, 404);
    const first = churches[0];
    const assignments = churches.map((ch) => ({
      churchId: ch.id,
      churchName: ch.name,
      form: ch.form,
      regionCode: ch.regionCode,
      regionName: ch.regionName,
      role: ch.pastorRole ?? 'Quản nhiệm',
      memberCount: ch.memberCount,
    }));
    return c.json({
      pastor: {
        name: first.pastorName,
        title: first.pastorTitle ?? 'Mục sư',
        phone: first.pastorPhone ?? null,
        email: first.pastorEmail ?? null,
        chucVu: null,
        namSinh: null,
        tenNhiemSo: null,
        diaChi: null,
        nhuDanh: null,
        status: 'active',
        assignments,
      },
    });
  }

  const [pastor] = await db
    .select()
    .from(pastors)
    .where(eq(pastors.fullName, name))
    .limit(1);
  if (!pastor) return c.json({ error: 'Pastor not found' }, 404);

  const allAssignments = await db
    .select()
    .from(pastoralAssignments)
    .where(eq(pastoralAssignments.pastorId, pastor.id));

  const churchIds = allAssignments
    .map((a) => a.churchId)
    .filter((id): id is number => id !== null);
  const organizationIds = allAssignments
    .map((a) => a.organizationId)
    .filter((id): id is number => id !== null);
  const allChurches =
    churchIds.length > 0
      ? await db.select().from(churches).where(inArray(churches.id, churchIds))
      : [];
  const allOrganizations =
    organizationIds.length > 0
      ? await db.select().from(organizations).where(inArray(organizations.id, organizationIds))
      : [];
  const allRegions = await db.select().from(regions);

  const churchMap = new Map(allChurches.map((ch) => [ch.id, ch]));
  const orgMap = new Map(allOrganizations.map((o) => [o.id, o]));
  const regionMap = new Map(allRegions.map((r) => [r.id, r]));

  const assignments = allAssignments.map((a) => {
    if (a.assignmentType === 'other') {
      return {
        churchId: null as number | null,
        organizationId: null as number | null,
        churchName: a.workName ?? a.rawAssignmentText ?? 'Công việc khác',
        form: 'Khác' as const,
        regionCode: '—' as const,
        role: a.role,
        memberCount: 0,
        source: 'db' as const,
        isInHcm: false,
        isOtherWork: true,
      };
    }
    if (a.organizationId) {
      const org = orgMap.get(a.organizationId);
      return {
        churchId: null as number | null,
        organizationId: a.organizationId,
        churchName: org?.name ?? 'Unknown',
        form: 'Cơ quan' as const,
        regionCode: '—' as const,
        role: a.role,
        memberCount: 0,
        source: 'db' as const,
        isInHcm: false,
      };
    }
    const ch = churchMap.get(a.churchId as number);
    const reg = ch ? regionMap.get(ch.regionId) : undefined;
    return {
      churchId: a.churchId,
      organizationId: null as number | null,
      churchName: ch?.name ?? 'Unknown',
      form: ch?.form ?? 'Chi hội',
      regionCode: reg?.code ?? 'I',
      regionName: reg?.name ?? 'Khu vực I',
      role: a.role,
      memberCount: ch?.memberCount ?? 0,
      isPrimary: a.isPrimary,
    };
  });

  return c.json({
    pastor: {
      id: pastor.id,
      name: pastor.fullName,
      title: pastor.title,
      phone: pastor.phone,
      status: pastor.status,
      assignments,
    },
  });
})

.get('/organizations/:id', async (c) => {
  const id = Number(c.req.param('id'));

  if (!db) return c.json({ error: 'Database not available' }, 500);

  const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
  if (!org) return c.json({ error: 'Organization not found' }, 404);

  const allAssignments = await db
    .select()
    .from(pastoralAssignments)
    .where(eq(pastoralAssignments.organizationId, id));

  const pastorIds = allAssignments.map((a) => a.pastorId);
  const allPastors =
    pastorIds.length > 0
      ? await db.select().from(pastors).where(inArray(pastors.id, pastorIds))
      : [];

  const pastorMap = new Map(allPastors.map((p) => [p.id, p]));

  const relatedPastors = allAssignments.map((a) => {
    const p = pastorMap.get(a.pastorId);
    return {
      id: p?.id ?? null,
      name: p?.fullName ?? 'Unknown',
      title: p?.title ?? null,
      phone: p?.phone ?? null,
      role: a.role,
    };
  });

  return c.json({
    organization: {
      id: org.id,
      name: org.name,
    },
    pastors: relatedPastors,
  });
});
