import { AccessRoleSchema } from "./auth-contract";
import { z } from "zod";
import { departments, areas, locations } from "./catalog";
export const RoleSchema = z.enum(["admin", "manager", "member"]);
export const IdSchema = z.uuid();
const Timestamp = z.iso.datetime({ offset: true });
export const OrganizationSchema = z.object({
  id: IdSchema,
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(63),
  timezone: z.string().refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Invalid timezone"),
  tier: z.enum(["free", "team", "enterprise"]),
  branding: z.object({
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    logoUrl: z.url().nullable(),
  }),
  allowedDomains: z
    .array(
      z.string().regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/),
    )
    .max(50),
  createdAt: Timestamp,
});
export const UserSchema = z.object({
  id: IdSchema,
  name: z.string().trim().min(2).max(100),
  email: z.email().nullable(),
  avatarUrl: z.url().nullable(),
  createdAt: Timestamp,
});
export const MembershipSchema = z.object({
  id: IdSchema,
  organizationId: IdSchema,
  userId: IdSchema,
  role: RoleSchema,
  status: z.enum(["active", "invited", "suspended"]),
  joinedAt: Timestamp,
});
export const MemberSchema = MembershipSchema.extend({
  user: UserSchema,
  phone: z.string().nullable().optional(),
  area: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  dateOfBirth: z.iso.date().nullable().optional(),
  accessRole: AccessRoleSchema.optional(),
  canLogin: z.boolean().optional(),
  departments: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .optional(),
});
export const TaskSchema = z
  .object({
    id: IdSchema,
    organizationId: IdSchema,
    assigneeId: IdSchema,
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000),
    kind: z.enum(["task", "check_in"]),
    status: z.enum(["pending", "completed"]),
    dueAt: Timestamp,
    completedAt: Timestamp.nullable(),
    version: z.number().int().nonnegative(),
  })
  .refine(
    (t) => (t.status === "completed") === (t.completedAt !== null),
    "Completion time must match status",
  );
export const ActivitySchema = z.object({
  id: IdSchema,
  organizationId: IdSchema,
  actorId: IdSchema,
  action: z.string().min(1).max(100),
  subjectId: IdSchema,
  createdAt: Timestamp,
});
export const InviteSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  role: RoleSchema,
});
export type Role = z.infer<typeof RoleSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;
export type Member = z.infer<typeof MemberSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type Invite = z.infer<typeof InviteSchema>;
export function canManage(role: Role) {
  return role === "admin" || role === "manager";
}

export const DepartmentIdSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, "Ban ngành không hợp lệ.")
  .max(100);
export const AreaSchema = z.enum(areas);
export const LocationSchema = z
  .string()
  .refine((value) => locations.includes(value), "Phường/xã không hợp lệ.");
const EventDateSchema = z
  .union([z.literal(""), z.iso.date("Ngày không hợp lệ.")])
  .refine(
    (v) => !v || v <= new Date().toISOString().slice(0, 10),
    "Ngày không được ở tương lai.",
  );
