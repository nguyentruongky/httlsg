import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { asc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { departments } from '../../db/schema';
import { memoryStore } from '../memory-store';

const createDepartmentSchema = z.object({
  code: z.string().min(2).max(16).toUpperCase(),
  name: z.string().min(2).max(100),
  levelScope: z.string().min(2).max(80),
  headName: z.string().min(2).max(100),
  headTitle: z.string().min(2).max(80),
  activeUnitsCount: z.coerce.number().int().min(0).max(500).default(25),
  totalMembersCount: z.coerce.number().int().min(0).max(50000).default(500),
  description: z.string().min(4).max(300),
});

const updateDepartmentSchema = z.object({
  activeUnitsCount: z.coerce.number().int().min(0).max(500).optional(),
  totalMembersCount: z.coerce.number().int().min(0).max(50000).optional(),
  headName: z.string().min(2).max(100).optional(),
});

const idParam = z.object({ id: z.coerce.number().int().positive() });

export const departmentsRoute = new Hono()
  .get('/', async (c) => {
    if (!db) {
      return c.json({ departments: memoryStore.departments });
    }
    const rows = await db.select().from(departments).orderBy(asc(departments.id));
    return c.json({ departments: rows });
  })
  .post('/', zValidator('json', createDepartmentSchema), async (c) => {
    const body = c.req.valid('json');
    if (!db) {
      const created = {
        id: memoryStore.nextDepartmentId++,
        ...body,
      };
      memoryStore.departments = [...memoryStore.departments, created];
      return c.json({ department: created }, 201);
    }

    const [created] = await db.insert(departments).values(body).returning();
    return c.json({ department: created }, 201);
  })
  .patch(
    '/:id',
    zValidator('param', idParam),
    zValidator('json', updateDepartmentSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');

      if (!db) {
        const idx = memoryStore.departments.findIndex((d) => d.id === id);
        if (idx === -1) return c.json({ error: 'Department not found' }, 404);
        memoryStore.departments[idx] = { ...memoryStore.departments[idx], ...body };
        return c.json({ department: memoryStore.departments[idx] });
      }

      const [updated] = await db
        .update(departments)
        .set(body)
        .where(eq(departments.id, id))
        .returning();

      if (!updated) return c.json({ error: 'Department not found' }, 404);
      return c.json({ department: updated });
    }
  );
