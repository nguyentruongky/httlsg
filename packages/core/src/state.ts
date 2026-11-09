import { create } from "zustand";
import { orgs } from "./demo";
export type Tab = "assignments" | "members" | "notifications" | "profile";
export const useWorkspace = create<{
  organizationId: string;
  tab: Tab;
  setOrganization: (id: string) => void;
  setTab: (tab: Tab) => void;
}>((set) => ({
  organizationId: orgs[0].id,
  tab: "assignments",
  setOrganization: (organizationId) =>
    set({ organizationId, tab: "assignments" }),
  setTab: (tab) => set({ tab }),
}));
