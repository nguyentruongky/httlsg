import type { AuthUser } from "./auth-contract";
export type AuthBootstrap = {
  user: AuthUser;
  departments: { id: string; name: string }[];
  navigation: { hasAssignments: boolean };
};
