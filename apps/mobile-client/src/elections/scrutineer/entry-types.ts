import type { AuthUser } from "@org/core";
export type EntryProps = {
  round: any;
  user: AuthUser;
  run: (fn: () => Promise<unknown>) => Promise<void>;
  standalone?: boolean;
};
