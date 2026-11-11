import { useClientRoute, navigateClient } from "./client-router";
import { ScheduleManager } from "./schedules/schedule-manager";
import { AdminSchedule } from "./schedules/admin-schedule";
import { MyAssignments } from "./schedules/my-assignments";
import { NotifiedSchedule } from "./schedules/notified-schedule";
import { Notifications } from "./notifications";
import { PushEvent } from "./push-event";
import { TeamOtps, LeaderDenied } from "./team-otps";
import { useEffect, useRef } from "react";
import { Bell, CalendarDays, Users, UserRound } from "lucide-react";
import {
  useWorkspace,
  useAuth,
  canOpenLeaderTeam,
  canOpenBoardTeam,
  isUserOnly,
  memberEventPath,
  isTeamScopedUser,
  apiRequest,
} from "@org/core";
import { useQuery } from "@tanstack/react-query";
import { Button, cn } from "@org/ui";
import { MemberDirectory } from "./member-directory";
import { MemberDetail } from "./member-detail";
const tabs = [
  { id: "assignments", label: "Lịch phục vụ", icon: CalendarDays },
  { id: "members", label: "Danh sách", icon: Users },
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "profile", label: "Cá nhân", icon: UserRound },
] as const;
export function App() {
  const { organizationId, setTab } = useWorkspace();
  const requestedRoute = useClientRoute();
  const auth = useAuth();
  const assigned = Boolean(auth?.user && isTeamScopedUser(auth.user));
  const profileOnly = Boolean(auth?.user && isUserOnly(auth.user));
  const assignmentsQuery = useQuery({
    queryKey: ["my-assignments", auth?.user?.id],
    enabled: Boolean(auth?.user),
    queryFn: () =>
      apiRequest<{ items: unknown[]; nextPage: number | null }>(
        "/api/my-assignments?view=all&page=1",
      ),
    select: (data) => (data.items ?? []).length > 0,
  });
  const hasAssignments = assignmentsQuery.data ?? false;
  const eventPath = memberEventPath(requestedRoute);
  const eventId = eventPath?.slice("/client/events/".length);
  const schedulesRoute = requestedRoute === "/client/schedules";
  const notifiedScheduleId =
    /^\/client\/notifications\/schedules\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(
      requestedRoute,
    )?.[1];
  const notificationsRoute =
    requestedRoute === "/client/notifications" || Boolean(notifiedScheduleId);
  const visibleTabs = tabs.filter(
    (t) => t.id !== "assignments" || hasAssignments,
  );
  const assignedScheduleId =
    /^\/client\/assignments\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(
      requestedRoute,
    )?.[1];
  const assignmentsRoute =
    requestedRoute === "/client/assignments" || Boolean(assignedScheduleId);
  const route =
    profileOnly &&
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
  const directory = route === "/client/members";
  const valid =
    directory ||
    profile ||
    Boolean(memberId) ||
    Boolean(eventId) ||
    schedulesRoute ||
    assignmentsRoute ||
    notificationsRoute ||
    teamDirectory ||
    teamOtps;
  const scrollLayout = directory || (teamDirectory && teamAllowed);
  const scroll = useRef(0),
    teamScroll = useRef(0);
  const teamScrollRef = useRef<HTMLDivElement>(null);
  const directoryScroll = useRef<HTMLDivElement>(null);
  const previous = useRef(route);
  useEffect(() => {
    setTab(
      assignmentsRoute
        ? "assignments"
        : notificationsRoute
          ? "notifications"
          : profile || teamDirectory || teamOtps || teamMemberId
            ? "profile"
            : "members",
    );
    if (previous.current !== route) {
      window.scrollTo({
        top: 0,
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
    notificationsRoute,
    directory,
    profile,
    teamDirectory,
    teamOtps,
    teamMemberId,
    setTab,
  ]);
  function rememberScroll() {
    if (directory) scroll.current = directoryScroll.current?.scrollTop ?? 0;
    if (teamDirectory)
      teamScroll.current = teamScrollRef.current?.scrollTop ?? 0;
  }
  return (
    <div
      data-directory-active={scrollLayout}
      className={cn(
        "mobile-client bg-muted/50",
        scrollLayout ? "h-dvh overflow-hidden" : "min-h-dvh",
      )}
    >
      <div
        className={cn(
          "relative mx-auto max-w-md border-x bg-background shadow-sm",
          scrollLayout ? "h-dvh overflow-hidden" : "min-h-dvh",
        )}
      >
        <main
          id="mobile-content"
          className={
            scrollLayout
              ? "h-[calc(100dvh_-_var(--mobile-tabbar-height))] overflow-hidden"
              : "px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(7rem_+_env(safe-area-inset-bottom))]"
          }
        >
          {!profileOnly && (
            <div key={organizationId} hidden={!directory} className="h-full">
              <MemberDirectory
                org={organizationId}
                active={directory}
                onOpen={rememberScroll}
                scrollRef={directoryScroll}
                assigned={assigned}
              />
            </div>
          )}
          {teamAllowed && (
            <div
              key={`team-${teamRole}-${organizationId}`}
              hidden={!teamDirectory}
              className="h-full"
            >
              <MemberDirectory
                org={organizationId}
                active={teamDirectory}
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
          {schedulesRoute && <ScheduleManager member />}
          {assignmentsRoute &&
            (assignedScheduleId ? (
              <NotifiedSchedule id={assignedScheduleId} assigned />
            ) : auth?.user?.role === "admin" ? (
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
              className="page-enter"
            >
              <MemberDetail
                org={organizationId}
                memberId={memberId}
                team={
                  teamMemberId ? (teamRole === "board" ? "board" : true) : false
                }
              />
            </div>
          )}
          {profile && (
            <div key={`profile-${organizationId}`} className="page-enter">
              <MemberDetail org={organizationId} profile />
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
        {!memberId && !eventId && !schedulesRoute && (
          <nav
            aria-label=""
            className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-md -translate-x-1/2 items-start border-x border-t border-border/40 bg-background/80 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md"
          >
            {visibleTabs.map(({ id, label, icon: Icon }) => {
              const inProfile =
                profile || teamDirectory || teamOtps || Boolean(teamMemberId);
              const active =
                id === "profile"
                  ? inProfile
                  : id === "assignments"
                    ? assignmentsRoute
                    : id === "notifications"
                      ? notificationsRoute
                      : directory;
              return (
                <a
                  key={id}
                  href={`/client/${id}`}
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
  );
}
