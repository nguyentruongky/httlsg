import { db } from "../src/db";
import { pastors, pastoralAssignments } from "../src/db/schema";
import { eq } from "drizzle-orm";

function normalizeName(fullName: string): string {
  let name = fullName.trim();
  name = name.replace(/\([^)]*\)/g, "").trim();
  name = name.replace(/^(Ms|Tđ|MsNc|Msts|NTĐ|NTđTs|QpMs|Thầy)\s+/i, "").trim();
  return name;
}

async function main() {
  console.log("Fetching all pastors...");
  const allPastors = await db.select().from(pastors);
  console.log(`Total pastors: ${allPastors.length}`);

  // Group by phone
  const byPhone = new Map<string, typeof allPastors[]>();
  for (const p of allPastors) {
    if (!p.phone) continue;
    const key = p.phone.replace(/\s/g, "");
    if (!byPhone.has(key)) byPhone.set(key, []);
    byPhone.get(key)!.push(p);
  }

  const dupGroups = Array.from(byPhone.values()).filter((g) => g.length > 1);
  console.log(`Found ${dupGroups.length} phone-based duplicate groups`);

  let mergedCount = 0;
  let deletedCount = 0;

  for (const group of dupGroups) {
    // Sort: prefer name without prefix, then lowest id
    group.sort((a, b) => {
      const aHasPrefix = /^(Ms|Tđ|MsNc|Msts|NTĐ|NTđTs|QpMs|Thầy)\s+/i.test(a.fullName);
      const bHasPrefix = /^(Ms|Tđ|MsNc|Msts|NTĐ|NTđTs|QpMs|Thầy)\s+/i.test(b.fullName);
      if (aHasPrefix && !bHasPrefix) return 1;
      if (!aHasPrefix && bHasPrefix) return -1;
      return a.id - b.id;
    });

    const canonical = group[0];
    const duplicates = group.slice(1);

    const canonicalNorm = normalizeName(canonical.fullName);
    if (canonical.fullName !== canonicalNorm) {
      await db.update(pastors).set({ fullName: canonicalNorm }).where(eq(pastors.id, canonical.id));
    }

    console.log(
      `Merging phone ${group[0].phone}: "${canonical.fullName}" (id=${canonical.id}) keeps ${duplicates.length} duplicate(s)`
    );

    for (const dup of duplicates) {
      const assignments = await db
        .select()
        .from(pastoralAssignments)
        .where(eq(pastoralAssignments.pastorId, dup.id));

      for (const a of assignments) {
        await db
          .update(pastoralAssignments)
          .set({ pastorId: canonical.id })
          .where(eq(pastoralAssignments.id, a.id));
      }

      // Clean up duplicate assignments (same churchId) for canonical
      const existing = await db
        .select()
        .from(pastoralAssignments)
        .where(eq(pastoralAssignments.pastorId, canonical.id));

      const seen = new Set<number>();
      const toDelete: number[] = [];
      for (const e of existing) {
        if (seen.has(e.churchId)) {
          toDelete.push(e.id);
        } else {
          seen.add(e.churchId);
        }
      }

      for (const delId of toDelete) {
        await db.delete(pastoralAssignments).where(eq(pastoralAssignments.id, delId));
      }

      await db.delete(pastors).where(eq(pastors.id, dup.id));
      deletedCount++;
      mergedCount++;
    }
  }

  console.log(`Merged ${mergedCount} duplicate pastors, deleted ${deletedCount} records`);
  const finalCount = await db.select().from(pastors);
  console.log(`Final pastor count: ${finalCount.length}`);

  // Verify no phone duplicates remain
  const all2 = await db.select().from(pastors);
  const byPhone2 = new Map<string, number[]>();
  for (const p of all2) {
    if (!p.phone) continue;
    const key = p.phone.replace(/\s/g, "");
    if (!byPhone2.has(key)) byPhone2.set(key, []);
    byPhone2.get(key)!.push(p.id);
  }
  const stillDup = Array.from(byPhone2.values()).filter((g) => g.length > 1);
  console.log(`Remaining phone-based duplicate groups: ${stillDup.length}`);
  for (const g of stillDup) {
    const names = all2.filter((p) => g.includes(p.id)).map((p) => p.fullName);
    console.log(`  Phone group ${g}: ${names.join(" | ")}`);
  }
}

main().catch((err) => {
  console.error("Standardization failed:", err);
  process.exit(1);
});
