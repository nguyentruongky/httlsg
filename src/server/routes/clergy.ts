import { Hono } from 'hono';
import { db } from '../../db';
import { pastors, pastoralAssignments, churches, regions } from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { memoryStore } from '../memory-store';

function parsePastorName(raw: string): {
  name: string;
  namSinh: number | null;
} {
  const match = raw.match(/[\[\(](\d{4})[\]\)]\s*$/);
  const namSinh = match ? Number(match[1]) : null;
  const name = match ? raw.replace(/[\[\(]\d{4}[\]\)]\s*$/, '').trim() : raw;
  return { name, namSinh };
}

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  return phone.replace(/\s+/g, '').trim() || null;
}

export const clergyRoute = new Hono().get('/', async (c) => {
  const q = (c.req.query('q') || '').trim().toLowerCase();

  if (!db) {
    const map = new Map<
      string,
      {
        name: string;
        title: string;
        phone: string | null;
        chucVu: string | null;
        chucDanh: string | null;
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

    for (const ch of memoryStore.churches) {
      if (!ch.pastorName) continue;
      const existing = map.get(ch.pastorName);
      const assignment = {
        churchId: ch.id,
        churchName: ch.name,
        form: ch.form,
        regionCode: ch.regionCode,
        role: ch.pastorRole ?? 'Quản nhiệm',
        memberCount: ch.memberCount,
      };
      if (existing) {
        existing.assignments.push(assignment);
        if (!existing.phone && ch.pastorPhone) existing.phone = normalizePhone(ch.pastorPhone);
        else if (existing.phone) existing.phone = normalizePhone(existing.phone);
      } else {
        map.set(ch.pastorName, {
          ...parsePastorName(ch.pastorName),
          title: ch.pastorTitle ?? 'Mục sư',
          phone: normalizePhone(ch.pastorPhone),
          chucVu: null,
          chucDanh: null,
          assignments: [assignment],
        });
      }
    }

    let list = Array.from(map.values()).sort(
      (a, b) => b.assignments.length - a.assignments.length || a.name.localeCompare(b.name)
    );

    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.phone && p.phone.includes(q)) ||
          p.assignments.some((a) => a.churchName.toLowerCase().includes(q))
      );
    }

    return c.json({ clergy: list, total: list.length });
  }

  const [allPastors, allAssignments, allChurches, allRegions] = await Promise.all([
    db.select().from(pastors),
    db.select().from(pastoralAssignments),
    db.select().from(churches),
    db.select().from(regions),
  ]);

  const churchMap = new Map(allChurches.map((ch) => [ch.id, ch]));
  const regionMap = new Map(allRegions.map((r) => [r.id, r]));

  let list = allPastors.map((p) => {
    const assigns = allAssignments
      .filter((a) => a.pastorId === p.id)
      .map((a) => {
        const ch = churchMap.get(a.churchId);
        const reg = ch ? regionMap.get(ch.regionId) : undefined;
        return {
          churchId: a.churchId,
          churchName: ch?.name ?? 'Unknown',
          form: ch?.form ?? 'Chi hội',
          regionCode: reg?.code ?? 'I',
          role: a.role,
          memberCount: ch?.memberCount ?? 0,
        };
      });

    const parsed = parsePastorName(p.fullName);

    return {
      name: parsed.name,
      title: p.title,
      phone: normalizePhone(p.phone),
      email: p.email,
      chucVu: p.chucVu,
      chucDanh: p.chucDanh,
      namSinh: p.namSinh ?? parsed.namSinh,
      tenNhiemSo: p.tenNhiemSo,
      diaChi: p.diaChi,
      nhuDanh: p.nhuDanh,
      assignments: assigns,
    };
  });

  if (q) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        p.assignments.some((a) => a.churchName.toLowerCase().includes(q))
    );
  }

  list.sort((a, b) => b.assignments.length - a.assignments.length || a.name.localeCompare(b.name));
  return c.json({ clergy: list, total: list.length });
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

  const churchIds = allAssignments.map((a) => a.churchId);
  const allChurches =
    churchIds.length > 0
      ? await db.select().from(churches).where(inArray(churches.id, churchIds))
      : [];
  const allRegions = await db.select().from(regions);

  const churchMap = new Map(allChurches.map((ch) => [ch.id, ch]));
  const regionMap = new Map(allRegions.map((r) => [r.id, r]));

  const assignments = allAssignments.map((a) => {
    const ch = churchMap.get(a.churchId);
    const reg = ch ? regionMap.get(ch.regionId) : undefined;
    return {
      churchId: a.churchId,
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
});
