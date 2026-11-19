import * as XLSX from "xlsx";
import { db } from "../src/db";
import { churches } from "../src/db/schema";
import { eq } from "drizzle-orm";

const EXCEL_PATH = "./DATA -HOI THANH, DN, TIN HUU, GP -2026.xlsx";
const SHEET_NAME = "SO LUONG TIN HUU-2026";

function cleanStr(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).replace(/\s+/g, " ").trim();
  if (!s || s === "NaN" || s === "#REF!" || s === "undefined") return null;
  return s;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  console.log("Reading Excel workbook:", EXCEL_PATH);
  const workbook = XLSX.readFile(EXCEL_PATH);

  if (!workbook.Sheets[SHEET_NAME]) {
    console.error(`Sheet "${SHEET_NAME}" not found in workbook`);
    process.exit(1);
  }

  const sheet = workbook.Sheets[SHEET_NAME];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

  // Headers are on row 1 (index 1)
  const header = rows[1];
  let nameCol = 0;
  let dnCol = 1;
  let regularCol = -1;

  for (let i = 0; i < header.length; i++) {
    const h = cleanStr(header[i]) || "";
    const norm = h.toLowerCase();
    if (norm.includes("tín hữu nhóm thường xuyên")) {
      regularCol = i;
    }
  }

  console.log(`Header columns: ${header.length}`);
  console.log(`Name column index: ${nameCol}`);
  console.log(`ĐN column index: ${dnCol}`);
  console.log(`Regular attendance column index: ${regularCol}`);

  if (regularCol === -1) {
    console.error(
      'Could not find column "TÍN HỮU NHÓM THÙNG XUYÊN" in header row'
    );
    console.log("Headers:", header.map((h, i) => `${i}:${h}`).join(" | "));
    process.exit(1);
  }

  // Build attendance map from Excel (data starts at row 2)
  const attendanceMap = new Map<string, number>();
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    const chName = cleanStr(r[nameCol]);
    const dnName = cleanStr(r[dnCol]);
    const rawName = chName || dnName;
    if (!rawName || rawName.startsWith("KV ")) continue;

    // Strip parenthetical status and prefixes to get base name
    const stripped = rawName
      .replace(/\(chính thức\)|\(nội bộ\)/gi, "")
      .replace(/^(đn\.|hn\.|ch\.)\s*/i, "")
      .trim();

    const regular =
      typeof r[regularCol] === "number" ? Math.round(r[regularCol]) : 0;
    if (regular > 0) {
      attendanceMap.set(normalizeName(stripped), regular);
      attendanceMap.set(normalizeName(rawName), regular);
    }
  }

  console.log(`Found ${attendanceMap.size} attendance records in Excel`);

  // Fetch all churches from DB
  const allChurches = await db.select().from(churches);
  console.log(`Found ${allChurches.length} churches in database`);

  const churchByNormName = new Map<string, typeof allChurches[0]>();
  for (const ch of allChurches) {
    churchByNormName.set(normalizeName(ch.name), ch);
    if (ch.shortName) {
      churchByNormName.set(normalizeName(ch.shortName), ch);
    }
    // Also index stripped name (without parenthetical)
    const strippedDb = ch.name
      .replace(/\([^)]*\)/g, "")
      .replace(/^(đn\.|hn\.|ch\.)\s*/i, "")
      .trim();
    if (strippedDb) {
      churchByNormName.set(normalizeName(strippedDb), ch);
    }
  }

  let matched = 0;
  let updated = 0;
  const notMatched: string[] = [];

  for (const [normName, regular] of attendanceMap) {
    const church = churchByNormName.get(normName);
    if (!church) {
      notMatched.push(normName);
      continue;
    }
    matched++;

    if (church.regularAttendanceCount !== regular) {
      await db
        .update(churches)
        .set({ regularAttendanceCount: regular })
        .where(eq(churches.id, church.id));
      updated++;
    }
  }

  console.log(
    `Matched: ${matched}/${attendanceMap.size}, Updated: ${updated}`
  );
  if (notMatched.length > 0) {
    console.log("Not matched churches:");
    notMatched.forEach((n) => console.log(`  - ${n}`));
  }

  console.log("Attendance override completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Override failed:", err);
  process.exit(1);
});
