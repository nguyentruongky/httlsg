import { z } from "zod";
import { departments } from "./catalog";
import { MemberSchema, MemberDetailInputSchema, IdSchema } from "./schemas";
export const SourceProfileSchema = z.object({
  fields: MemberDetailInputSchema,
  testAccount: z.boolean().default(false),
  source: z
    .object({
      row: z.number().int().positive(),
      preferredName: z.string(),
      gender: z.string(),
      faithDate: z.union([z.literal(""), z.iso.date()]),
      baptismDate: z.union([z.literal(""), z.iso.date()]),
      age: z.string(),
      believerType: z.string(),
      areaRaw: z.string(),
      familyRole: z.string(),
      lastVisitDate: z.union([z.literal(""), z.iso.date()]),
      departmentRaw: z.string(),
      phoneRaw: z.string(),
      householdName: z.string(),
      addressRaw: z.string(),
      ambiguousHousehold: z.boolean(),
    })
    .optional(),
});
const DatasetSchema = z.object({
  revision: z.string().regex(/^[a-f0-9]{16}$/),
  organization: z.object({
    id: IdSchema,
    name: z.string().min(2),
    short: z.string(),
  }),
  departments: z.array(
    z.object({ id: z.string().regex(/^[a-z0-9-]+$/), name: z.string().min(2) }),
  ),
  members: MemberSchema.array().min(1),
  profiles: z.record(IdSchema, SourceProfileSchema),
});
export type LocalDataset = z.infer<typeof DatasetSchema>;
export type SourceProfile = z.infer<typeof SourceProfileSchema>;
const datasets = new Map<string, LocalDataset>();
export function getLocalDataset(org: string) {
  return datasets.get(org);
}
export function registerLocalDataset(input: unknown) {
  const envelope = z
    .object({ departments: DatasetSchema.shape.departments })
    .parse(input);
  const added: string[] = [];
  try {
    for (const d of envelope.departments) {
      const existing = departments.find((v) => v.id === d.id);
      if (existing && existing.name !== d.name)
        throw new Error("Ban ngành nhập trùng mã với danh mục hiện có.");
      if (!existing) {
        departments.push(d);
        added.push(d.id);
      }
    }
    const data = DatasetSchema.parse(input);
    const memberIds = new Set(data.members.map((m) => m.id));
    const userIds = new Set(data.members.map((m) => m.userId));
    if (
      memberIds.size !== data.members.length ||
      userIds.size !== data.members.length
    )
      throw new Error("Mã thành viên trong dữ liệu cục bộ bị trùng.");
    for (const m of data.members) {
      const profile = data.profiles[m.id];
      if (
        m.organizationId !== data.organization.id ||
        !profile ||
        profile.fields.familyMembers.some(
          (r) => r.id === m.id || !memberIds.has(r.id),
        )
      )
        throw new Error(
          "Liên kết thành viên trong dữ liệu cục bộ không hợp lệ.",
        );
    }
    datasets.set(data.organization.id, data);
    return data;
  } catch (error) {
    for (const id of added) {
      const index = departments.findIndex((d) => d.id === id);
      departments.splice(index, 1);
    }
    throw error;
  }
}
