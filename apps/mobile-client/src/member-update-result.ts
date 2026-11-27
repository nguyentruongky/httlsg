import type { DirectoryMember } from "@org/core";
import type { AssignedMember } from "./personnel/types";

export type MemberUpdateResult = {
  ok: boolean;
  member: DirectoryMember;
  personnel: AssignedMember | null;
};
