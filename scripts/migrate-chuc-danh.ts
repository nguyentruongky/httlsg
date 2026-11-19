import { db } from '../src/db';
import { pastors, pastoralAssignments, churches } from '../src/db/schema';
import { eq } from 'drizzle-orm';

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

function normalizeChurchName(name: string): string {
  return name
    .trim()
    .replace(/^(chi hội|hội nhánh|điểm nhóm)\s+/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
}

function normalizeForMatch(name: string): string {
  return normalizeChurchName(name)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
}

function stripDateSuffix(text: string): string {
  return text.replace(/\s*\(NK:\s*\d{4}-\d{4}\)\s*$/i, '');
}

function parseChucDanh(chucDanh: string | null): {
  assignments: { churchName: string; role: string }[];
  remaining: string | null;
} {
  if (!chucDanh) return { assignments: [], remaining: null };

  const parts = chucDanh.split(' | ');
  const extracted: { churchName: string; role: string }[] = [];
  const remaining: string[] = [];

  for (const part of parts) {
    const trimmed = stripDateSuffix(part).trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(.+?):\s*(.+)$/);
    if (match) {
      const role = match[1].trim();
      const church = match[2].trim();
      if (
        CHUC_DANH_ROLE_KEYWORDS.some((k) => role.toLowerCase().includes(k))
      ) {
        extracted.push({ churchName: church, role });
      } else {
        remaining.push(trimmed);
      }
    } else {
      remaining.push(trimmed);
    }
  }

  return {
    assignments: extracted,
    remaining: remaining.length > 0 ? remaining.join(' | ') : null,
  };
}

async function main() {
  if (!db) {
    console.error('No database connection. Set DATABASE_URL/DIRECT_URL.');
    process.exit(1);
  }

  const allPastors = await db.select().from(pastors);
  const allChurches = await db.select().from(churches);
  const existingAssignments = await db.select().from(pastoralAssignments);

  const churchByNormName = new Map<string, (typeof allChurches)[number]>();
  for (const ch of allChurches) {
    const key = normalizeForMatch(ch.name);
    if (!churchByNormName.has(key)) churchByNormName.set(key, ch);
  }

  const existingAssignKeys = new Set<string>();
  for (const a of existingAssignments) {
    existingAssignKeys.add(`${a.pastorId}-${a.churchId}`);
  }

  let processed = 0;
  let pastorsUpdated = 0;
  let assignmentsCreated = 0;
  let assignmentsSkippedExisting = 0;
  const unmatchedChurches: string[] = [];
  const unmatchedChurchSet = new Set<string>();

  for (const p of allPastors) {
    if (!p.chucDanh) continue;

    processed += 1;
    const parsed = parseChucDanh(p.chucDanh);

    const updates: Record<string, unknown> = {};

    // Update chuc_vu with the first extracted role (only if not already set)
    if (parsed.assignments.length > 0 && !p.chucVu) {
      updates.chucVu = parsed.assignments[0].role;
    }

    // Build chuc_danh: keep remaining text PLUS any extracted roles whose
    // org could not be matched to a church (so no data is lost).
    const leftoverOrgTexts: string[] = [];
    for (const assign of parsed.assignments) {
      const churchKey = normalizeForMatch(assign.churchName);
      const church = churchByNormName.get(churchKey);

      if (!church) {
        if (!unmatchedChurchSet.has(assign.churchName)) {
          unmatchedChurchSet.add(assign.churchName);
          unmatchedChurches.push(assign.churchName);
        }
        leftoverOrgTexts.push(assign.churchName);
        continue;
      }

      const assignKey = `${p.id}-${church.id}`;
      if (existingAssignKeys.has(assignKey)) {
        assignmentsSkippedExisting += 1;
        continue;
      }

      await db.insert(pastoralAssignments).values({
        churchId: church.id,
        pastorId: p.id,
        role: assign.role,
        isPrimary: true,
        rawAssignmentText: `${assign.role}: ${assign.churchName}`,
      });
      existingAssignKeys.add(assignKey);
      assignmentsCreated += 1;
    }

    const allRemaining = [
      ...(parsed.remaining ? [parsed.remaining] : []),
      ...leftoverOrgTexts,
    ];
    const newChucDanh = allRemaining.length > 0 ? allRemaining.join(' | ') : null;

    if (newChucDanh !== p.chucDanh) {
      updates.chucDanh = newChucDanh;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(pastors).set(updates).where(eq(pastors.id, p.id));
      pastorsUpdated += 1;
    }
  }

  console.log(`Pastors with chuc_danh processed: ${processed}`);
  console.log(`Pastors updated (chuc_vu / chuc_danh): ${pastorsUpdated}`);
  console.log(`Pastoral assignments created: ${assignmentsCreated}`);
  console.log(`Assignments skipped (already exist): ${assignmentsSkippedExisting}`);
  if (unmatchedChurches.length > 0) {
    console.log(
      `Unmatched orgs (${unmatchedChurches.length}) - not found in DB:`,
    );
    unmatchedChurches.forEach((n) => console.log(`  - ${n}`));
  }
  console.log('Migration completed!');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
