import { z } from "zod";

export const PERSONNEL_MINISTRY_NAMES = [
  "Ban Âm Nhạc",
  "Ban Âm Thanh - Ánh Sáng",
  "Ban Biên Soạn Bài học KTHT",
  "Ban Giữ xe",
  "Ban Hậu Cần",
  "Ban Khánh Tiết",
  "Ban Phiên Dịch",
  "Ban Thăm Viếng",
  "Ban Truyền Giảng",
  "Ban Truyền Thông",
  "Ban Trường Chúa Nhật",
  "Ban Tu bổ sửa chữa",
] as const;
export const PERSONNEL_CHOIR_NAMES = [
  "Lão niên",
  "Trung niên",
  "Tráng niên",
  "Thanh tráng",
  "Thanh niên",
  "Thiếu niên",
  "Thiếu nhi",
  "Ấu nhi",
  "Phụ nữ",
] as const;
export function personnelDepartmentKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/^ban\s+/, "")
    .replace(/[^a-z0-9]/g, "");
}
export const PERSONNEL_MISSION_LABELS = {
  admin: "Admin",
  secretary: "Thư ký",
  deacon: "Chấp sự",
  board: "Ban điều hành",
  leader: "Trưởng ban ngành",
  specialist: "Đặc trách",
  department: "Thành viên",
} as const;
export const PersonnelMission = z
  .object({
    kind: z.enum([
      "admin",
      "secretary",
      "deacon",
      "board",
      "leader",
      "specialist",
      "department",
    ]),
    departmentId: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(100)
      .nullable(),
  })
  .strict()
  .superRefine((entry, ctx) => {
    const required = ["board", "leader", "specialist", "department"].includes(
      entry.kind,
    );
    if (required !== Boolean(entry.departmentId))
      ctx.addIssue({
        code: "custom",
        path: ["departmentId"],
        message: required
          ? "Vui lòng chọn Ban hát hoặc Ban ngành."
          : "Công tác này không có Ban ngành đi kèm.",
      });
  });
export type PersonnelMissionValue = z.infer<typeof PersonnelMission>;
export const PersonnelMissionsInput = z
  .object({
    revision: z.string().length(64),
    missions: z.array(PersonnelMission).max(50),
  })
  .strict()
  .refine(
    (value) =>
      new Set(
        value.missions.map((item) => `${item.kind}:${item.departmentId ?? ""}`),
      ).size === value.missions.length,
    "Công tác bị trùng.",
  );
export type PersonnelMissionsData = {
  revision: string;
  missions: PersonnelMissionValue[];
  departments: { id: string; name: string }[];
};

/** Specific offices replace the generic board title within the same department. */
export function prioritizePersonnelAssignments<
  T extends { role: string; departmentName: string | null },
>(items: readonly T[]): T[] {
  const rank = (role: string) => {
    const key = personnelDepartmentKey(role);
    const prefixes = [
      "truongban",
      "phoban",
      "thuky",
      "thuquy",
      "uyvien",
      "dieuhanh",
    ];
    const index = prefixes.findIndex((prefix) => key.startsWith(prefix));
    return index < 0 ? Infinity : index;
  };
  const best = new Map<string, number>();
  for (const item of items) {
    if (!item.departmentName || !Number.isFinite(rank(item.role))) continue;
    const key = personnelDepartmentKey(item.departmentName);
    best.set(key, Math.min(best.get(key) ?? Infinity, rank(item.role)));
  }
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.departmentName || !Number.isFinite(rank(item.role))) return true;
    const key = personnelDepartmentKey(item.departmentName);
    if (rank(item.role) === 5 && (best.get(key) ?? Infinity) < 5) return false;
    const office = `${key}:${rank(item.role)}`;
    if (seen.has(office)) return false;
    seen.add(office);
    return true;
  });
}
