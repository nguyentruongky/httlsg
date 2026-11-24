/** Pure URL rules. Session permissions and navigation effects belong in the hook. */
export function resolveWorkspacePath(
  requestedRoute: string,
  scrutineerUser: boolean,
  home: string,
) {
  return scrutineerUser && requestedRoute.startsWith("/client/admin/elections")
    ? "/client/elections"
    : requestedRoute === "/client/elections" && !scrutineerUser
      ? "/client/admin/elections"
      : requestedRoute === "/client/home"
        ? home
        : requestedRoute;
}

export function matchWorkspaceRoute(route: string) {
  const scrutineerRoute =
    /^\/client\/(?:elections|election-rounds)(?:\/(\d+))?$/.exec(route);
  const scrutineer = Boolean(scrutineerRoute);
  const scrutineerRoundId = route.startsWith("/client/election-rounds")
    ? scrutineerRoute?.[1]
    : undefined;
  const scrutineerElectionId = route.startsWith("/client/elections")
    ? scrutineerRoute?.[1]
    : undefined;
  const elections = route === "/client/admin/elections";
  const electionId = /^\/client\/admin\/elections\/([^/]+)$/.exec(route)?.[1];
  const directory = route === "/client/members";
  const memberId = /^\/client\/members\/([^/]+)$/.exec(route)?.[1];
  const profile = route === "/client/profile";
  const calendar = route === "/client/calendar";
  const publicWorship = route === "/worship" || route === "/client/worship";
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
    !elections &&
    (route === "/client/settings" ||
      route.startsWith("/client/admin/") ||
      [
        "/client/calendar/email-groups",
        "/client/activity",
        "/client/church-status-report",
      ].includes(route));
  const eventId = /^\/client\/events\/([^/]+)$/.exec(route)?.[1];
  const worshipId = /^\/worship-viber\/([^/]+)$/.exec(route)?.[1];
  const valid =
    scrutineer ||
    elections ||
    electionId ||
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
    scrutineer,
    scrutineerRoundId,
    scrutineerElectionId,
    elections,
    electionId,
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
