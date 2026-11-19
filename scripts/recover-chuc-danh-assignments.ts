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
  'phó chủ tịch',
  'chủ tịch',
  'phó ban',
  'phụ giáo',
  'tổng thủ quỹ',
];

function stripDateSuffix(text: string): string {
  return text.replace(/\s*\(NK:\s*\d{4}-\d{4}\)\s*$/i, '');
}

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

function parseRoleOrg(text: string): { role: string; org: string } | null {
  const trimmed = stripDateSuffix(text).trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(.+?):\s*(.+)$/);
  if (match) {
    return { role: match[1].trim(), org: match[2].trim() };
  }
  return null;
}

function isRoleKeyword(role: string): boolean {
  const r = role.toLowerCase();
  return CHUC_DANH_ROLE_KEYWORDS.some((k) => r.includes(k));
}

async function main() {
  if (!db) {
    console.error('No database connection.');
    process.exit(1);
  }

  const allPastors = await db.select().from(pastors);
  const targetPastors = allPastors.filter(
    (p) => p.chucDanh && p.chucDanh.trim() !== ''
  );

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

  // Collect all distinct org names that need church entries
  const orgsToCreate: string[] = [];
  const orgSet = new Set<string>();

  const pastorOrgData: Array<{
    pastorId: number;
    fullName: string;
    chucVu: string | null;
    assignments: { role: string; org: string }[];
    hasNonRoleParts: boolean;
  }> = [];

  for (const p of targetPastors) {
    const chucDanh = p.chucDanh!;
    const parts = chucDanh.split(' | ');
    const assignments: { role: string; org: string }[] = [];
    let hasNonRoleParts = false;

    for (const part of parts) {
      const parsed = parseRoleOrg(part);
      if (parsed) {
        if (isRoleKeyword(parsed.role)) {
          assignments.push({ role: parsed.role, org: parsed.org });
          if (!orgSet.has(parsed.org)) {
            orgSet.add(parsed.org);
            orgsToCreate.push(parsed.org);
          }
        } else {
          hasNonRoleParts = true;
        }
      } else {
        // Just an org name, use chuc_vu as role
        if (p.chucVu) {
          assignments.push({ role: p.chucVu, org: part });
          if (!orgSet.has(part)) {
            orgSet.add(part);
            orgsToCreate.push(part);
          }
        } else {
          hasNonRoleParts = true;
        }
      }
    }

    pastorOrgData.push({
      pastorId: p.id,
      fullName: p.fullName,
      chucVu: p.chucVu,
      assignments,
      hasNonRoleParts,
    });
  }

  console.log(`Pastors with chuc_danh: ${targetPastors.length}`);
  console.log(`Distinct orgs to create: ${orgsToCreate.length}`);

  // Create church entries for all distinct orgs
  let nextStt = 173;
  let nextId = 173;
  let churchesCreated = 0;
  const orgToChurchId = new Map<string, number>();

  for (const orgName of orgsToCreate) {
    const key = normalizeForMatch(orgName);
    if (churchByNormName.has(key)) {
      orgToChurchId.set(orgName, churchByNormName.get(key)!.id);
      continue;
    }

    const code = `ORG-${String(nextStt).padStart(3, '0')}`;
    const result = await db
      .insert(churches)
      .values({
        stt: nextStt,
        code,
        form: 'Chi hội',
        legalType: 'Chính thức',
        autonomy: null,
        name: orgName,
        shortName: orgName.toUpperCase(),
        parentChurchName: null,
        parentChurchId: null,
        regionId: 1,
        wardId: null,
        foundedYear: null,
        oldDistrict: null,
        oldWard: null,
        oldAddress: null,
        newAddress: null,
        newWard: null,
        isInHcm: false,
        memberCount: 0,
        regularAttendanceCount: 0,
        note: 'Created from chuc_danh migration',
      })
      .returning({ id: churches.id });
    const newId = result[0]!.id;
    orgToChurchId.set(orgName, newId);
    churchByNormName.set(key, {
      id: newId,
      stt: nextStt,
      code,
      form: 'Chi hội',
      legalType: 'Chính thức',
      autonomy: null,
      name: orgName,
      shortName: orgName.toUpperCase(),
      parentChurchName: null,
      parentChurchId: null,
      regionId: 1,
      wardId: null,
      foundedYear: null,
      oldDistrict: null,
      oldWard: null,
      oldAddress: null,
      newAddress: null,
      newWard: null,
      isInHcm: false,
      memberCount: 0,
      regularAttendanceCount: 0,
      note: 'Created from chuc_danh migration',
    });
    nextStt++;
    nextId = Math.max(nextId, newId + 1);
    churchesCreated++;
  }

  // Create assignments
  let assignmentsCreated = 0;
  let assignmentsSkipped = 0;
  const pastorsToClear: number[] = [];

  for (const data of pastorOrgData) {
    if (data.assignments.length === 0) continue;

    let allCreated = true;
    for (const assign of data.assignments) {
      const cid = orgToChurchId.get(assign.org);
      if (!cid) {
        allCreated = false;
        break;
      }
      const key = `${data.pastorId}-${cid}`;
      if (existingAssignKeys.has(key)) {
        assignmentsSkipped++;
        continue;
      }

      await db.insert(pastoralAssignments).values({
        churchId: cid,
        pastorId: data.pastorId,
        role: assign.role,
        isPrimary: true,
        rawAssignmentText: `${assign.role}: ${assign.org}`,
      });
      existingAssignKeys.add(key);
      assignmentsCreated++;
    }

    // Clear chuc_danh only if all parts were processed and no non-role parts remain
    if (allCreated && !data.hasNonRoleParts) {
      pastorsToClear.push(data.pastorId);
    } else if (allCreated && data.hasNonRoleParts) {
      // Keep chuc_danh but remove the processed parts
      console.log(
        `Pastor ${data.fullName} (id ${data.pastorId}) has non-role parts, keeping chuc_danh`
      );
    }
  }

  for (const pid of pastorsToClear) {
    await db.update(pastors).set({ chucDanh: null }).where(eq(pastors.id, pid));
  }

  console.log(`Churches created: ${churchesCreated}`);
  console.log(`Assignments created: ${assignmentsCreated}`);
  console.log(`Assignments skipped (already exist): ${assignmentsSkipped}`);
  console.log(`Pastors with chuc_danh cleared: ${pastorsToClear.length}`);
  console.log('Recovery completed!');
}

main().catch((err) => {
  console.error('Recovery failed:', err);
  process.exit(1);
});
