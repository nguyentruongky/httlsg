import {
  scheduleModule,
  adminScheduleModule,
  assignmentsModule,
  notifiedScheduleModule,
  notificationsModule,
  eventModule,
  directoryModule,
  memberDetailModule,
  adminShellModule,
  membersModule,
  roleMembersModule,
  roleSettingsModule,
  departmentsModule,
  departmentDetailModule,
  calendarModule,
  emailGroupsModule,
  worshipModule,
  settingsModule,
  leaderOtpModule,
  scheduleLeadersModule,
  teamOtpModule,
} from "./route-modules";
import {
  useClientRoute,
  useClientSearch,
  navigateClient,
  isNativeHistoryNavigation,
} from "./client-router";
const TeamOtps = teamOtpModule.Component;
function LeaderDenied({ board }: { board?: boolean }) {
  return <p role="alert">Bạn không có quyền xem Ban ngành này.</p>;
}
import { Suspense, useEffect, useLayoutEffect, useRef } from "react";
import { Bell, CalendarDays, Users, UserRound } from "lucide-react";
import {
  useWorkspace,
  useAuth,
  canOpenLeaderTeam,
  canOpenBoardTeam,
  isUserOnly,
  memberEventPath,
  isTeamScopedUser,
  canCalendar,
} from "@org/core";
import { Button, cn } from "@org/ui";
const ScheduleManager = scheduleModule.Component;
const AdminSchedule = adminScheduleModule.Component;
const MyAssignments = assignmentsModule.Component;
const NotifiedSchedule = notifiedScheduleModule.Component;
const Notifications = notificationsModule.Component;
const PushEvent = eventModule.Component;
const MemberDirectory = directoryModule.Component;
const MemberDetail = memberDetailModule.Component;
const AdminShell = adminShellModule.Component;
const MembersPage = membersModule.Component;
const RoleMembers = roleMembersModule.Component;
const RolePermissionSettings = roleSettingsModule.Component;
const DepartmentManagement = departmentsModule.Component;
const DepartmentDetail = departmentDetailModule.Component;
const CalendarPage = calendarModule.Component;
const EmailGroupsPage = emailGroupsModule.Component;
const WorshipViberDraftPage = worshipModule.Component;
const ApplicationSettings = settingsModule.Component;
const LeaderOtpConsole = leaderOtpModule.Component;
const ScheduleLeaders = scheduleLeadersModule.Component;
export function App() {
  const { organizationId, setTab } = useWorkspace();
  const requestedRoute = useClientRoute();
  const search = useClientSearch();
  const auth = useAuth();
  const assigned = Boolean(auth?.user && isTeamScopedUser(auth.user));
  const departmentCalendar = Boolean(
    auth?.user?.calendarDepartmentIds?.some((id) =>
      ["am-nhac", "truyen-thong"].includes(id),
    ),
  );
  const deaconCalendar = Boolean(
    auth?.user &&
    (auth.user.role === "deacon" || auth.user.roles?.includes("deacon")),
  );
  const fullCalendar = Boolean(auth?.user && canCalendar(auth.user));
  const scopedCalendar = deaconCalendar || departmentCalendar;
  const calendarHome = fullCalendar || scopedCalendar;
  const userOnly = Boolean(auth?.user && isUserOnly(auth.user));
  const profileOnly = userOnly && !departmentCalendar;
  const directoryAllowed = Boolean(auth?.user && !userOnly);
  const hasAssignments = auth?.navigation.hasAssignments ?? false;
  const calendarOnlyScheduleNavigation = ["admin", "secretary"].includes(
    auth?.user?.role ?? "",
  );
  const tabs = [
    ...(calendarHome
      ? [{ id: "calendar", label: "Lịch", icon: CalendarDays }]
      : []),
    ...(directoryAllowed
      ? [{ id: "members", label: "Danh sách", icon: Users }]
      : []),
    ...(!calendarOnlyScheduleNavigation && !scopedCalendar && hasAssignments
      ? [{ id: "assignments", label: "Lịch phục vụ", icon: CalendarDays }]
      : []),
    { id: "notifications", label: "Thông báo", icon: Bell },
    { id: "profile", label: "Cá nhân", icon: UserRound },
  ];
  const homeRoute = requestedRoute === "/client/home";
  const homeTarget = profileOnly
    ? "/client/profile"
    : calendarHome
      ? "/client/calendar"
      : "/client/members";
  const eventPath = memberEventPath(requestedRoute);
  const eventId = eventPath?.slice("/client/events/".length);
  const worshipViberRequestId = /^\/worship-viber\/([^/]+)$/.exec(
    requestedRoute,
  )?.[1];
  const schedulesRoute = requestedRoute === "/client/schedules";
  const notifiedScheduleId =
    /^\/client\/notifications\/schedules\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(
      requestedRoute,
    )?.[1];
  const notificationsRoute =
    requestedRoute === "/client/notifications" || Boolean(notifiedScheduleId);
  const visibleTabs = tabs;
  const assignedScheduleId =
    /^\/client\/assignments\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(
      requestedRoute,
    )?.[1];
  const assignmentsRoute =
    requestedRoute === "/client/assignments" || Boolean(assignedScheduleId);
  const route = homeRoute
    ? homeTarget
    : profileOnly &&
        !eventId &&
        !schedulesRoute &&
        !assignmentsRoute &&
        !notificationsRoute &&
        !requestedRoute.startsWith("/client/members/")
      ? "/client/profile"
      : requestedRoute;
  useEffect(() => {
    if (requestedRoute !== route) {
      navigateClient(route, true);
    }
  }, [requestedRoute, route]);
  const profile = route === "/client/profile";
  const teamRole = route.startsWith("/client/board/") ? "board" : "leader";
  const teamDirectory = route === `/client/${teamRole}/members`;
  const teamOtps =
    route === "/client/leader/otps" || route === "/client/board/otps";
  const teamMemberId = route.startsWith(`/client/${teamRole}/members/`)
    ? route.slice(`/client/${teamRole}/members/`.length)
    : undefined;
  const teamAllowed = Boolean(
    auth?.user &&
    (teamRole === "board"
      ? canOpenBoardTeam(auth.user)
      : canOpenLeaderTeam(auth.user)),
  );
  const memberId = route.startsWith("/client/members/")
    ? route.slice("/client/members/".length)
    : teamMemberId;
  const adminMemberOrigin =
    window.matchMedia("(max-width: 1023px)").matches &&
    memberId &&
    !teamMemberId &&
    ["/dashboard/members", "/dashboard/admin/roles/members"].includes(
      window.history.state?.memberReturnHref,
    )
      ? (window.history.state.memberReturnHref as string)
      : undefined;
  const directory = route === "/client/members" && directoryAllowed;
  const calendarRoute = route === "/client/calendar" && calendarHome;
  const dashboard = route.startsWith("/dashboard");
  const dashboardMembers = route === "/dashboard/members";
  const dashboardRolesMembers = route === "/dashboard/admin/roles/members";
  const dashboardRolesSettings = route === "/dashboard/admin/roles/settings";
  const dashboardDepartments = route === "/dashboard/departments";
  const dashboardDepartmentDetail = route.startsWith("/dashboard/departments/");
  const dashboardCalendar = route === "/dashboard/calendar";
  const dashboardMySchedule = route === "/dashboard/calendar/my-schedule";
  const dashboardEmailGroups = route === "/dashboard/calendar/email-groups";
  const dashboardSchedules = route === "/dashboard/schedules";
  const dashboardScheduleLeaders = route === "/dashboard/schedule-leaders";
  const dashboardLeaderOtp = route === "/dashboard/leader-otp";
  const dashboardBoardOtp = route === "/dashboard/board-otp";
  const dashboardActivity = route === "/dashboard/activity";
  const dashboardOtps = route === "/dashboard/otps";
  const dashboardSettings = route === "/dashboard/settings";
  const dashboardChurchStatusReport =
    route === "/dashboard/church-status-report";
  const dashboardSettingsAny =
    dashboardActivity ||
    dashboardOtps ||
    dashboardSettings ||
    dashboardChurchStatusReport;
  const valid =
    directory ||
    calendarRoute ||
    profile ||
    Boolean(memberId) ||
    Boolean(eventId) ||
    Boolean(worshipViberRequestId) ||
    schedulesRoute ||
    assignmentsRoute ||
    notificationsRoute ||
    teamDirectory ||
    teamOtps ||
    (dashboard &&
      (dashboardMembers ||
        dashboardRolesMembers ||
        dashboardRolesSettings ||
        dashboardDepartments ||
        dashboardDepartmentDetail ||
        dashboardCalendar ||
        dashboardMySchedule ||
        dashboardEmailGroups ||
        dashboardSchedules ||
        dashboardScheduleLeaders ||
        dashboardLeaderOtp ||
        dashboardBoardOtp ||
        dashboardActivity ||
        dashboardOtps ||
        dashboardChurchStatusReport ||
        dashboardSettings));
  const scrollLayout = directory || (teamDirectory && teamAllowed);
  const scroll = useRef(0),
    teamScroll = useRef(0);
  const teamScrollRef = useRef<HTMLDivElement>(null);
  const directoryScroll = useRef<HTMLDivElement>(null);
  const previous = useRef(route);
  useLayoutEffect(() => {
    setTab(
      assignmentsRoute
        ? calendarOnlyScheduleNavigation
          ? "calendar"
          : "assignments"
        : calendarRoute
          ? "calendar"
          : notificationsRoute
            ? "notifications"
            : profile || teamDirectory || teamOtps || teamMemberId
              ? "profile"
              : "members",
    );
    if (previous.current !== route) {
      window.scrollTo({
        top: isNativeHistoryNavigation()
          ? (window.history.state?.navigationScroll ?? 0)
          : 0,
        behavior: "instant",
      });
      if (directory && directoryScroll.current)
        directoryScroll.current.scrollTop = scroll.current;
      if (teamDirectory && teamScrollRef.current)
        teamScrollRef.current.scrollTop = teamScroll.current;
      previous.current = route;
    }
  }, [
    route,
    assignmentsRoute,
    calendarRoute,
    calendarOnlyScheduleNavigation,
    notificationsRoute,
    directory,
    profile,
    teamDirectory,
    teamOtps,
    teamMemberId,
    setTab,
  ]);
  const retainedDirectories = useRef({ directory: false, team: false });
  if (directory || (memberId && !teamMemberId && !adminMemberOrigin))
    retainedDirectories.current.directory = true;
  if (teamDirectory || teamMemberId) retainedDirectories.current.team = true;
  function rememberScroll() {
    if (directory) scroll.current = directoryScroll.current?.scrollTop ?? 0;
    if (teamDirectory)
      teamScroll.current = teamScrollRef.current?.scrollTop ?? 0;
  }
  return (
    <Suspense
      fallback={
        <p role="status" className="p-5">
          Đang tải trang…
        </p>
      }
    >
      <div
        data-directory-active={!dashboard && scrollLayout}
        className={cn(
          dashboard ? "min-h-dvh bg-background" : "mobile-client bg-muted/50",
          !dashboard && scrollLayout ? "h-dvh overflow-hidden" : "min-h-dvh",
        )}
      >
        <div
          className={cn(
            dashboard
              ? "min-h-dvh"
              : "relative mx-auto max-w-md border-x bg-background shadow-sm",
            !dashboard && scrollLayout ? "h-dvh overflow-hidden" : "min-h-dvh",
          )}
        >
          <main
            id="mobile-content"
            className={
              dashboard
                ? "min-h-dvh p-0"
                : scrollLayout
                  ? "h-[calc(100dvh-var(--mobile-tabbar-height))] overflow-hidden"
                  : "px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))]"
            }
          >
            {directoryAllowed && retainedDirectories.current.directory && (
              <div
                key={organizationId}
                hidden={
                  !directory &&
                  !(memberId && !teamMemberId && !adminMemberOrigin)
                }
                className={
                  memberId && !teamMemberId
                    ? "hidden"
                    : "h-full"
                }
              >
                <MemberDirectory
                  org={organizationId}
                  active={
                    directory ||
                    Boolean(memberId && !teamMemberId && !adminMemberOrigin)
                  }
                  onOpen={rememberScroll}
                  scrollRef={directoryScroll}
                  assigned={assigned}
                />
              </div>
            )}
            {teamAllowed && retainedDirectories.current.team && (
              <div
                key={`team-${teamRole}-${organizationId}`}
                hidden={!teamDirectory && !teamMemberId}
                className={
                  teamMemberId
                    ? "hidden"
                    : "h-full"
                }
              >
                <MemberDirectory
                  org={organizationId}
                  active={teamDirectory || Boolean(teamMemberId)}
                  onOpen={rememberScroll}
                  scrollRef={teamScrollRef}
                  team={teamRole === "board" ? "board" : true}
                />
              </div>
            )}
            {teamDirectory && !teamAllowed && (
              <LeaderDenied board={teamRole === "board"} />
            )}
            {teamOtps && <TeamOtps />}
            {eventId && <PushEvent id={eventId} />}
            {calendarRoute &&
              (fullCalendar ? <CalendarPage /> : <MyAssignments />)}
            {worshipViberRequestId && (
              <WorshipViberDraftPage requestId={worshipViberRequestId} />
            )}
            {schedulesRoute && <ScheduleManager member />}
            {assignmentsRoute &&
              (assignedScheduleId ? (
                <NotifiedSchedule id={assignedScheduleId} assigned />
              ) : ["admin", "deacon"].includes(auth?.user?.role ?? "") ? (
                <AdminSchedule />
              ) : (
                <MyAssignments />
              ))}
            {notificationsRoute &&
              (notifiedScheduleId ? (
                <NotifiedSchedule id={notifiedScheduleId} />
              ) : (
                <Notifications />
              ))}
            {memberId && (
              <div
                key={`${organizationId}-${memberId}-${Boolean(teamMemberId)}`}
                className="navigation-detail-pane min-w-0"
              >
                <MemberDetail
                  org={organizationId}
                  memberId={memberId}
                  team={
                    teamMemberId
                      ? teamRole === "board"
                        ? "board"
                        : true
                      : false
                  }
                />
              </div>
            )}
            {profile && (
              <div key={`profile-${organizationId}`} className="page-enter">
                <MemberDetail org={organizationId} profile />
              </div>
            )}
            {(dashboard || adminMemberOrigin) && (
              <div className={adminMemberOrigin ? "contents" : undefined}>
                <AdminShell
                  key={`${organizationId}:${auth?.user?.id}`}
                  contentHidden={Boolean(adminMemberOrigin)}
                >
                  {(dashboardMembers ||
                    adminMemberOrigin === "/dashboard/members") && (
                    <div hidden={!dashboardMembers}>
                      <MembersPage />
                    </div>
                  )}
                  {(dashboardRolesMembers ||
                    adminMemberOrigin === "/dashboard/admin/roles/members") && (
                    <div hidden={!dashboardRolesMembers}>
                      <RoleMembers />
                    </div>
                  )}
                  {dashboardRolesSettings && <RolePermissionSettings />}
                  {dashboardDepartments && <DepartmentManagement />}
                  {dashboardDepartmentDetail && (
                    <DepartmentDetail
                      id={route.slice("/dashboard/departments/".length)}
                    />
                  )}
                  {dashboardCalendar && <CalendarPage />}
                  {dashboardMySchedule &&
                    (auth?.user?.role === "secretary" ? (
                      <MyAssignments />
                    ) : (
                      <p role="alert">Bạn không có quyền truy cập.</p>
                    ))}
                  {dashboardEmailGroups && <EmailGroupsPage />}
                  {dashboardSchedules && (
                    <ScheduleManager
                      member
                      initialCreate={
                        new URLSearchParams(search).get("create") === "1"
                      }
                    />
                  )}
                  {dashboardScheduleLeaders && <ScheduleLeaders />}
                  {dashboardLeaderOtp && <LeaderOtpConsole />}
                  {dashboardBoardOtp && <LeaderOtpConsole />}
                  {dashboardSettingsAny && <ApplicationSettings />}
                </AdminShell>
              </div>
            )}
            {!valid && (
              <div className="space-y-4 py-10 text-center">
                <h1 className="text-xl font-semibold">Không tìm thấy trang</h1>
                <Button asChild variant="outline">
                  <a href="/client/members">Về danh sách</a>
                </Button>
              </div>
            )}
          </main>
          {!profileOnly && !adminMemberOrigin && !dashboard && (
            <nav
              data-bottom-tabs
              aria-label=""
              className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-md -translate-x-1/2 items-start border-x border-t border-border/40 bg-background/80 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md"
            >
              {visibleTabs.map(({ id, label, icon: Icon }) => {
                const inProfile =
                  profile ||
                  teamDirectory ||
                  teamOtps ||
                  Boolean(teamMemberId) ||
                  (schedulesRoute &&
                    !visibleTabs.some((tab) => tab.id === "assignments"));
                const active =
                  id === "profile"
                    ? inProfile
                    : id === "calendar"
                      ? calendarRoute ||
                        (assignmentsRoute && calendarOnlyScheduleNavigation) ||
                        Boolean(eventId) ||
                        Boolean(worshipViberRequestId)
                      : id === "assignments"
                        ? assignmentsRoute || schedulesRoute
                        : id === "notifications"
                          ? notificationsRoute
                          : directory || Boolean(memberId && !teamMemberId);
                return (
                  <a
                    key={id}
                    href={
                      id === "calendar" ? "/client/calendar" : `/client/${id}`
                    }
                    onClick={rememberScroll}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <Icon
                      size={23}
                      strokeWidth={active ? 2.2 : 1.6}
                      fill={active ? "currentColor" : "none"}
                      fillOpacity={0.1}
                    />
                    <span className="text-xs font-medium">{label}</span>
                    {active && (
                      <span className="absolute bottom-0 h-0.5 w-4 rounded-full bg-primary" />
                    )}
                  </a>
                );
              })}
            </nav>
          )}
        </div>
      </div>
    </Suspense>
  );
}
