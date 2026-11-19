import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { asc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { churches, regions, pastoralAssignments, pastors } from '../../db/schema';
import { memoryStore } from '../memory-store';

const createChurchSchema = z.object({
  name: z.string().min(2).max(120),
  form: z.enum(['Chi hội', 'Điểm nhóm', 'Hội nhánh']),
  legalType: z.enum(['Chính thức', 'Nội bộ']).default('Chính thức'),
  autonomy: z.enum(['Tự lập', 'Tự dưỡng']).nullable().optional(),
  regionCode: z.enum(['I', 'II', 'III', 'IV', 'V', 'VI']),
  parentChurchName: z.string().max(120).nullable().optional(),
  newAddress: z.string().min(3).max(220),
  newWard: z.string().min(2).max(80),
  oldAddress: z.string().max(220).nullable().optional(),
  pastorName: z.string().max(100).nullable().optional(),
  pastorRole: z.enum(['Quản nhiệm', 'Kiêm nhiệm', 'Đặc trách']).default('Quản nhiệm'),
  pastorPhone: z.string().max(20).nullable().optional(),
  memberCount: z.coerce.number().int().min(0).max(50000).default(50),
  regularAttendanceCount: z.coerce.number().int().min(0).max(50000).default(0),
  foundedYear: z.coerce.number().int().min(1900).max(2030).nullable().optional(),
});

const updateChurchSchema = z.object({
  memberCount: z.coerce.number().int().min(0).max(50000).optional(),
  regularAttendanceCount: z.coerce.number().int().min(0).max(50000).optional(),
  legalType: z.enum(['Chính thức', 'Nội bộ']).optional(),
  autonomy: z.enum(['Tự lập', 'Tự dưỡng']).nullable().optional(),
  newAddress: z.string().min(3).max(220).optional(),
});

const idParam = z.object({ id: z.coerce.number().int().positive() });

export const churchesRoute = new Hono()
  .get('/', async (c) => {
    const region = c.req.query('region') || 'ALL';
    const form = c.req.query('form') || 'ALL';
    const legalType = c.req.query('legalType') || 'ALL';
    const q = (c.req.query('q') || '').trim().toLowerCase();

    if (!db) {
      let list = memoryStore.churches;

      if (region !== 'ALL') {
        list = list.filter((item) => item.regionCode === region);
      }
      if (form !== 'ALL') {
        list = list.filter((item) => item.form === form);
      }
      if (legalType !== 'ALL') {
        list = list.filter((item) => item.legalType === legalType);
      }
      if (q) {
        list = list.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            (item.pastorName && item.pastorName.toLowerCase().includes(q)) ||
            (item.newWard && item.newWard.toLowerCase().includes(q)) ||
            (item.newAddress && item.newAddress.toLowerCase().includes(q)) ||
            (item.oldAddress && item.oldAddress.toLowerCase().includes(q)) ||
            (item.parentChurchName && item.parentChurchName.toLowerCase().includes(q))
        );
      }

      // Attach affiliated sub-congregations count for Chi hội
      const childCountMap = new Map<number, number>();
      for (const item of memoryStore.churches) {
        if (item.parentChurchId) {
          childCountMap.set(
            item.parentChurchId,
            (childCountMap.get(item.parentChurchId) ?? 0) + 1
          );
        }
      }

      const enriched = list.map((item) => ({
        ...item,
        affiliatedCount: childCountMap.get(item.id) ?? 0,
      }));

      return c.json({ churches: enriched, total: enriched.length });
    }

    const [allChurches, allRegions, allAssignments, allPastors] = await Promise.all([
      db.select().from(churches).orderBy(asc(churches.stt)),
      db.select().from(regions),
      db.select().from(pastoralAssignments),
      db.select().from(pastors),
    ]);

    const regionMap = new Map(allRegions.map((r) => [r.id, r]));
    const pastorMap = new Map(allPastors.map((p) => [p.id, p]));
    const assignmentByChurch = new Map(allAssignments.map((a) => [a.churchId, a]));

    const childCountMap = new Map<number, number>();
    for (const item of allChurches) {
      if (item.parentChurchId) {
        childCountMap.set(
          item.parentChurchId,
          (childCountMap.get(item.parentChurchId) ?? 0) + 1
        );
      }
    }

    let list = allChurches.map((item) => {
      const reg = regionMap.get(item.regionId);
      const assign = assignmentByChurch.get(item.id);
      const pastor = assign ? pastorMap.get(assign.pastorId) : undefined;

      return {
        id: item.id,
        stt: item.stt,
        code: item.code,
        form: item.form,
        legalType: item.legalType,
        autonomy: item.autonomy,
        name: item.name,
        shortName: item.shortName,
        parentChurchId: item.parentChurchId,
        parentChurchName: item.parentChurchName,
        regionCode: reg?.code ?? 'I',
        regionName: reg?.name ?? 'Khu vực I',
        foundedYear: item.foundedYear,
        oldWard: item.oldWard,
        oldAddress: item.oldAddress,
        newAddress: item.newAddress,
        newWard: item.newWard,
        isInHcm: item.isInHcm,
        memberCount: item.memberCount,
        regularAttendanceCount: item.regularAttendanceCount,
        note: item.note,
        pastorName: pastor?.fullName ?? null,
        pastorTitle: pastor?.title ?? null,
        pastorRole: assign?.role ?? null,
        pastorPhone: pastor?.phone
          ? pastor.phone.replace(/\s+/g, '').trim()
          : null,
        affiliatedCount: childCountMap.get(item.id) ?? 0,
      };
    });

    if (region !== 'ALL') list = list.filter((x) => x.regionCode === region);
    if (form !== 'ALL') list = list.filter((x) => x.form === form);
    if (legalType !== 'ALL') list = list.filter((x) => x.legalType === legalType);
    if (q) {
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.pastorName && item.pastorName.toLowerCase().includes(q)) ||
          (item.newWard && item.newWard.toLowerCase().includes(q)) ||
          (item.newAddress && item.newAddress.toLowerCase().includes(q)) ||
          (item.oldAddress && item.oldAddress.toLowerCase().includes(q))
      );
    }

    return c.json({ churches: list, total: list.length });
  })
  .post('/', zValidator('json', createChurchSchema), async (c) => {
    const body = c.req.valid('json');
    const prefix =
      body.form === 'Chi hội' ? 'CH' : body.form === 'Hội nhánh' ? 'HN' : 'DN';

    if (!db) {
      const nextStt = memoryStore.nextChurchId++;
      const created = {
        id: nextStt,
        stt: nextStt,
        code: `${prefix}-${String(nextStt).padStart(3, '0')}`,
        form: body.form,
        legalType: body.legalType,
        autonomy: body.form === 'Chi hội' ? (body.autonomy ?? 'Tự dưỡng') : null,
        name: body.name.toUpperCase(),
        shortName: body.name.toUpperCase(),
        parentChurchId: null,
        parentChurchName: body.parentChurchName || null,
        regionCode: body.regionCode,
        regionName: `Khu vực ${body.regionCode}`,
        foundedYear: body.foundedYear ?? 2026,
        oldWard: null,
        oldAddress: body.oldAddress || null,
        newAddress: body.newAddress,
        newWard: body.newWard,
        isInHcm: true,
        memberCount: body.memberCount,
        regularAttendanceCount: body.regularAttendanceCount ?? 0,
        note: null,
        pastorName: body.pastorName || null,
        pastorTitle: 'Mục sư',
        pastorRole: body.pastorRole,
        pastorPhone: body.pastorPhone || null,
        pastorEmail: null,
      };
      memoryStore.churches = [created, ...memoryStore.churches];
      return c.json({ church: created }, 201);
    }

    const [reg] = await db
      .select()
      .from(regions)
      .where(eq(regions.code, body.regionCode));

    const allExisting = await db.select({ stt: churches.stt }).from(churches);
    const maxStt = allExisting.reduce((m, r) => Math.max(m, r.stt), 0) + 1;

    const [created] = await db
      .insert(churches)
      .values({
        stt: maxStt,
        code: `${prefix}-${String(maxStt).padStart(3, '0')}`,
        form: body.form,
        legalType: body.legalType,
        autonomy: body.form === 'Chi hội' ? (body.autonomy ?? 'Tự dưỡng') : null,
        name: body.name.toUpperCase(),
        shortName: body.name.toUpperCase(),
        parentChurchName: body.parentChurchName || null,
        regionId: reg?.id ?? 1,
        foundedYear: body.foundedYear ?? 2026,
        oldAddress: body.oldAddress || null,
        newAddress: body.newAddress,
        newWard: body.newWard,
        memberCount: body.memberCount,
        regularAttendanceCount: body.regularAttendanceCount ?? 0,
      })
      .returning();

    if (body.pastorName) {
      const [pastor] = await db
        .insert(pastors)
        .values({
          fullName: body.pastorName,
          title: 'Mục sư',
          phone: body.pastorPhone || null,
        })
        .returning();

      await db.insert(pastoralAssignments).values({
        churchId: created.id,
        pastorId: pastor.id,
        role: body.pastorRole,
        isPrimary: true,
      });
    }

    return c.json({ church: created }, 201);
  })
  .patch(
    '/:id',
    zValidator('param', idParam),
    zValidator('json', updateChurchSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');

      if (!db) {
        const idx = memoryStore.churches.findIndex((x) => x.id === id);
        if (idx === -1) return c.json({ error: 'Congregation not found' }, 404);
        memoryStore.churches[idx] = { ...memoryStore.churches[idx], ...body };
        return c.json({ church: memoryStore.churches[idx] });
      }

      const [updated] = await db
        .update(churches)
        .set(body)
        .where(eq(churches.id, id))
        .returning();

      if (!updated) return c.json({ error: 'Congregation not found' }, 404);
      return c.json({ church: updated });
    }
  );
