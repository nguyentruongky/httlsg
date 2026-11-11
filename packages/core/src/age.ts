import { z } from "zod";
const AgeBound = z
  .number()
  .int("Tuổi phải là số nguyên.")
  .min(0, "Tuổi không được nhỏ hơn 0.")
  .max(130, "Tuổi không được lớn hơn 130.")
  .nullable()
  .default(null);
export const AgeRangeSchema = z
  .object({
    minAge: AgeBound,
    maxAge: AgeBound,
    ageUnknownOnly: z.boolean().default(false),
  })
  .refine(
    (v) => v.minAge === null || v.maxAge === null || v.minAge <= v.maxAge,
    { message: "Tuổi từ không được lớn hơn tuổi đến.", path: ["maxAge"] },
  )
  .refine(
    (v) => !v.ageUnknownOnly || (v.minAge === null && v.maxAge === null),
    {
      message: "Không thể kết hợp thiếu dữ liệu tuổi với khoảng tuổi.",
      path: ["ageUnknownOnly"],
    },
  );
export const CHOIR_DEPARTMENT_AGE_BANDS = [
  { departmentId: "au-nhi", minAge: 0, maxAge: 6 },
  { departmentId: "thieu-nhi", minAge: 7, maxAge: 12 },
  { departmentId: "thieu-nien", minAge: 13, maxAge: 18 },
  { departmentId: "thanh-nien", minAge: 19, maxAge: 30 },
  { departmentId: "thanh-trang", minAge: 31, maxAge: 40 },
  { departmentId: "trang-nien", minAge: 41, maxAge: 50 },
  { departmentId: "trung-nien", minAge: 51, maxAge: 60 },
  { departmentId: "lao-nien", minAge: 61, maxAge: null },
] as const;
export function choirDepartmentForAge(age: number) {
  return (
    CHOIR_DEPARTMENT_AGE_BANDS.find(
      (band) =>
        age >= band.minAge && (band.maxAge === null || age <= band.maxAge),
    )?.departmentId ?? null
  );
}
const localDateFormatter = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function getAgeByYear(dateOfBirth: string | null, year: number) {
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return null;
  const parsed = new Date(`${dateOfBirth}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== dateOfBirth
  )
    return null;
  const birthYear = Number(dateOfBirth.slice(0, 4));
  const age = year - birthYear;
  return age >= 0 ? age : null;
}
export function getAge(
  dateOfBirth: string | null,
  now = new Date(),
): number | null {
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return null;
  const parsed = new Date(`${dateOfBirth}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== dateOfBirth
  )
    return null;
  const parts = localDateFormatter.formatToParts(now);
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const age =
    part("year") -
    year -
    Number(
      part("month") < month || (part("month") === month && part("day") < day),
    );
  return age >= 0 ? age : null;
}