export const ChurchStatusSchema = z.enum([
  "Trung tín",
  "Không trung tín",
  "Không đi nhóm",
  "Chuyển hội",
  "Đi nước ngoài",
]);
export const MemberDetailInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Họ tên cần ít nhất 2 ký tự.")
      .max(100, "Họ tên không quá 100 ký tự."),
    email: z.union([
      z.literal(""),
      z.email("Địa chỉ email không hợp lệ.").max(254),
    ]),
    phone: z
      .string()
      .trim()
      .max(30, "Số điện thoại không quá 30 ký tự.")
      .refine(
        (v) => !v || /^[+\d\s().-]{7,30}$/.test(v),
        "Số điện thoại không hợp lệ.",
      ),
    dateOfBirth: z
      .union([z.literal(""), z.iso.date("Ngày sinh không hợp lệ.")])
      .refine(
        (v) => !v || v <= new Date().toISOString().slice(0, 10),
        "Ngày sinh không được ở tương lai.",
      ),
    address: z.string().trim().max(300, "Địa chỉ không quá 300 ký tự."),
    occupation: z.string().trim().max(100, "Nghề nghiệp không quá 100 ký tự."),
    bio: z.string().trim().max(2000, "Giới thiệu không quá 2.000 ký tự."),
    departmentIds: z
      .array(DepartmentIdSchema)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Ban ngành không được trùng lặp.",
      ),
    area: z.union([z.literal(""), AreaSchema]),
    location: z.union([z.literal(""), LocationSchema]),
    position: z.string().trim().min(1, "Vui lòng nhập nhiệm vụ.").max(100),
    departmentRoles: z
      .record(
        DepartmentIdSchema,
        z.string().trim().max(100, "Vai trò không quá 100 ký tự."),
      )
      .optional(),
    faithDate: EventDateSchema.optional(),
    churchStatus: z.union([z.literal(""), ChurchStatusSchema]).optional(),
    chuyenHoiDen: z
      .string()
      .trim()
      .max(200, "Điểm đến không quá 200 ký tự.")
      .optional(),
    previousChurchStatus: z
      .union([z.literal(""), ChurchStatusSchema])
      .optional(),
    baptismDate: EventDateSchema.optional(),
    lastVisitDate: EventDateSchema.optional(),
    preferredName: z.string().trim().max(100).optional(),
    gender: z.string().trim().max(40).optional(),
    householdRole: z.string().trim().max(60).optional(),
    familyName: z.string().trim().max(100),
    familyMembers: z
      .array(
        z
          .object({
            id: IdSchema,
            relationship: z
              .string()
              .trim()
              .min(1, "Vui lòng nhập mối quan hệ.")
              .max(60),
          })
          .strict(),
      )
      .max(30, "Tối đa 30 người thân."),
  })
  .strict()
  .refine(
    (v) =>
      Object.keys(v.departmentRoles ?? {}).every((id) =>
        v.departmentIds.includes(id),
      ),
    {
      message: "Vai trò phải thuộc ban ngành đang tham gia.",
      path: ["departmentRoles"],
    },
  )
  .refine((v) => !v.familyMembers.length || Boolean(v.familyName), {
    message: "Vui lòng nhập tên gia đình.",
    path: ["familyName"],
  });
export type MemberDetailInput = z.infer<typeof MemberDetailInputSchema>;
export const StoredMemberDetailsSchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== "object" || !("fields" in value))
      return value;
    const record = value as { fields: Record<string, unknown> };
    if (!record.fields || typeof record.fields !== "object") return value;
    const { departmentId, ...fields } = record.fields;
    return {
      ...record,
      ...(typeof departmentId === "string"
        ? { legacyDepartmentId: departmentId }
        : {}),
      fields: {
        ...fields,
        departmentIds:
          fields.departmentIds ??
          (departments.some((d) => d.id === departmentId)
            ? [departmentId]
            : []),
        area: fields.area ?? "",
        location: fields.location ?? "",
      },
    };
  },
  z.object({
    fields: MemberDetailInputSchema,
    version: z.number().int().positive(),
    legacyDepartmentId: z.string().optional(),
  }),
);
export type StoredMemberDetails = z.infer<typeof StoredMemberDetailsSchema>;
export function canEditMemberDetails(
  actor: Member | undefined,
  target: Member,
) {
  return Boolean(
    actor &&
    actor.status === "active" &&
    actor.organizationId === target.organizationId &&
    (actor.role === "admin" ||
      (actor.role === "manager" && target.role !== "admin")),
  );
}

export function localToday() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export const NoteInputSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập ghi chú.")
      .max(4000, "Ghi chú không quá 4.000 ký tự."),
  })
  .strict();
export const VisitInputSchema = z
  .object({
    visitedOn: z.iso
      .date("Ngày thăm viếng không hợp lệ.")
      .refine(
        (v) => v <= localToday(),
        "Ngày thăm viếng không được ở tương lai.",
      ),
    summary: z
      .string()
      .trim()
      .max(4000, "Nội dung không quá 4.000 ký tự.")
      .default(""),
  })
  .strict();
export const MemberNoteSchema = z.object({
  id: IdSchema,
  organizationId: IdSchema,
  memberId: IdSchema,
  authorId: IdSchema,
  authorName: z.string(),
  text: NoteInputSchema.shape.text,
  createdAt: Timestamp,
});
export const MemberVisitSchema = z.object({
  id: IdSchema,
  organizationId: IdSchema,
  memberId: IdSchema,
  authorId: IdSchema.nullable(),
  authorName: z.string(),
  visitedOn: z.iso.date(),
  summary: z.string().max(4000),
  createdAt: Timestamp,
  source: z.enum(["user", "import", "legacy"]),
});
export type MemberNote = z.infer<typeof MemberNoteSchema>;
export type MemberVisit = z.infer<typeof MemberVisitSchema>;
