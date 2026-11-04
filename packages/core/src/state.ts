import { create } from "zustand";
import { orgs } from "./demo";
export type Tab = "members" | "profile";
export const useWorkspace = create<{
  organizationId: string;
  tab: Tab;
  setOrganization: (id: string) => void;
  setTab: (tab: Tab) => void;
}>((set) => ({
  organizationId: orgs[0].id,
  tab: "members",
  setOrganization: (organizationId) => set({ organizationId, tab: "members" }),
  setTab: (tab) => set({ tab }),
}));
