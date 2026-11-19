import * as XLSX from "xlsx";
import { db } from "../src/db";
import { pastors } from "../src/db/schema";
import { eq } from "drizzle-orm";

const EXCEL_PATH = "./DATA -HOI THANH, DN, TIN HUU, GP -2026.xlsx";

function cleanStr(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).replace(/\s+/g, " ").trim();
  if (!s || s === "NaN" || s === "#REF!" || s === "undefined" || s === "#N/A") return null;
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

function cleanPhone(val: unknown): string | null {
  if (!val) return null;
  const s = String(val).replace(/[\s\-]/g, "").trim();
  if (!s || s === "NaN" || s === "#REF!" || s === "undefined" || s === "#N/A") return null;
  return s;
}

// Correct title mappings per user requirement
function mapChucDanhToTitle(chucDanh: string): string | null {
  const cd = chucDanh.trim().toLowerCase();
  if (cd === "msts") return "Mục sư trí sự";
  if (cd === "qpms") return "Quả phụ Mục sư";
  if (cd === "ntđts") return "Nữ Truyền đạo trí sự";
  return null;
}

async function main() {
  console.log("Reading Excel workbook:", EXCEL_PATH);
  const workbook = XLSX.readFile(EXCEL_PATH);

  const allPastors = await db.select().from(pastors);
  console.log(`Total pastors in DB: ${allPastors.length}`);

  const byNormName = new Map<string, typeof allPastors[]>();
  const byPhone = new Map<string, typeof allPastors[]>();
  for (const p of allPastors) {
    const nk = normalizeName(p.fullName);
    if (!byNormName.has(nk)) byNormName.set(nk, []);
    byNormName.get(nk)!.push(p);
    if (p.phone) {
      const pk = cleanPhone(p.phone);
      if (pk && !byPhone.has(pk)) byPhone.set(pk, []);
      if (pk) byPhone.get(pk)!.push(p);
    }
  }

  function findPastor(name: string | null, phone: string | null) {
    if (phone) {
      const pk = cleanPhone(phone);
      if (pk && byPhone.has(pk)) return byPhone.get(pk)![0];
    }
    if (name) {
      const nk = normalizeName(name);
      if (byNormName.has(nk)) return byNormName.get(nk)![0];
    }
    return null;
  }

  let matched = 0;
  let updated = 0;
  let notMatched: string[] = [];

  console.log("\n=== Processing MSTS-QPMS 2024 ===");
  if (workbook.Sheets["MSTS-QPMS 2024"]) {
    const sheet = workbook.Sheets["MSTS-QPMS 2024"];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    for (let i = 2; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;

      const chucDanh = cleanStr(r[1]);
      const fullName = cleanStr(r[2]);
      const phone = cleanStr(r[3]);

      if (!fullName || !chucDanh) continue;

      const mappedTitle = mapChucDanhToTitle(chucDanh);
      if (!mappedTitle) continue;

      const pastor = findPastor(fullName, phone);
      if (!pastor) {
        notMatched.push(fullName);
        continue;
      }

      matched++;

      if (pastor.title !== mappedTitle) {
        await db.update(pastors).set({ title: mappedTitle }).where(eq(pastors.id, pastor.id));
        updated++;
        console.log(`  ${pastor.fullName}: "${pastor.title}" → "${mappedTitle}"`);
      }
    }
    console.log(`MSTS-QPMS 2024: processed ${rows.length - 2} rows`);
  }

  console.log(`\nMatched: ${matched}, Title updated: ${updated}`);
  console.log(`Not matched: ${notMatched.length}`);
  if (notMatched.length > 0) {
    console.log("Not matched pastors:");
    notMatched.forEach((n) => console.log(`  - ${n}`));
  }

  console.log("\nTitle update completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Title update failed:", err);
  process.exit(1);
});
