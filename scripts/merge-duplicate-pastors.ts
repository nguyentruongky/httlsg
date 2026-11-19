import { db } from '../src/db';
import { pastors, pastoralAssignments, assemblyDelegates } from '../src/db/schema';
import { eq, or, sql } from 'drizzle-orm';

async function main() {
  if (!db) {
    console.error('No database connection.');
    process.exit(1);
  }

  // Find all duplicate full_names using drizzle
  const dupRows = await db
    .select({
      fullName: pastors.fullName,
      keepId: sql<number>`MIN(${pastors.id})`.as('keep_id'),
      dropId: sql<number>`MAX(${pastors.id})`.as('drop_id'),
    })
    .from(pastors)
    .groupBy(pastors.fullName)
    .having(sql`COUNT(*) > 1`)
    .orderBy(pastors.fullName);

  console.log(`Found ${dupRows.length} duplicate pastor groups`);

  let mergedPastors = 0;
  let updatedAssignments = 0;
  let updatedDelegates = 0;
  let deletedPastors = 0;

  for (const dup of dupRows) {
    const keep_id = Number(dup.keepId);
    const drop_id = Number(dup.dropId);
    const full_name = dup.fullName;
    console.log(`Merging ${full_name}: keep id ${keep_id}, drop id ${drop_id}`);

    // Fetch both rows separately
    const rows = await db
      .select()
      .from(pastors)
      .where(or(eq(pastors.id, keep_id), eq(pastors.id, drop_id)))
      .orderBy(pastors.id);

    const keep = rows[0];
    const drop = rows[1];

    if (!keep || !drop) {
      console.log(`  ERROR: Could not find both rows for ${full_name}`);
      continue;
    }

    // Merge nullable fields: fill keep's nulls from drop's values
    const updates: Record<string, unknown> = {};
    const fields = [
      'title', 'phone', 'email', 'status', 'chucVu', 'chucDanh', 'namSinh',
      'tenNhiemSo', 'diaChi', 'nhuDanh', 'createdAt'
    ];

    for (const field of fields) {
      const keepVal = keep[field];
      const dropVal = drop[field];
      const keepEmpty = keepVal === null || keepVal === undefined || keepVal === '';
      if (keepEmpty && dropVal !== null && dropVal !== undefined && dropVal !== '') {
        updates[field] = dropVal;
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.update(pastors).set(updates).where(eq(pastors.id, keep_id));
      console.log(`  Updated keep row with: ${Object.keys(updates).join(', ')}`);
    }

    // Update pastoral_assignments: move drop_id -> keep_id
    const assignResult = await db
      .update(pastoralAssignments)
      .set({ pastorId: keep_id })
      .where(eq(pastoralAssignments.pastorId, drop_id));
    const assignCount = (assignResult as any).rowCount ?? 0;
    updatedAssignments += assignCount;
    if (assignCount > 0) console.log(`  Moved ${assignCount} assignments`);

    // Update assembly_delegates: move drop_id -> keep_id
    const delegateResult = await db
      .update(assemblyDelegates)
      .set({ pastorId: keep_id })
      .where(eq(assemblyDelegates.pastorId, drop_id));
    const delegateCount = (delegateResult as any).rowCount ?? 0;
    updatedDelegates += delegateCount;
    if (delegateCount > 0) console.log(`  Moved ${delegateCount} delegates`);

    // Delete the drop row
    await db.delete(pastors).where(eq(pastors.id, drop_id));
    deletedPastors++;
    mergedPastors++;
  }

  console.log(`\nMerge complete:`);
  console.log(`  Pastors merged: ${mergedPastors}`);
  console.log(`  Assignments updated: ${updatedAssignments}`);
  console.log(`  Delegates updated: ${updatedDelegates}`);
  console.log(`  Pastors deleted: ${deletedPastors}`);
}

main().catch((err) => {
  console.error('Merge failed:', err);
  process.exit(1);
});
