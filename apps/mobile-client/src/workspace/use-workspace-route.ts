import { matchWorkspaceRoute, resolveWorkspacePath } from "./workspace-route";
import { useEffect } from "react";
import {
  hasDashboard,
  electionAccess,
  isElectionScrutineer,
  canViewSchedules,
  hasFullMemberAccess,
  isTeamScopedUser,
  useAuth,
  useWorkspace,
} from "@org/core";
import {
  useClientRoute,
  useClientSearch,
  navigateClient,
} from "../client-router";

export function useWorkspaceRoute() {
  const requestedRoute = useClientRoute();
  const search = useClientSearch();
  const auth = useAuth();
  const user = auth?.user;
  const organizationId = useWorkspace((state) => state.organizationId);
  const administrator = Boolean(user && hasDashboard(user.role));
  const settingsAccess = Boolean(user);
  const fullMembers = hasFullMemberAccess(user);
  const assigned = Boolean(user && isTeamScopedUser(user));
  const hasCalendar = fullMembers || Boolean(auth?.navigation.hasAssignments);
  const scrutineerUser = Boolean(user && isElectionScrutineer(user));
  const home = scrutineerUser
    ? "/client/elections"
    : hasCalendar
      ? "/client/calendar"
      : "/client/members";
  const route = resolveWorkspacePath(requestedRoute, scrutineerUser, home);
  useEffect(() => {
    if (window.location.pathname !== route)
      navigateClient(route + search, true);
  }, [route, search]);

  return {
    route,
    search,
    administrator,
    settingsAccess,
    hasElectionAssignments: Boolean(user?.hasElectionAssignments),
    fullMembers,
    assigned,
    hasCalendar,
    home,
    organizationId,
    scheduleAccess: canViewSchedules(user),
    ...matchWorkspaceRoute(route),
  };
}
export type WorkspaceRoute = ReturnType<typeof useWorkspaceRoute>;
