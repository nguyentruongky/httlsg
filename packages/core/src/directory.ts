import { AgeRangeSchema, getAge } from "./age";
import {
  getLocalDataset,
  SourceProfileSchema,
  type SourceProfile,
} from "./local-data";
import { z } from "zod";
import { demo, viewerId } from "./demo";
import {
  IdSchema,
  MemberSchema,
  MemberNoteSchema,
  MemberVisitSchema,
  type MemberVisit,
  DepartmentIdSchema,
  AreaSchema,
  LocationSchema,
  type Member,
} from "./schemas";
import { departments, areas, locations } from "./catalog";
export const DirectoryQuerySchema = z
  .object({
    search: z.string().max(200).default(""),
    departmentIds: z.array(DepartmentIdSchema).default([]),
    area: z.union([z.literal("all"), AreaSchema]).default("all"),
    location: z.union([z.literal("all"), LocationSchema]).default("all"),
    ageUnknownOnly: AgeRangeSchema.shape.ageUnknownOnly,
    minAge: AgeRangeSchema.shape.minAge,
    maxAge: AgeRangeSchema.shape.maxAge,
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(50).default(12),
  })
  .strict()
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
export type DirectoryQuery = z.infer<typeof DirectoryQuerySchema>;
export const DirectoryMemberSchema = MemberSchema.extend({
  departments: z.array(
    z.object({
      id: DepartmentIdSchema,
      name: z.string(),
      description: z.string(),
      meeting: z.string(),
      location: z.string(),
      position: z.string(),
      leader: z.string(),
    }),
  ),
  position: z.string(),
  notes: MemberNoteSchema.array().default([]),
  visitHistory: MemberVisitSchema.array().default([]),
  faithDate: z.iso.date().nullable().default(null),
  baptismDate: z.iso.date().nullable().default(null),
  lastVisitDate: z.iso.date().nullable().default(null),
  preferredName: z.string().default(""),
  gender: z.string().default(""),
  householdRole: z.string().default(""),
  source: SourceProfileSchema.shape.source,
  membershipDateKnown: z.boolean().default(true),
  testAccount: z.boolean().default(false),
  area: AreaSchema.nullable(),
  location: LocationSchema.nullable(),
  phone: z.string().nullable(),
  dateOfBirth: z.iso.date().nullable(),
  address: z.string().nullable(),
  occupation: z.string().nullable(),
  bio: z.string(),
  version: z.number().int().nonnegative().default(0),
  family: z
    .object({
      name: z.string(),
      members: z.array(
        z.object({ id: IdSchema, name: z.string(), relationship: z.string() }),
      ),
    })
    .nullable(),
});
export type DirectoryMember = z.infer<typeof DirectoryMemberSchema>;
function describeDepartments(
  ids: string[],
  position: string,
  roles: Record<string, string> = {},
) {
  return ids.map((id) => {
    const department = departments.find((d) => d.id === id)!;
    return {
      ...department,
      description: "",
      meeting: "Chưa cập nhật",
      location: "Chưa cập nhật",
      position: roles[id] ?? position,
      leader: "Chưa cập nhật",
    };
  });
}
function enrich(
  member: Member,
  index: number,
  members: Member[],
): DirectoryMember {
  const household = members.slice(
    Math.floor(index / 3) * 3,
    Math.floor(index / 3) * 3 + 3,
  );
  const assigned = [
    departments[index % departments.length],
    ...(index % 3 === 0 ? [departments[(index + 8) % departments.length]] : []),
  ];
  const position =
    member.role === "admin"
      ? "Điều phối viên"
      : member.role === "manager"
        ? "Trưởng nhóm"
        : "Thành viên";
  const surname = household[0].user.name.split(" ").at(-1);
  return DirectoryMemberSchema.parse({
    ...member,
    departments: describeDepartments(
      assigned.map((d) => d.id),
      position,
    ),
    position,
    area: areas[index % areas.length],
    location: locations[index % locations.length],
    phone: `+1 (202) 555-${String(100 + (index % 100)).padStart(4, "0")}`,
    dateOfBirth: `${1965 + (index % 40)}-${String((index % 12) + 1).padStart(2, "0")}-${String((index % 28) + 1).padStart(2, "0")}`,
    address: `${24 + Math.floor(index / 3)} đường Cedar, khu Riverside`,
    occupation: [
      "Giáo viên",
      "Nhà thiết kế",
      "Kỹ sư",
      "Nhân viên cộng đồng",
      "Nhân viên y tế",
      "Kinh doanh",
    ][index % 6],
    bio: `Tham gia sinh hoạt tại ${assigned.map((d) => d.name).join(", ")}. Luôn sẵn lòng kết nối và hỗ trợ mọi người.`,
    family: {
      name: `Gia đình ${surname}`,
      members: household
        .filter((m) => m.id !== member.id)
        .map((m) => ({
          id: m.id,
          name: m.user.name,
          relationship: "Người thân",
        })),
    },
  });
}
function importedProfile(
  member: Member,
  profile: SourceProfile | undefined,
): DirectoryMember {
  const f = profile?.fields;
  return DirectoryMemberSchema.parse({
    ...member,
    departments: describeDepartments(
      f?.departmentIds ?? [],
      f?.position ?? "Chưa cập nhật",
    ),
    position: f?.position ?? "Chưa cập nhật",
    area: f?.area || null,
    location: f?.location || null,
    phone: f?.phone || null,
    dateOfBirth: f?.dateOfBirth || null,
    address: f?.address || null,
    occupation: f?.occupation || null,
    bio: f?.bio ?? "",
    family: f?.familyName
      ? {
          name: f.familyName,
          members: f.familyMembers.map((relative) => ({
            ...relative,
            name: "",
          })),
        }
      : null,
    faithDate: (f?.faithDate ?? profile?.source?.faithDate) || null,
    baptismDate: (f?.baptismDate ?? profile?.source?.baptismDate) || null,
    lastVisitDate: (f?.lastVisitDate ?? profile?.source?.lastVisitDate) || null,
    preferredName: f?.preferredName ?? profile?.source?.preferredName ?? "",
    gender: f?.gender ?? profile?.source?.gender ?? "",
    householdRole: f?.householdRole ?? profile?.source?.familyRole ?? "",
    source: profile?.source,
    testAccount: profile?.testAccount ?? false,
    membershipDateKnown: false,
  });
}
async function all(org: string) {
  const s = await demo.get(org);
  const local = getLocalDataset(org);

  const projected = s.members.map((m, i) => {
    const base = local
      ? importedProfile(m, local.profiles[m.id])
      : enrich(m, i, s.members);
    const saved = s.memberDetails?.[m.id];
    if (!saved)
      return {
        ...base,
        family: base.family
          ? {
              ...base.family,
              members: base.family.members.map((r) => ({
                ...r,
                name: s.members.find((m) => m.id === r.id)?.user.name ?? r.name,
              })),
            }
          : null,
      };
    const f = saved.fields;
    return DirectoryMemberSchema.parse({
      ...base,
      version: saved.version,
      phone: f.phone || null,
      dateOfBirth: f.dateOfBirth || null,
      address: f.address || null,
      occupation: f.occupation || null,
      bio: f.bio,
      departments: describeDepartments(
        f.departmentIds,
        f.position,
        f.departmentRoles,
      ),
      faithDate:
        f.faithDate === undefined ? base.faithDate : f.faithDate || null,
      baptismDate:
        f.baptismDate === undefined ? base.baptismDate : f.baptismDate || null,
      lastVisitDate:
        f.lastVisitDate === undefined
          ? base.lastVisitDate
          : f.lastVisitDate || null,
      preferredName: f.preferredName ?? base.preferredName,
      gender: f.gender ?? base.gender,
      householdRole: f.householdRole ?? base.householdRole,
      position: f.position,
      area: f.area || null,
      location: f.location || null,
      family: f.familyName
        ? {
            name: f.familyName,
            members: f.familyMembers.map((relative) => ({
              ...relative,
              name:
                s.members.find((m) => m.id === relative.id)?.user.name ??
                "Thành viên không còn trong tổ chức",
            })),
          }
        : null,
    });
  });
  return projected.map((member) => {
    const notes = [...(s.memberNotes?.[member.id] ?? [])]
      .filter((n) => n.organizationId === org && n.memberId === member.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const visits = [...(s.memberVisits?.[member.id] ?? [])].filter(
      (v) => v.organizationId === org && v.memberId === member.id,
    );
    const known = [
      { date: member.source?.lastVisitDate, source: "import" as const },
      { date: member.lastVisitDate, source: "legacy" as const },
    ];
    for (const entry of known) {
      if (entry.date && !visits.some((v) => v.visitedOn === entry.date))
        visits.push({
          id: member.id,
          organizationId: org,
          memberId: member.id,
          authorId: null,
          authorName:
            entry.source === "import"
              ? "Dữ liệu nhập"
              : "Ngày thăm viếng đã lưu",
          visitedOn: entry.date,
          summary: "",
          createdAt: member.joinedAt,
          source: entry.source,
        } satisfies MemberVisit);
    }
    visits.sort(
      (a, b) =>
        b.visitedOn.localeCompare(a.visitedOn) ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
    return {
      ...member,
      notes,
      visitHistory: visits,
      lastVisitDate: visits[0]?.visitedOn ?? member.lastVisitDate,
    };
  });
}
export async function listDirectory(
  org: string,
  input: DirectoryQuery,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const query = DirectoryQuerySchema.parse(input);
  const members = await all(org);
  signal?.throwIfAborted();
  const normalize = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLocaleLowerCase("vi");
  const search = normalize(query.search.trim());
  const now = new Date();
  const filtered = members.filter(
    (m) =>
      !m.testAccount &&
      (!search ||
        [
          m.user.name,
          m.user.email,
          m.phone,
          m.family?.name,
          m.preferredName,
          m.source?.areaRaw,
          m.source?.phoneRaw,
          m.source?.departmentRaw,
          ...m.departments.map((d) => d.name),
          m.area,
          m.location,
        ].some((v) => (v ? normalize(v).includes(search) : false))) &&
      (!query.departmentIds.length ||
        m.departments.some((d) => query.departmentIds.includes(d.id))) &&
      (query.area === "all" || m.area === query.area) &&
      (query.location === "all" || m.location === query.location) &&
      (query.ageUnknownOnly
        ? getAge(m.dateOfBirth, now) === null
        : (query.minAge === null && query.maxAge === null) ||
          (() => {
            const age = getAge(m.dateOfBirth, now);
            return (
              age !== null &&
              (query.minAge === null || age >= query.minAge) &&
              (query.maxAge === null || age <= query.maxAge)
            );
          })()),
  );
  // Stable default ordering keeps pagination deterministic without a sorting control.
  filtered.sort(
    (a, b) =>
      a.user.name.localeCompare(b.user.name, "vi", { sensitivity: "base" }) ||
      a.id.localeCompare(b.id),
  );
  const start = (query.page - 1) * query.pageSize;
  return {
    items: filtered.slice(start, start + query.pageSize),
    total: filtered.length,
    nextPage:
      start + query.pageSize < filtered.length ? query.page + 1 : undefined,
  };
}
export async function getDirectoryMember(org: string, id: string) {
  IdSchema.parse(id);
  const members = await all(org);
  const member = members.find((m) => m.id === id);
  if (!member) throw new Error("Không tìm thấy thành viên trong tổ chức này.");
  return member;
}
export async function getMyProfile(org: string) {
  const members = await all(org);
  const member = members.find((m) => m.userId === viewerId);
  if (!member)
    throw new Error("Không tìm thấy hồ sơ của bạn trong tổ chức này.");
  return member;
}

// Compact options for the editor; do not depend on loaded directory pages.
export async function getMemberOptions(org: string) {
  const snapshot = await demo.get(org);
  return snapshot.members
    .filter((m) => !getLocalDataset(org)?.profiles[m.id]?.testAccount)
    .map((m) => ({ id: m.id, name: m.user.name }));
}
