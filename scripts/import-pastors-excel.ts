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

async function main() {
  console.log("Reading Excel workbook:", EXCEL_PATH);
  const workbook = XLSX.readFile(EXCEL_PATH);

  // Fetch all existing pastors from DB
  const allPastors = await db.select().from(pastors);
  console.log(`Total pastors in DB: ${allPastors.length}`);

  // Build lookup maps by normalized name and by phone
  const byNormName = new Map<string, typeof allPastors[]>();
  const byPhone = new Map<string, typeof allPastors[]>();
  for (const p of allPastors) {
    const nk = normalizeName(p.fullName);
    if (!byNormName.has(nk)) byNormName.set(nk, []);
    byNormName.get(nk)!.push(p);
    if (p.phone) {
      const pk = cleanPhone(p.phone);
      if (!byPhone.has(pk)) byPhone.set(pk, []);
      byPhone.get(pk)!.push(p);
    }
  }

  let matched = 0;
  let updated = 0;
  let notMatched: string[] = [];

  // Helper to find a pastor match
  function findPastor(name: string | null, phone: string | null) {
    // Try by phone first
    if (phone) {
      const pk = cleanPhone(phone);
      if (pk && byPhone.has(pk)) return byPhone.get(pk)![0];
    }
    // Try by name
    if (name) {
      const nk = normalizeName(name);
      if (byNormName.has(nk)) return byNormName.get(nk)![0];
    }
    return null;
  }

  // 1. Process GIAO PHAM 2026 sheet
  console.log("\n=== Processing GIAO PHAM 2026 ===");
  if (workbook.Sheets["GIAO PHAM 2026"]) {
    const sheet = workbook.Sheets["GIAO PHAM 2026"];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    // Header is row 1 (index 1): STT, CHỨC DANH, HỌ, TÊN, ..., CHỨC VỤ, NĂM SINH, TÊN NHIỆM SỞ, ..., TÊN GIÁO PHẨM, Email, SĐT, ...
    // Row indices:
    //   0: STT
    //   1: CHỨC DANH
    //   2: HỌ
    //   3: TÊN
    //   ...
    //   5: CHỨC VỤ (chức vụ)
    //   6: NĂM SINH (năm sinh)
    //   8: TÊN NHIỆM SỞ (tên nhiệm sở)
    //   11: TÊN GIÁO PHẨM
    //   12: Email
    //   13: SĐT

    for (let i = 2; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;

      const chucDanh = cleanStr(r[1]);
      const ho = cleanStr(r[2]);
      const ten = cleanStr(r[3]);
      const fullName = ho && ten ? `${ho} ${ten}` : ho || ten;
      const chucVu = cleanStr(r[5]);      // chức vụ
      const namSinh =
        typeof r[6] === "number" ? Math.round(r[6]) : r[6] ? Number(r[6]) : null;
      const tenNhiemSo = cleanStr(r[8]);    // tên nhiệm sở
      const email = cleanStr(r[12]);       // email
      const phone = cleanStr(r[13]);       // SĐT

      if (!fullName) continue;

      const pastor = findPastor(fullName, phone);
      if (!pastor) {
        notMatched.push(fullName);
        continue;
      }

      matched++;

      const updates: Record<string, unknown> = {};
      if (chucVu && !pastor.chucVu) updates.chucVu = chucVu;
      if (namSinh && !pastor.namSinh) updates.namSinh = namSinh;
      if (tenNhiemSo && !pastor.tenNhiemSo) updates.tenNhiemSo = tenNhiemSo;
      if (email && !pastor.email) updates.email = email;

      if (Object.keys(updates).length > 0) {
        await db.update(pastors).set(updates).where(eq(pastors.id, pastor.id));
        updated++;
      }
    }
    console.log(`GIAO PHAM 2026: processed ${rows.length - 2} rows`);
  }

  // 2. Process MSTS-QPMS 2024 sheet
  console.log("\n=== Processing MSTS-QPMS 2024 ===");
  if (workbook.Sheets["MSTS-QPMS 2024"]) {
    const sheet = workbook.Sheets["MSTS-QPMS 2024"];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    // Header is row 1 (index 1): STT, CHỨC DANH, HỌ VÀ TÊN, SỐ ĐIỆN THOẠI, NĂM SINH, ĐỊA CHỈ, NHỦ DANH
    // Row indices:
    //   0: STT
    //   1: CHỨC DANH
    //   2: HỌ VÀ TÊN
    //   3: SỐ ĐIỆN THOẠI
    //   4: NĂM SINH
    //   5: ĐỊA CHỈ
    //   6: NHỦ DANH

    for (let i = 2; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;

      const fullName = cleanStr(r[2]);
      const phone = cleanStr(r[3]);      // SỐ ĐIỆN THOẠI
      const namSinh =
        typeof r[4] === "number" ? Math.round(r[4]) : r[4] ? Number(r[4]) : null;
      const diaChi = cleanStr(r[5]);     // ĐỊA CHỈ
      const nhuDanh = cleanStr(r[6]);    // NHỦ DANH

      if (!fullName) continue;

      const pastor = findPastor(fullName, phone);
      if (!pastor) {
        if (!notMatched.includes(fullName)) notMatched.push(fullName);
        continue;
      }

      matched++;

      const updates: Record<string, unknown> = {};
      if (namSinh && !pastor.namSinh) updates.namSinh = namSinh;
      if (diaChi && !pastor.diaChi) updates.diaChi = diaChi;
      if (nhuDanh && !pastor.nhuDanh) updates.nhuDanh = nhuDanh;

      if (Object.keys(updates).length > 0) {
        await db.update(pastors).set(updates).where(eq(pastors.id, pastor.id));
        updated++;
      }
    }
    console.log(`MSTS-QPMS 2024: processed ${rows.length - 2} rows`);
  }

  console.log(`\nMatched: ${matched}, Updated: ${updated}`);
  console.log(`Not matched: ${notMatched.length}`);
  if (notMatched.length > 0) {
    console.log("Not matched pastors:");
    notMatched.forEach((n) => console.log(`  - ${n}`));
  }

  console.log("\nImport completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
