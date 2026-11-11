import { z } from "zod";
export const AccessRoleSchema = z.enum([
  "admin",
  "secretary",
  "deacon",
  "board",
  "user",
  "leader",
]);
export type AccessRole = z.infer<typeof AccessRoleSchema>;
export const accessRoleLabels: Record<AccessRole, string> = {
  admin: "Admin",
  secretary: "Thư ký",
  deacon: "Chấp sự",
  board: "Ban điều hành",
  user: "User",
  leader: "Trưởng Ban ngành",
};
export function normalizeIdentifier(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    return z.email().safeParse(email).success ? email : null;
  }
  const phone = trimmed.replace(/[\s().-]/g, "");
  if (/^0[0-9]{8,10}$/.test(phone)) return "+84" + phone.slice(1);
  if (/^84[0-9]{8,10}$/.test(phone)) return "+" + phone;
  return /^\+[1-9][0-9]{7,14}$/.test(phone) ? phone : null;
}
export const IdentifierSchema = z
  .string()
  .trim()
  .min(1, "Nhập số điện thoại hoặc email.")
  .max(254)
  .refine(
    (v) => normalizeIdentifier(v) !== null,
    "Số điện thoại hoặc email không hợp lệ.",
  )
  .transform((v) => normalizeIdentifier(v)!);
export const LoginSchema = z
  .object({
    identifier: IdentifierSchema,
    password: z.string().min(1, "Vui lòng nhập mật khẩu.").max(256),
  })
  .strict();
// Keep existing clients working while they migrate from the email-only field.
export const LoginRequestSchema = z.union([
  LoginSchema,
  z
    .object({ email: IdentifierSchema, password: z.string().min(1).max(256) })
    .strict()
    .transform((v) => ({ identifier: v.email, password: v.password })),
]);
export const PhoneOtpRequestSchema = z
  .object({
    phone: IdentifierSchema.refine(
      (v) => v.startsWith("+"),
      "Số điện thoại không hợp lệ.",
    ),
    full_name: z.string().trim().min(2).max(100),
    department_id: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(100),
  })
  .strict();
export const EmailOtpRequestSchema = z
  .object({
    email: IdentifierSchema.refine(
      (v) => v.includes("@"),
      "Email không hợp lệ.",
    ),
  })
  .strict();
export const VerifyOtpSchema = z
  .object({
    identifier: IdentifierSchema,
    otp_code: z.string().regex(/^[0-9]{6}$/, "Mã OTP gồm 6 chữ số."),
  })
  .strict();
export const PasswordSchema = z
  .string()
  .min(4, "Mật khẩu cần ít nhất 4 ký tự.")
  .max(20);
export const TemporaryPasswordSchema = z.string().min(4).max(20);
export const SetPasswordSchema = z
  .object({
    new_password: PasswordSchema,
    confirm_password: z.string().max(256),
  })
  .strict()
  .refine((v) => v.new_password === v.confirm_password, {
    message: "Mật khẩu xác nhận không khớp.",
    path: ["confirm_password"],
  });
export const CreateAccountSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().trim().toLowerCase().max(254),
  password: PasswordSchema,
  accessRole: AccessRoleSchema,
});
export type AuthUser = {
  id: string;
  email: string | null;
  name: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  role: AccessRole;
  roleLabel: string;
  departmentIds: string[];
  calendarDepartmentIds?: string[];
  permissions: string[];
  isPasswordSet: boolean;
  requiresPasswordSetup: boolean;
  authVersion: number;
  leaderDepartmentId: string | null;
  departmentId: string | null;
  roles?: AccessRole[];
  leaderDepartmentIds?: string[];
  boardDepartmentIds?: string[];
};
export const hasDashboard = (role: AccessRole) =>
  role === "admin" || role === "secretary";
// Standard members always keep the default User role, so management listings and
// grant controls exclude it.
export const managementRoles: readonly AccessRole[] = [
  "admin",
  "secretary",
  "deacon",
  "board",
  "leader",
];
// These roles only make sense when they are tied to a specific Ban ngành.
export const departmentScopedRoles: readonly AccessRole[] = ["board", "leader"];
export const roleRequiresDepartment = (role: AccessRole) =>
  departmentScopedRoles.includes(role);
// Members may hold several management roles. Single-role consumers keep working
// off the most privileged one, which is also what the account row stores.
export const primaryAccessRole = (roles: readonly AccessRole[]): AccessRole =>
  managementRoles.find((role) => roles.includes(role)) ?? "user";
export type MemberAccess = {
  accessRole?: AccessRole;
  canEdit?: boolean;
  canManageLinks?: boolean;
};

export const hasLeaderRole = (user: AuthUser) =>
  user.role === "leader" || Boolean(user.roles?.includes("leader"));
export const canOpenLeaderTeam = (user: AuthUser) =>
  !user.requiresPasswordSetup &&
  hasLeaderRole(user) &&
  Boolean(user.leaderDepartmentId) &&
  user.permissions.includes("members.read.department");
// Legacy helpers follow the temporary Admin-only OTP screen policy.
export const canOpenLeaderConsole = (user: AuthUser) =>
  canOpenTeamOtpConsole(user);

export const hasBoardRole = (user: AuthUser) =>
  user.role === "board" || Boolean(user.roles?.includes("board"));
export const canOpenBoardTeam = (user: AuthUser) =>
  !user.requiresPasswordSetup &&
  hasBoardRole(user) &&
  Boolean(user.boardDepartmentIds?.length) &&
  user.permissions.includes("members.read.all");

export const isUserOnly = (user: AuthUser) =>
  user.role === "user" && !(user.roles ?? []).some((role) => role !== "user");
export const canOpenBoardConsole = (user: AuthUser) =>
  canOpenTeamOtpConsole(user);
// Temporary restriction: Thư ký, leaders, and board members are excluded even when
// their configurable role permissions still contain leader.otps.read.
export const canOpenTeamOtpConsole = (user: AuthUser) =>
  !user.requiresPasswordSetup &&
  user.role === "admin" &&
  user.permissions.includes("leader.otps.read");

// Explicit global administrators retain the complete directory.
export const isTeamScopedUser = (user: AuthUser) =>
  !hasDashboard(user.role) && (hasBoardRole(user) || hasLeaderRole(user));

export const hasHistoryManagementRole = (user: AuthUser) =>
  hasDashboard(user.role) || hasBoardRole(user) || hasLeaderRole(user);
export const canManageMemberHistory = (user: AuthUser, memberId: string) =>
  !user.requiresPasswordSetup &&
  user.id.toLowerCase() !== memberId.toLowerCase() &&
  hasHistoryManagementRole(user);

export type AdminOtpStatus = "pending" | "closed" | "expired" | "unavailable";
export type AdminOtpPage = {
  items: {
    id: string;
    user_id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    department_name: string | null;
    type: "EMAIL" | "PHONE_LEADER";
    status: AdminOtpStatus;
    otp_code: string | null;
    code_state: "available" | "email" | "unavailable";
    delivery?: "ADMIN" | "EMAIL";
    created_at: string;
    expires_at: string | null;
  }[];
  total: number;
  page: number;
  pageSize: number;
};
