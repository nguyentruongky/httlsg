import { Suspense, useEffect, useLayoutEffect, useRef } from "react";
import {
  Building2,
  CalendarDays,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import {
  canCalendar,
  hasDashboard,
  hasFullMemberAccess,
  isTeamScopedUser,
  useAuth,
  useWorkspace,
} from "@org/core";
import { Button, cn } from "@org/ui";
import { MemberDetail } from "./member-detail";
import { DepartmentManagement } from "./department-management";
import { DepartmentDetail } from "./department-detail";
import { CalendarPage } from "./calendar/calendar-page";
import { MyAssignments } from "./schedules/my-assignments";
import { ApplicationSettings } from "./application-settings";
import { MemberDirectory } from "./member-directory";
import {
  useClientRoute,
  useClientSearch,
  navigateClient,
  isHistoryNavigation,
  restoreNavigationScroll,
} from "./client-router";
import {
  notifiedScheduleModule,
  scheduleModule,
  scheduleLeadersModule,
  eventModule,
  worshipModule,
} from "./route-modules";
const NotifiedSchedule = notifiedScheduleModule.Component;
const ScheduleManager = scheduleModule.Component;
const ScheduleLeaders = scheduleLeadersModule.Component;
const PushEvent = eventModule.Component;
const WorshipViberDraftPage = worshipModule.Component;

export function App() {
  const requestedRoute = useClientRoute();
  const search = useClientSearch();
  const auth = useAuth();
  const user = auth?.user;
  const { organizationId, setTab } = useWorkspace();
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
      "/client/otps",
      "/client/church-status-report",
    ].includes(route);
  const eventId = /^\/client\/events\/([^/]+)$/.exec(route)?.[1];
  const worshipId = /^\/worship-viber\/([^/]+)$/.exec(route)?.[1];
  const listLayout = directory || departments || Boolean(departmentId);
  const fixedLayout = listLayout && !memberId;
  const retainedDirectory = useRef(false);
  if (directory || memberId) retainedDirectory.current = true;
  const directoryScroll = useRef<HTMLDivElement>(null);
  const previous = useRef(route);
  useLayoutEffect(() => {
    setTab(
      calendar ||
        assignments ||
        schedules ||
        assignmentId ||
        scheduleId ||
        eventId
        ? "calendar"
        : departments || departmentId
          ? "departments"
          : settings
            ? "settings"
            : profile
              ? "profile"
              : "members",
    );
    if (previous.current !== route) {
      if (isHistoryNavigation()) restoreNavigationScroll();
      else {
        window.scrollTo({ top: 0, behavior: "instant" });
        document
          .getElementById("mobile-content")
          ?.scrollTo({ top: 0, behavior: "instant" });
      }
      previous.current = route;
    }
  }, [
    route,
    calendar,
    assignments,
    schedules,
    assignmentId,
    scheduleId,
    eventId,
    departments,
    departmentId,
    settings,
    profile,
    setTab,
  ]);
  const tabs = [
    ...(hasCalendar
      ? [{ id: "calendar", label: "Lịch", icon: CalendarDays }]
      : []),
    { id: "members", label: "Danh sách", icon: Users },
    { id: "departments", label: "Ban ngành", icon: Building2 },
    administrator
      ? { id: "settings", label: "Cài đặt", icon: Settings }
      : { id: "profile", label: "Cá nhân", icon: UserRound },
  ];
  const valid =
    directory ||
    memberId ||
    profile ||
    calendar ||
    assignments ||
    assignmentId ||
    departments ||
    departmentId ||
    schedules ||
    scheduleId ||
    scheduleLeaders ||
    settings ||
    eventId ||
    worshipId;
  return (
    <div
      data-directory-active={fixedLayout}
      className={cn(
        "mobile-client bg-muted/50",
        fixedLayout ? "h-dvh overflow-hidden" : "min-h-dvh",
      )}
    >
      <div
        className={cn(
          "relative mx-auto max-w-7xl border-x bg-background",
          fixedLayout ? "h-dvh overflow-hidden" : "min-h-dvh",
        )}
      >
        <main
          id="mobile-content"
          data-scroll-restoration="mobile-content"
          className={
            directory
              ? "h-[calc(100dvh-var(--mobile-tabbar-height))] overflow-hidden"
              : fixedLayout
                ? "h-[calc(100dvh-var(--mobile-tabbar-height))] overflow-hidden px-5 pt-[max(1rem,env(safe-area-inset-top))]"
                : "px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[var(--navigation-bottom-padding)] max-lg:h-dvh max-lg:overflow-y-auto max-lg:overscroll-contain"
          }
        >
          <Suspense fallback={null}>
            {retainedDirectory.current && (
              <div
                hidden={!directory}
                className={directory ? "h-full" : "hidden"}
              >
                <MemberDirectory
                  org={organizationId}
                  active={directory}
                  assigned={assigned}
                  scrollRef={directoryScroll}
                  onOpen={() => {}}
                />
              </div>
            )}
            {(memberId || profile) && (
              <MemberDetail
                key={`${organizationId}-${memberId ?? "profile"}`}
                org={organizationId}
                memberId={memberId}
                profile={profile}
              />
            )}
            {departments && <DepartmentManagement fixedViewport />}
            {departmentId && (
              <DepartmentDetail id={departmentId} fixedViewport />
            )}
            {(calendar || assignments) &&
              (hasCalendar ? (
                fullMembers && calendar ? (
                  <CalendarPage />
                ) : (
                  <MyAssignments />
                )
              ) : (
                <p role="alert">
                  Bạn chưa có phân công công tác hoặc tiếp tân.
                </p>
              ))}
            {assignmentId && <NotifiedSchedule id={assignmentId} assigned />}
            {scheduleId && <NotifiedSchedule id={scheduleId} />}
            {schedules &&
              (fullMembers ? (
                <ScheduleManager
                  member
                  returnHref="/client/calendar"
                  initialCreate={
                    administrator &&
                    new URLSearchParams(search).get("create") === "1"
                  }
                />
              ) : (
                <MyAssignments />
              ))}
            {scheduleLeaders &&
              (administrator ? (
                <ScheduleLeaders />
              ) : (
                <p role="alert">Bạn không có quyền quản lý lịch công tác.</p>
              ))}
            {settings &&
              (administrator ? (
                <ApplicationSettings />
              ) : (
                <p role="alert">
                  Bạn không có quyền truy cập cài đặt quản trị.
                </p>
              ))}
            {eventId && <PushEvent id={eventId} />}
            {worshipId && <WorshipViberDraftPage requestId={worshipId} />}
            {!valid && (
              <div className="space-y-4 py-10 text-center">
                <h1 className="text-xl font-semibold">Không tìm thấy trang</h1>
                <Button asChild variant="outline">
                  <a href={home}>Về trang chính</a>
                </Button>
              </div>
            )}
          </Suspense>
        </main>
        <nav
          data-bottom-tabs
          aria-label="Điều hướng chính"
          className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-7xl -translate-x-1/2 items-start border-x border-t border-border/40 bg-background px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2"
        >
          {tabs.map(({ id, label, icon: Icon }) => {
            const active =
              id === "calendar"
                ? calendar ||
                  assignments ||
                  schedules ||
                  Boolean(assignmentId || scheduleId || eventId || worshipId)
                : id === "members"
                  ? directory || Boolean(memberId)
                  : id === "departments"
                    ? departments || Boolean(departmentId)
                    : id === "settings"
                      ? settings || profile
                      : profile;
            return (
              <a
                key={id}
                href={`/client/${id}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon size={23} strokeWidth={active ? 2.2 : 1.6} />
                <span className="text-xs font-medium">{label}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
