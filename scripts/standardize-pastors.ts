import { db } from "../src/db";
import { pastors, pastoralAssignments, churches } from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";

function normalizeName(fullName: string): string {
  let name = fullName.trim();

  // Remove parenthetical annotations like (Tạm Lo), (Kiêm), (ĐT), etc.
  name = name.replace(/\([^)]*\)/g, "").trim();

  // Remove title prefixes: Ms, Tđ, MsNc, Msts, NTĐ, NTđTs, QpMs, Thầy, etc.
  name = name.replace(/^(Ms|Tđ|MsNc|Msts|NTĐ|NTđTs|QpMs|Thầy)\s+/i, "").trim();

  return name;
}

function cleanPhone(phone: string | null): string | null {
  if (!phone) return null;
  return phone.replace(/\s/g, "").trim() || null;
}

async function main() {
  console.log("Fetching all pastors...");
  const allPastors = await db.select().from(pastors);
  console.log(`Total pastors: ${allPastors.length}`);

  // Group pastors by normalized name + phone
  const groups = new Map<string, typeof allPastors[]>();
  for (const p of allPastors) {
    const baseName = normalizeName(p.fullName);
    const phone = cleanPhone(p.phone);
    const key = `${baseName}|||${phone ?? ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const duplicateGroups = Array.from(groups.values()).filter((g) => g.length > 1);
  console.log(`Found ${duplicateGroups.length} groups with duplicates`);

  let mergedCount = 0;
  let deletedCount = 0;

  for (const group of duplicateGroups) {
    // Sort: prefer one without title prefix in original name, then by id (keep lowest id as canonical)
    group.sort((a, b) => {
      const aHasPrefix = /^(Ms|Tđ|MsNc|Msts|NTĐ|NTđTs|QpMs|Thầy)\s+/i.test(a.fullName);
      const bHasPrefix = /^(Ms|Tđ|MsNc|Msts|NTĐ|NTđTs|QpMs|Thầy)\s+/i.test(b.fullName);
      if (aHasPrefix && !bHasPrefix) return 1;
      if (!aHasPrefix && bHasPrefix) return -1;
      return a.id - b.id;
    });

    const canonical = group[0];
    const duplicates = group.slice(1);

    // Normalize canonical pastor's name (strip title prefixes)
    const normalizedName = normalizeName(canonical.fullName);
    if (canonical.fullName !== normalizedName) {
      await db
        .update(pastors)
        .set({ fullName: normalizedName })
        .where(eq(pastors.id, canonical.id));
    }

    console.log(
      `Merging: "${canonical.fullName}" → "${normalizedName}" (id=${canonical.id}) keeps ${duplicates.length} duplicate(s)`
    );

    const dupIds = duplicates.map((d) => d.id);

    // Update pastoral_assignments: point duplicate pastor_ids to canonical
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

      // Check for duplicate assignments (same churchId + pastorId) after merge
      const existing = await db
        .select()
        .from(pastoralAssignments)
        .where(eq(pastoralAssignments.pastorId, canonical.id));

      const churchIds = existing.map((e) => e.churchId);
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

      // Delete the duplicate pastor
      await db.delete(pastors).where(eq(pastors.id, dup.id));
      deletedCount++;
      mergedCount++;
    }
  }

  console.log(`Merged ${mergedCount} duplicate pastors, deleted ${deletedCount} records`);

  // Show final state
  const finalCount = await db.select().from(pastors);
  console.log(`Final pastor count: ${finalCount.length}`);
}

main().catch((err) => {
  console.error("Standardization failed:", err);
  process.exit(1);
});
