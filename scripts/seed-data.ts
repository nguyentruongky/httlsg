import * as XLSX from "xlsx";
import { db } from "../src/db"; // Adjust path to your Drizzle db instance
import {
  regions,
  governanceLevels,
  administrativeWards,
  pastors,
  churches,
  pastoralAssignments,
  churchPersonnel,
  assemblyDelegates,
  departments,
} from "../src/db/schema";
import { eq } from "drizzle-orm";

const EXCEL_PATH = "./DATA -HOI THANH, DN, TIN HUU, GP -2026.xlsx";

// Utility helpers
function cleanStr(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).replace(/\s+/g, " ").trim();
  if (!s || s === "NaN" || s === "#REF!" || s === "undefined") return null;
  return s;
}

function cleanPhone(val: unknown): string | null {
  const s = cleanStr(val);
  if (!s) return null;
  let digits = s.replace(/[^\d]/g, "");
  if (digits.length === 9 && !digits.startsWith("0")) {
    digits = "0" + digits;
  }
  return digits || s;
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

function parsePastorTitleAndName(raw: string): {
  title: string;
  fullName: string;
  role: string;
  rawAnnotation: string | null;
} {
  let text = raw.trim();
  let role = "Quản nhiệm";
  let rawAnnotation: string | null = null;

  const parenMatch = text.match(/\(([^)]+)\)/);
  if (parenMatch) {
    rawAnnotation = parenMatch[0];
    const inside = parenMatch[1].toLowerCase();
    if (inside.includes("kiêm")) role = "Kiêm nhiệm";
    else if (inside.includes("đt") || inside.includes("đặc trách"))
      role = "Đặc trách";
    else if (inside.includes("tạm")) role = "Tạm lo";
    else if (inside.includes("phụ tá")) role = "Phụ tá";
    text = text.replace(/\([^)]+\)/g, "").trim();
  }

  let title = "MS";
  const prefixes: [RegExp, string][] = [
    [/^(Nữ Tđ|Ntđ|NTĐ)\.?\s+/i, "NTĐ"],
    [/^(MsNc|MSNC|Mục sư Nhiệm chức)\.?\s+/i, "MsNc"],
    [/^(Tđ|TĐ|Truyền đạo)\.?\s+/i, "TĐ"],
    [/^(Ms|MS|Mục sư)\.?\s+/i, "MS"],
    [/^(Thầy)\.?\s+/i, "Thầy"],
  ];

  for (const [regex, mappedTitle] of prefixes) {
    if (regex.test(text)) {
      title = mappedTitle;
      text = text.replace(regex, "").trim();
      break;
    }
  }

  return { title, fullName: text, role, rawAnnotation };
}

