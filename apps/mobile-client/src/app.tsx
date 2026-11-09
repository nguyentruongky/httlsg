import { ScheduleManager } from "./schedules/schedule-manager";
import { MyAssignments } from "./schedules/my-assignments";
import { PushEvent } from "./push-event";
import { TeamOtps, LeaderDenied } from "./team-otps";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Users, UserRound } from "lucide-react";
import {
  useWorkspace,
  useAuth,
  canOpenLeaderTeam,
  canOpenBoardTeam,
  isUserOnly,
  memberEventHash,
  isTeamScopedUser,
} from "@org/core";
import { Button, cn } from "@org/ui";
import { MemberDirectory } from "./member-directory";
import { MemberDetail } from "./member-detail";
function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
function useRoute() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash || "#/members",
    () => "#/members",
  );
}
const tabs = [
  { id: "members", label: "Danh sách", icon: Users },
  { id: "profile", label: "Cá nhân", icon: UserRound },
] as const;
export function App() {
  const { organizationId, setTab } = useWorkspace();
  const requestedRoute = useRoute();
  const auth = useAuth();
  const assigned = Boolean(auth?.user && isTeamScopedUser(auth.user));
  const profileOnly = Boolean(auth?.user && isUserOnly(auth.user));
  // Family profiles remain a drill-down from the personal profile, without a directory tab.
  const eventHash = memberEventHash(requestedRoute);
  const eventId = eventHash?.slice("#/events/".length);
  const schedulesRoute = requestedRoute === "#/schedules";
  const assignmentsRoute = requestedRoute === "#/assignments";
  const route =
    profileOnly &&
    !eventId &&
    !schedulesRoute &&
    !assignmentsRoute &&
    !requestedRoute.startsWith("#/members/")
      ? "#/profile"
      : requestedRoute;
  useEffect(() => {
    if (requestedRoute !== route) {
      window.history.replaceState(window.history.state, "", route);
      window.dispatchEvent(new Event("hashchange"));
    }
  }, [requestedRoute, route]);
  const profile = route === "#/profile";
  const teamRole = route.startsWith("#/board/") ? "board" : "leader";
  const teamDirectory = route === `#/${teamRole}/members`;
  const teamOtps = route === "#/leader/otps" || route === "#/board/otps";
  const teamMemberId = route.startsWith(`#/${teamRole}/members/`)
    ? route.slice(`#/${teamRole}/members/`.length)
    : undefined;
  const teamAllowed = Boolean(
    auth?.user &&
    (teamRole === "board"
      ? canOpenBoardTeam(auth.user)
      : canOpenLeaderTeam(auth.user)),
  );
  const memberId = route.startsWith("#/members/")
    ? route.slice("#/members/".length)
    : teamMemberId;
  const directory = route === "#/members" || route === "#/" || route === "#";
  const valid =
    directory ||
    profile ||
    Boolean(memberId) ||
    Boolean(eventId) ||
    schedulesRoute ||
    assignmentsRoute ||
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
      profile || teamDirectory || teamOtps || teamMemberId
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
              : profileOnly
                ? "px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]"
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
          {assignmentsRoute && <MyAssignments />}
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
                <a href="#/members">Về danh sách</a>
              </Button>
            </div>
          )}
        </main>
        {!profileOnly &&
          !memberId &&
          !eventId &&
          !schedulesRoute &&
          !assignmentsRoute && (
            <nav
              aria-label="Điều hướng thành viên"
              className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-md -translate-x-1/2 items-start border-x border-t border-border/40 bg-background/80 px-5 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md"
            >
              {tabs.map(({ id, label, icon: Icon }) => {
                const inProfile =
                  profile || teamDirectory || teamOtps || Boolean(teamMemberId);
                const active = id === "profile" ? inProfile : !inProfile;
                return (
                  <a
                    key={id}
                    href={`#/${id}`}
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
