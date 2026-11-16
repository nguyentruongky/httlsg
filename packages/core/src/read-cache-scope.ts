import type { AuthUser } from "./auth-contract";

export const READ_CACHE_FORMAT_VERSION = "read-cache-v4";
export function authorizationScope(user: AuthUser, organization: string) {
  return JSON.stringify([
    READ_CACHE_FORMAT_VERSION,
    organization,
    user.id,
    user.authVersion,
    user.role,
    user.isReceptionLeader === true,
    [...(user.roles ?? [])].sort(),
    [...user.permissions].sort(),
    user.departmentId,
    [...(user.departmentIds ?? [])].sort(),
    [...(user.calendarDepartmentIds ?? [])].sort(),
    [...(user.leaderDepartmentIds ?? [])].sort(),
    [...(user.boardDepartmentIds ?? [])].sort(),
  ]);
}