async function seed() {
  console.log("Reading Excel workbook:", EXCEL_PATH);
  const workbook = XLSX.readFile(EXCEL_PATH);

  // ---------------------------------------------------------------------------
  // 1. Seed Governance Levels
  // ---------------------------------------------------------------------------
  console.log("1. Seeding Governance Levels...");
  await db
    .insert(governanceLevels)
    .values([
      {
        tier: 1,
        code: "BDD-TPHCM",
        name: "Ban Đại Diện Tin Lành TP.HCM",
        description:
          "Cấp điều hành chung toàn Thành phố Hồ Chí Minh (sau sáp nhập 2026)",
        permissionsSummary:
          "Quản trị toàn bộ 6 Khu vực, nhân sự Giáo phẩm, thống kê toàn thành",
      },
      {
        tier: 2,
        code: "KHU-VUC",
        name: "Khu vực (I - VI)",
        description: "Cấp điều phối theo cụm địa lý hành chính mới",
        permissionsSummary:
          "Điều phối Chi hội, Hội nhánh, Điểm nhóm trong Khu vực",
      },
      {
        tier: 3,
        code: "CHI-HOI",
        name: "Chi hội (Tự lập / Tự dưỡng / Nội bộ)",
        description: "Hội Thánh cơ sở có Ban Chấp Sự và Quản nhiệm chính thức",
        permissionsSummary:
          "Quản lý tín hữu, ban ngành và các Hội nhánh / Điểm nhóm trực thuộc",
      },
      {
        tier: 4,
        code: "HN-DN",
        name: "Hội nhánh & Điểm nhóm",
        description: "Cơ sở nhóm lại trực thuộc Chi hội hoặc Tổng Liên Hội",
        permissionsSummary: "Báo cáo sinh hoạt và nhân sự về Chi hội chủ quản",
      },
    ])
    .onConflictDoNothing();

  // ---------------------------------------------------------------------------
  // 2. Seed Regions (Khu vực I - VI) + KPIs from 'Data Dien tich -Dan so TP.HCM m'
  // ---------------------------------------------------------------------------
  console.log("2. Seeding Regions (Khu vực I - VI)...");
  const regionSeedData = [
    {
      code: "I",
      name: "Khu vực I",
      areaDescription: "Quận 1, 3, 4, 5, 8, 10, Bình Chánh, Cần Giờ (cũ)",
      totalWardsCount: 36,
      unreachedWardsCount: 10,
      totalAreaKm2: 614.516,
      totalPopulation: 2929211,
    },
    {
      code: "II",
      name: "Khu vực II",
      areaDescription: "Quận 7, Nhà Bè, TP. Thủ Đức (cũ)",
      totalWardsCount: 18,
      unreachedWardsCount: 3,
      totalAreaKm2: 642.729,
      totalPopulation: 1791114,
    },
    {
      code: "III",
      name: "Khu vực III",
      areaDescription:
        "Bình Thạnh, Gò Vấp, Phú Nhuận, Quận 12, Hóc Môn, Củ Chi (cũ)",
      totalWardsCount: 29,
      unreachedWardsCount: 10,
      totalAreaKm2: 641.531,
      totalPopulation: 3087615,
    },
    {
      code: "IV",
      name: "Khu vực IV",
      areaDescription: "Tân Bình, Tân Phú, Quận 6, Quận 11, Bình Tân (cũ)",
      totalWardsCount: 22,
      unreachedWardsCount: 6,
      totalAreaKm2: 276.701,
      totalPopulation: 2192304,
    },
    {
      code: "V",
      name: "Khu vực V",
      areaDescription: "Khu vực Bình Dương (sáp nhập 2026)",
      totalWardsCount: 36,
      unreachedWardsCount: 20,
      totalAreaKm2: 2694.574,
      totalPopulation: 2722527,
    },
    {
      code: "VI",
      name: "Khu vực VI",
      areaDescription: "Khu vực Bà Rịa - Vũng Tàu (sáp nhập 2026)",
      totalWardsCount: 30,
      unreachedWardsCount: 7,
      totalAreaKm2: 1990.62,
      totalPopulation: 1317403,
    },
  ];

  const regionMap = new Map<string, number>();
  for (const r of regionSeedData) {
    const [inserted] = await db
      .insert(regions)
      .values(r)
      .onConflictDoUpdate({ target: regions.code, set: r })
      .returning();
    regionMap.set(r.code, inserted.id);
  }

  // ---------------------------------------------------------------------------
  // 3. Seed Administrative Wards ('Data Dien tich -Dan so TP.HCM m')
  // ---------------------------------------------------------------------------
  console.log("3. Seeding Administrative Wards...");
  const wardSheet = workbook.Sheets["Data Dien tich -Dan so TP.HCM m"];
  const wardRows = XLSX.utils.sheet_to_json<any[]>(wardSheet, { header: 1 });
  const wardMap = new Map<string, number>();

  for (let i = 2; i < wardRows.length; i++) {
    const row = wardRows[i];
    if (!row) continue;
    const stt = typeof row[1] === "number" ? row[1] : null;
    const rawWardName = cleanStr(row[3] || row[2]);
    if (
      !rawWardName ||
      rawWardName.includes("TỔNG CỘNG") ||
      rawWardName === "TOTAL" ||
      rawWardName.includes("DATA CHI HỘI")
    ) {
      continue;
    }

    let province = "TP.HCM";
    if (rawWardName.includes("Tây Ninh")) province = "Tây Ninh";
    else if (rawWardName.includes("Đồng Nai")) province = "Đồng Nai";

    const [insertedWard] = await db
      .insert(administrativeWards)
      .values({
        stt,
        name: rawWardName,
        province,
        areaKm2: typeof row[4] === "number" ? row[4] : null,
        population: typeof row[5] === "number" ? Math.round(row[5]) : null,
      })
      .returning();

    const cleanWardKey = normalizeName(
      rawWardName.replace(/^(P\.|X\.|Phường|Xã)\s*/i, ""),
    );
    wardMap.set(cleanWardKey, insertedWard.id);
  }

  // ---------------------------------------------------------------------------
  // 4. Seed Clergy / Pastors from 'GIAO PHAM 2026', 'DATA GP-TINHUU-VT', 'MSTS-QPMS 2024'
  // ---------------------------------------------------------------------------
  console.log("4. Seeding Clergy & Pastors Directory...");
  const pastorCache = new Map<string, number>();

  async function upsertPastor(data: {
    fullName: string;
    lastName?: string | null;
    firstName?: string | null;
    title: string;
    status?: string;
    birthYear?: number | null;
    phone?: string | null;
    email?: string | null;
    residentialAddress?: string | null;
    ministryLocationRaw?: string | null;
    churchLevelPrefix?: string | null;
    preMergerProvince?: string | null;
    postMergerProvince?: string | null;
    spouseName?: string | null;
    spouseBirthYear?: string | null;
    spousePhone?: string | null;
    notes?: string | null;
  }): Promise<number> {
    const key = normalizeName(data.fullName);
    const existingId = pastorCache.get(key);

    if (existingId) {
      const updatePayload: Record<string, any> = {};
      if (data.lastName) updatePayload.lastName = data.lastName;
      if (data.firstName) updatePayload.firstName = data.firstName;
      if (data.birthYear) updatePayload.birthYear = data.birthYear;
      if (data.phone) updatePayload.phone = data.phone;
      if (data.email) updatePayload.email = data.email;
      if (data.residentialAddress)
        updatePayload.residentialAddress = data.residentialAddress;
      if (data.ministryLocationRaw)
        updatePayload.ministryLocationRaw = data.ministryLocationRaw;
      if (data.churchLevelPrefix)
        updatePayload.churchLevelPrefix = data.churchLevelPrefix;
      if (data.preMergerProvince)
        updatePayload.preMergerProvince = data.preMergerProvince;
      if (data.spouseName) updatePayload.spouseName = data.spouseName;
      if (data.spouseBirthYear)
        updatePayload.spouseBirthYear = data.spouseBirthYear;
      if (data.spousePhone) updatePayload.spousePhone = data.spousePhone;
      if (data.notes) updatePayload.notes = data.notes;

      if (Object.keys(updatePayload).length > 0) {
        await db
          .update(pastors)
          .set(updatePayload)
          .where(eq(pastors.id, existingId));
      }
      return existingId;
    }

    const [inserted] = await db
      .insert(pastors)
      .values({
        fullName: data.fullName,
        lastName: data.lastName ?? null,
        firstName: data.firstName ?? null,
        title: data.title,
        status: data.status ?? "active",
        birthYear: data.birthYear ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        residentialAddress: data.residentialAddress ?? null,
        ministryLocationRaw: data.ministryLocationRaw ?? null,
        churchLevelPrefix: data.churchLevelPrefix ?? null,
        preMergerProvince: data.preMergerProvince ?? null,
        postMergerProvince: data.postMergerProvince ?? "TP.HCM",
        spouseName: data.spouseName ?? null,
        spouseBirthYear: data.spouseBirthYear ?? null,
        spousePhone: data.spousePhone ?? null,
        notes: data.notes ?? null,
      })
      .returning();

    pastorCache.set(key, inserted.id);
    return inserted.id;
  }

  // 4a. Parse 'GIAO PHAM 2026'
  const gpRows = XLSX.utils.sheet_to_json<Record<string, any>>(
    workbook.Sheets["GIAO PHAM 2026"],
  );
  for (const row of gpRows) {
    if (typeof row["STT"] !== "number") continue;
    const lastName = cleanStr(row["HỌ"]);
    const firstName = cleanStr(row["TÊN"]);
    const fullName =
      cleanStr(row["TÊN GIÁO PHẨM"]) ||
      [lastName, firstName].filter(Boolean).join(" ");
    if (!fullName) continue;

    const chucVu = cleanStr(row["CHỨC VỤ"])?.toLowerCase() || "";
    let status = "active";
    if (chucVu.includes("chờ nhiệm sở")) status = "awaiting_assignment";
    else if (chucVu.includes("du học")) status = "studying";

    await upsertPastor({
      fullName,
      lastName,
      firstName,
      title: cleanStr(row["CHỨC DANH"]) || "MS",
      status,
      birthYear:
        typeof row["NĂM SINH"] === "number"
          ? Math.round(row["NĂM SINH"])
          : null,
      phone: cleanPhone(row["SĐT"]),
      email: cleanStr(row["Email"]),
      ministryLocationRaw: cleanStr(row["TÊN NHIỆM SỞ"]),
      churchLevelPrefix: cleanStr(row["CẤP CHI HỘI"]),
      preMergerProvince: cleanStr(row["Tỉnh/thành (trước sáp nhập)"]),
      postMergerProvince: cleanStr(row["Tỉnh/thành (sáp nhập)"]) || "TP.HCM",
    });
  }

  // 4b. Parse 'DATA GP-TINHUU-VT'
  const vtRows = XLSX.utils.sheet_to_json<any[]>(
    workbook.Sheets["DATA GP-TINHUU-VT"],
    { header: 1 },
  );
  let inRetiredSection = false;
  for (let i = 3; i < vtRows.length; i++) {
    const r = vtRows[i];
    if (!r || r.every((c) => c === null || c === undefined)) continue;
    const col0 = cleanStr(r[0]);
    const col1 = cleanStr(r[1]);
    if (col0?.includes("DANH SÁCH GIÁO PHẨM HƯU TRÍ")) {
      inRetiredSection = true;
      continue;
    }
    if (col0?.includes("DANH SÁCH 7 HỘI NHÁNH") || col0 === "Nội dung") break;
    if (col0 === "STT") continue;

    if (!inRetiredSection && typeof r[0] === "number" && col1) {
      const fullName = cleanStr(r[2]);
      if (!fullName) continue;
      await upsertPastor({
        fullName,
        title: col1,
        birthYear: typeof r[4] === "number" ? Math.round(r[4]) : null,
        phone: cleanPhone(r[7]),
        ministryLocationRaw: cleanStr(r[5]),
        spouseName: cleanStr(r[8]),
        spouseBirthYear: cleanStr(r[9]),
        spousePhone: cleanPhone(r[10]),
        notes: cleanStr(r[6]),
      });
    } else if (inRetiredSection && typeof r[0] === "number" && col1) {
      const parsed = parsePastorTitleAndName(col1);
      const isWidow = col1.toLowerCase().includes("quả phụ");
      await upsertPastor({
        fullName: parsed.fullName,
        title: isWidow ? "QpMs" : parsed.title,
        status: isWidow ? "widow" : "retired",
        birthYear: typeof r[2] === "number" ? Math.round(r[2]) : null,
        spouseName: cleanStr(r[3]),
        spouseBirthYear: cleanStr(r[4]),
        notes: cleanStr(r[5]) ? `Đang sinh hoạt tại ${cleanStr(r[5])}` : null,
      });
    }
  }

  // 4c. Parse 'MSTS-QPMS 2024'
  const mstsRows = XLSX.utils.sheet_to_json<any[]>(
    workbook.Sheets["MSTS-QPMS 2024"],
    { header: 1 },
  );
  for (let i = 1; i < mstsRows.length; i++) {
    const r = mstsRows[i];
    if (!r || typeof r[0] !== "number") continue;
    const rawTitle = cleanStr(r[1]) || "MsTs";
    const fullName = cleanStr(r[2]);
    if (!fullName) continue;
    const isWidow = rawTitle.toLowerCase().includes("qpms");

    await upsertPastor({
      fullName,
      title: rawTitle,
      status: isWidow ? "widow" : "retired",
      phone: cleanPhone(r[3]),
      birthYear: typeof r[4] === "number" ? Math.round(r[4]) : null,
      residentialAddress: cleanStr(r[5]),
      spouseName: cleanStr(r[6]),
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Comprehensive Attendance & Member Count Mapping ('SO LUONG TIN HUU-2026')
  // ---------------------------------------------------------------------------
  console.log("5. Loading comprehensive attendance & member statistics...");
  const attendanceMap = new Map<string, { listed: number; regular: number }>();
  const slSheet = workbook.Sheets["SO LUONG TIN HUU-2026"];
  const slRows = XLSX.utils.sheet_to_json<any[]>(slSheet, { header: 1 });

  for (let i = 2; i < slRows.length; i++) {
    const r = slRows[i];
    if (!r) continue;
    const chName = cleanStr(r[1]);
    const dnName = cleanStr(r[2]);
    const rawName = chName || dnName;
    if (!rawName || rawName.startsWith("KV ")) continue;

    const stripped = rawName
      .replace(/\(Chính thức\)|\(Nội bộ\)/gi, "")
      .replace(/^(ĐN\.|HN\.|CH\.)\s*/i, "")
      .trim();

    const listed = typeof r[4] === "number" ? Math.round(r[4]) : 0;
    const regular = typeof r[5] === "number" ? Math.round(r[5]) : 0;

    attendanceMap.set(normalizeName(stripped), { listed, regular });
    attendanceMap.set(normalizeName(rawName), { listed, regular });
  }

  // Old district map from 'draft'
  const oldDistrictMap = new Map<string, string>();
  const draftRows = XLSX.utils.sheet_to_json<Record<string, any>>(
    workbook.Sheets["draft"],
  );
  for (const r of draftRows) {
    const ht = cleanStr(r["HỘI THÁNH"]);
    const qCu = cleanStr(r["QUẬN CŨ"]);
    if (ht && qCu) {
      oldDistrictMap.set(normalizeName(ht), qCu);
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Seed All 172 Congregations & Merge Full Statistics
  // ---------------------------------------------------------------------------
  console.log("6. Seeding 172 Congregations & Pastoral Assignments...");
  const churchSheet = workbook.Sheets["DATA HT KV TPHCM-2026"];
  const churchRows = XLSX.utils.sheet_to_json<Record<string, any>>(churchSheet);

  const churchByName = new Map<string, number>();
  const pendingParentLinks: { childId: number; parentName: string }[] = [];

  for (const row of churchRows) {
    const stt = typeof row["STT"] === "number" ? Math.round(row["STT"]) : null;
    if (!stt) continue;

    const rawName = cleanStr(row["Tên Của CH/ĐN/HN"]);
    if (!rawName) continue;

    const rawForm = cleanStr(row["Hình Thức"]) || "Chi hội";
    const form = rawForm.toLowerCase().includes("điểm")
      ? "Điểm nhóm"
      : rawForm.toLowerCase().includes("nhánh")
        ? "Hội nhánh"
        : "Chi hội";

    const prefix =
      form === "Chi hội" ? "CH" : form === "Hội nhánh" ? "HN" : "DN";
    const code = `${prefix}-${String(stt).padStart(3, "0")}`;

    const kvCode = cleanStr(row["KV"]) || "I";
    const regionId = regionMap.get(kvCode) || regionMap.get("I")!;

    const newWardRaw =
      cleanStr(row["PHƯỜNG/XÃ (Sau sát nhập)"]) || cleanStr(row["P/X (mới)"]);
    const wardKey = newWardRaw
      ? normalizeName(newWardRaw.replace(/^(P\.|X\.|Phường|Xã)\s*/i, ""))
      : "";
    const wardId = wardMap.get(wardKey) ?? null;

    if (wardId) {
      await db
        .update(administrativeWards)
        .set({ hasChurch: true, regionId })
        .where(eq(administrativeWards.id, wardId));
    }

    const note = cleanStr(row["GHI CHÚ"]);
    const isInHcm = !(
      note &&
      (note.toLowerCase().includes("không thuộc") ||
        note.toLowerCase().includes("tây ninh"))
    );

    const shortName = rawName.replace(/\([^)]+\)/g, "").trim();

    // Fallback search across main sheet and SO LUONG TIN HUU-2026 sheet
    const primaryListed =
      typeof row[" SỐ LƯỢNG TÍN HỮU THEO DANH SÁCH"] === "number"
        ? Math.round(row[" SỐ LƯỢNG TÍN HỮU THEO DANH SÁCH"])
        : 0;

    const attStats =
      attendanceMap.get(normalizeName(shortName)) ||
      attendanceMap.get(normalizeName(rawName));
    const memberCount =
      primaryListed > 0 ? primaryListed : (attStats?.listed ?? 0);
    const regularAttendanceCount = attStats?.regular ?? memberCount;

    const foundedRaw = cleanStr(row["NĂM THÀNH LẬP"]);
    const foundedYear =
      foundedRaw && /^\d{4}$/.test(foundedRaw)
        ? parseInt(foundedRaw, 10)
        : null;

    const [insertedChurch] = await db
      .insert(churches)
      .values({
        stt,
        code,
        form,
        legalType: cleanStr(row["Loại Hình"]) || "Chính thức",
        autonomy: cleanStr(row["Tự lập/ Tự dưỡng"]),
        name: rawName,
        shortName,
        parentChurchName: cleanStr(row["CH trực thuộc"]),
        regionId,
        wardId,
        foundedYear,
        oldDistrict: oldDistrictMap.get(normalizeName(shortName)) ?? null,
        oldWard: cleanStr(row["PHƯỜNG/ XÃ (Cũ)"]),
        oldAddress: cleanStr(row["ĐỊA CHỈ (Cũ - Có Quận/Huyện)"]),
        newAddress: cleanStr(row["ĐỊA CHỈ MỚI (Sau sáp nhập 2026)"]),
        newWard: newWardRaw,
        isInHcm,
        memberCount,
        regularAttendanceCount,
        note,
      })
      .onConflictDoUpdate({
        target: churches.code,
        set: {
          memberCount,
          regularAttendanceCount,
        },
      })
      .returning();

    churchByName.set(normalizeName(rawName), insertedChurch.id);
    churchByName.set(normalizeName(shortName), insertedChurch.id);

    const parentName = cleanStr(row["CH trực thuộc"]);
    if (parentName) {
      pendingParentLinks.push({ childId: insertedChurch.id, parentName });
    }

    // Link Pastor Assignment
    const rawPastorCell = cleanStr(row["MS QUẢN NHIỆM/ ĐẶC TRÁCH"]);
    const pastorPhone = cleanPhone(row["SĐT LIÊN LẠC"]);
    if (rawPastorCell) {
      const parsed = parsePastorTitleAndName(rawPastorCell);
      const pastorId = await upsertPastor({
        fullName: parsed.fullName,
        title: parsed.title,
        phone: pastorPhone,
      });

      await db.insert(pastoralAssignments).values({
        churchId: insertedChurch.id,
        pastorId,
        role: parsed.role,
        isPrimary: parsed.role === "Quản nhiệm",
        rawAssignmentText: parsed.rawAnnotation || rawPastorCell,
      });
    }
  }

  // Resolve parentChurchId self-references
  for (const link of pendingParentLinks) {
    const parentId = churchByName.get(normalizeName(link.parentName));
    if (parentId) {
      await db
        .update(churches)
        .set({ parentChurchId: parentId })
        .where(eq(churches.id, link.childId));
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Seed Evangelism Committee Personnel ('NHAN SU PHU TRACH TRUYEN GIAO 2')
  // ---------------------------------------------------------------------------
  console.log("7. Seeding Evangelism Personnel...");
  const nsRows = XLSX.utils.sheet_to_json<Record<string, any>>(
    workbook.Sheets["NHAN SU PHU TRACH TRUYEN GIAO 2"],
  );
  let lastKvId: number | null = null;
  let lastChurchId: number | null = null;
  let lastChurchName: string | null = null;

  for (const r of nsRows) {
    const kvRaw = cleanStr(r["KHU VỰC"]);
    if (kvRaw) {
      const numMatch = kvRaw.match(/(\d+)/);
      const roman = ["I", "II", "III", "IV", "V", "VI"][
        Number(numMatch?.[1]) - 1
      ];
      if (roman && regionMap.has(roman)) lastKvId = regionMap.get(roman)!;
    }

    const chRaw = cleanStr(r["CHI HỘI "]) || cleanStr(r["CHI HỘI"]);
    if (chRaw) {
      lastChurchName = chRaw;
      const stripped = chRaw.replace(/^(ĐN\.|HN\.|CH\.)\s*/i, "").trim();
      lastChurchId = churchByName.get(normalizeName(stripped)) ?? null;
    }

    const personName = cleanStr(
      r["Họ và Tên Chấp sự/Nhân sự đặc trách Truyền giáo"],
    );
    const phone = cleanPhone(r["Số điện thoại liên lạc"]);
    const email = cleanStr(r["Email liên lạc"]);

    if (!personName && !email) continue;

    await db.insert(churchPersonnel).values({
      churchId: lastChurchId,
      regionId: lastKvId,
      rawChurchName: lastChurchName,
      fullName: personName || "(Bổ sung email liên lạc)",
      ministryRole: "Đặc trách Truyền giáo",
      phone,
      email,
    });
  }

  // ---------------------------------------------------------------------------
  // 8. Seed General Assembly #49 Delegates ('Sheet12')
  // ---------------------------------------------------------------------------
  console.log("8. Seeding General Assembly #49 Delegates...");
  const s12Rows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets["Sheet12"], {
    header: 1,
  });
  let currentCategory = "Mục sư / Giáo phẩm";

  for (let i = 4; i < s12Rows.length; i++) {
    const r = s12Rows[i];
    if (!r) continue;
    const col1 = cleanStr(r[1]);
    if (col1 === "TÍN HỮU") {
      currentCategory = "Tín hữu / Chấp sự";
      continue;
    }
    if (col1 === "STT" || typeof r[1] !== "number") continue;

    const title =
      cleanStr(r[2]) ||
      (currentCategory.startsWith("Mục sư") ? "MS." : "Tín hữu");
    const lastName = cleanStr(r[3]);
    const firstName = cleanStr(r[4]);
    const fullName = [lastName, firstName].filter(Boolean).join(" ");
    if (!fullName) continue;

    const rawChurch = cleanStr(r[7]);
    const strippedChurch = rawChurch
      ? rawChurch
          .replace(/^(CH\.|HN\.|ĐN\.)\s*/i, "")
          .replace(/\([^)]+\)/g, "")
          .trim()
      : "";
    const churchId = strippedChurch
      ? (churchByName.get(normalizeName(strippedChurch)) ?? null)
      : null;
    const pastorId = pastorCache.get(normalizeName(fullName)) ?? null;

    await db.insert(assemblyDelegates).values({
      assemblyNumber: 49,
      delegateCategory: currentCategory,
      stt: Math.round(r[1]),
      title,
      lastName,
      firstName,
      fullName,
      birthYear: typeof r[5] === "number" ? Math.round(r[5]) : null,
      role: cleanStr(r[6]),
      churchId,
      pastorId,
      rawChurchName: rawChurch,
      province: cleanStr(r[8]) || "Tp. HCM",
      autonomyNote: cleanStr(r[9]),
    });
  }

  console.log(
    "Migration & Seeding successfully completed with full member & attendance stats!",
  );
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
