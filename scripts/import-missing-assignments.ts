import { db } from '../src/db';
import { pastors, pastoralAssignments, churches } from '../src/db/schema';
import { eq, or } from 'drizzle-orm';
import * as fs from 'fs';

function parseSqlValues(valuesStr: string): string[] {
  const values: string[] = [];
  let i = 0;
  while (i < valuesStr.length) {
    while (i < valuesStr.length && " ,".includes(valuesStr[i])) i += 1;
    if (i >= valuesStr.length) break;
    if (valuesStr[i] === "'") {
      i += 1;
      let val = "";
      while (i < valuesStr.length) {
        if (valuesStr[i] === "'" && i + 1 < valuesStr.length && valuesStr[i + 1] === "'") {
          val += "'";
          i += 2;
        } else if (valuesStr[i] === "'") {
          i += 1;
          break;
        } else {
          val += valuesStr[i];
          i += 1;
        }
      }
      values.push(val);
    } else {
      let val = "";
      while (i < valuesStr.length && valuesStr[i] !== ",") {
        val += valuesStr[i];
        i += 1;
      }
      values.push(val.trim());
    }
  }
  return values;
}

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

// Read chuc_danh from SQL file
function readSqlChucDanh(): Map<string, string> {
  const sqlData = new Map<string, string>();
  const content = fs.readFileSync('src/db/pastors.sql', 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("INSERT INTO public.pastors")) continue;

    const m = trimmed.match(/VALUES\s*\((.*)\);/s);
    if (!m) continue;

    const values = parseSqlValues(m[1]);
    if (values.length >= 6) {
      const name = values[0];
      const cd = values[5];
      if (cd && cd.trim()) {
        sqlData.set(name, cd.trim());
      }
    }
  }

  return sqlData;
}

async function main() {
  if (!db) {
    console.error('No database connection.');
    process.exit(1);
  }

  const sqlData = readSqlChucDanh();
  console.log(`SQL pastors with chuc_danh: ${sqlData.size}`);

  // Get all pastors from DB
  const allPastors = await db.select().from(pastors);
  const pastorByName = new Map<string, (typeof allPastors)[number]>();
  for (const p of allPastors) {
    pastorByName.set(p.fullName, p);
  }

  // Get all churches
  const allChurches = await db.select().from(churches);
  const churchByNormName = new Map<string, (typeof allChurches)[number]>();
  for (const ch of allChurches) {
    const key = normalizeForMatch(ch.name);
    if (!churchByNormName.has(key)) churchByNormName.set(key, ch);
  }

  // Get existing assignments
  const existingAssignments = await db.select().from(pastoralAssignments);
  const existingAssignKeys = new Set<string>();
  for (const a of existingAssignments) {
    existingAssignKeys.add(`${a.pastorId}-${a.churchId}-${a.role}`);
  }

  let pastorsProcessed = 0;
  let pastorsFound = 0;
  let churchesCreated = 0;
  let assignmentsCreated = 0;
  let assignmentsSkipped = 0;
  const unmatchedPastors: string[] = [];
  const orgsToCreate: string[] = [];
  const orgSet = new Set<string>();

  // First pass: collect all orgs that need church entries
  const pastorRoleOrgs: Array<{ pastorId: number; pastorName: string; roleOrgs: { role: string; org: string }[] }> = [];

  for (const [name, cd] of sqlData) {
    const pastor = pastorByName.get(name);
    if (!pastor) {
      unmatchedPastors.push(name);
      continue;
    }

    pastorsFound += 1;
    const parts = cd.split(' | ');
    const roleOrgs: { role: string; org: string }[] = [];

    for (const part of parts) {
      const parsed = parseRoleOrg(part);
      if (parsed) {
        roleOrgs.push(parsed);
        if (!orgSet.has(parsed.org)) {
          orgSet.add(parsed.org);
          orgsToCreate.push(parsed.org);
        }
      }
    }

    if (roleOrgs.length > 0) {
      pastorRoleOrgs.push({
        pastorId: pastor.id,
        pastorName: pastor.fullName,
        roleOrgs,
      });
    }
  }

  console.log(`Pastors found in DB: ${pastorsFound}`);
  console.log(`Pastors NOT found in DB: ${unmatchedPastors.length}`);
  console.log(`Distinct orgs to create: ${orgsToCreate.length}`);

  // Create church entries for all distinct orgs
  let nextStt = 188;
  const orgToChurchId = new Map<string, number>();

  for (const orgName of orgsToCreate) {
    const key = normalizeForMatch(orgName);
    if (churchByNormName.has(key)) {
      orgToChurchId.set(orgName, churchByNormName.get(key)!.id);
      continue;
    }

    const code = `ORG-${String(nextStt).padStart(4, '0')}`;
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
        note: 'Created from SQL chuc_danh import',
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
      note: 'Created from SQL chuc_danh import',
    });
    nextStt++;
    churchesCreated++;
  }

  // Create assignments
  for (const data of pastorRoleOrgs) {
    for (const roleOrg of data.roleOrgs) {
      const churchId = orgToChurchId.get(roleOrg.org);
      if (!churchId) {
        console.error(`ERROR: No churchId for org "${roleOrg.org}"`);
        continue;
      }

      const key = `${data.pastorId}-${churchId}-${roleOrg.role}`;
      if (existingAssignKeys.has(key)) {
        assignmentsSkipped++;
        continue;
      }

      await db.insert(pastoralAssignments).values({
        churchId,
        pastorId: data.pastorId,
        role: roleOrg.role,
        isPrimary: true,
        rawAssignmentText: `${roleOrg.role}: ${roleOrg.org}`,
      });
      existingAssignKeys.add(key);
      assignmentsCreated++;
    }
  }

  pastorsProcessed = pastorRoleOrgs.length;

  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Pastors processed: ${pastorsProcessed}`);
  console.log(`Churches created: ${churchesCreated}`);
  console.log(`Assignments created: ${assignmentsCreated}`);
  console.log(`Assignments skipped (already exist): ${assignmentsSkipped}`);
  console.log(`Pastors not found in DB: ${unmatchedPastors.length}`);
  if (unmatchedPastors.length > 0) {
    console.log(`Unmatched pastors: ${unmatchedPastors.join(', ')}`);
  }
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
