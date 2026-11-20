import { useEffect } from "react";
import {
  hasDashboard,
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
  const fullMembers = hasFullMemberAccess(user);
  const assigned = Boolean(user && isTeamScopedUser(user));
  const hasCalendar = fullMembers || Boolean(auth?.navigation.hasAssignments);
  const home = hasCalendar ? "/client/calendar" : "/client/members";
  const route = requestedRoute === "/client/home" ? home : requestedRoute;
  useEffect(() => {
    if (window.location.pathname !== route)
      navigateClient(route + search, true);
  }, [route, search]);
  const directory = route === "/client/members";
  const memberId = /^\/client\/members\/([^/]+)$/.exec(route)?.[1];
  const profile = route === "/client/profile";
  const calendar = route === "/client/calendar";
  const publicWorship =
    route === "/worship" || route === "/client/worship";
  const worshipReview = route === "/client/worship-review";
  const calendarContributions = route === "/client/calendar-contributions";
  const assignments = route === "/client/assignments";
  const assignmentId =
    /^\/client\/(?:assignments|notifications\/schedules)\/([^/]+)$/.exec(
      route,
    )?.[1];
  const departments = route === "/client/departments";
  const departmentId = /^\/client\/departments\/([^/]+)$/.exec(route)?.[1];
  const schedules = route === "/client/schedules";
  const scheduleId = /^\/client\/schedules\/([^/]+)$/.exec(route)?.[1];
  const scheduleLeaders = route === "/client/schedule-leaders";
  const settings =
    route === "/client/settings" ||
    route.startsWith("/client/admin/") ||
    [
      "/client/calendar/email-groups",
      "/client/activity",
      "/client/church-status-report",
    ].includes(route);
  const eventId = /^\/client\/events\/([^/]+)$/.exec(route)?.[1];
  const worshipId = /^\/worship-viber\/([^/]+)$/.exec(route)?.[1];
  const valid =
    directory ||
    memberId ||
    profile ||
    calendar ||
    publicWorship ||
    assignments ||
    assignmentId ||
    departments ||
    departmentId ||
    schedules ||
    scheduleId ||
    scheduleLeaders ||
    settings ||
    eventId ||
    worshipId ||
    worshipReview ||
    calendarContributions;

  return {
    route,
    search,
    administrator,
    fullMembers,
    assigned,
    hasCalendar,
    home,
    organizationId,
    directory,
    memberId,
    profile,
    calendar,
    publicWorship,
    assignments,
    assignmentId,
    departments,
    departmentId,
    schedules,
    scheduleAccess: canViewSchedules(user),
    scheduleId,
    scheduleLeaders,
    settings,
    eventId,
    worshipId,
    worshipReview,
    calendarContributions,
    valid,
    fixedLayout:
      (directory || departments || Boolean(departmentId)) && !memberId,
  };
}
export type WorkspaceRoute = ReturnType<typeof useWorkspaceRoute>;
