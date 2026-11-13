import { createElement, type ComponentType, type ComponentProps } from "react";

export function deferred<T extends ComponentType<any>>(load: () => Promise<T>) {
  let component: T | undefined;
  let flight: Promise<void> | undefined;
  const preload = () =>
    (flight ??= load()
      .then((value) => {
        component = value;
      })
      .catch((error) => {
        flight = undefined;
        if (
          navigator.onLine &&
          /dynamically imported|loading chunk|module script|failed to fetch/i.test(
            String(error),
          )
        ) {
          const key = "church:chunk-reload:" + location.pathname;
          try {
            if (!sessionStorage.getItem(key)) {
              sessionStorage.setItem(key, "1");
              location.reload();
            }
          } catch {
            /* Let the error boundary offer retry. */
          }
        }
        throw error;
      }));
  function Component(props: ComponentProps<T>) {
    if (!component) throw preload();
    return createElement(component as ComponentType<any>, props);
  }
  return { Component, preload };
}
export const memberDetailModule = deferred(() =>
  import("./member-detail").then((m) => m.MemberDetail),
);
export const directoryModule = deferred(() =>
  import("./member-directory").then((m) => m.MemberDirectory),
);
export const membersModule = deferred(() =>
  import("./workspace-pages").then((m) => m.MembersPage),
);
export const roleMembersModule = deferred(() =>
  import("./role-members").then((m) => m.RoleMembers),
);
export const roleSettingsModule = deferred(() =>
  import("./role-permission-settings").then((m) => m.RolePermissionSettings),
);
export const departmentsModule = deferred(() =>
  import("./department-management").then((m) => m.DepartmentManagement),
);
export const departmentDetailModule = deferred(() =>
  import("./department-detail").then((m) => m.DepartmentDetail),
);
export const calendarModule = deferred(() =>
  import("./calendar/calendar-page").then((m) => m.CalendarPage),
);
export const emailGroupsModule = deferred(() =>
  import("./calendar/email-groups-page").then((m) => m.EmailGroupsPage),
);
export const worshipModule = deferred(() =>
  import("./calendar/worship-viber-draft-page").then(
    (m) => m.WorshipViberDraftPage,
  ),
);
export const settingsModule = deferred(() =>
  import("./application-settings").then((m) => m.ApplicationSettings),
);
export const leaderOtpModule = deferred(() =>
  import("./leader-otp-console").then((m) => m.LeaderOtpConsole),
);
export const scheduleLeadersModule = deferred(() =>
  import("./schedule-leaders").then((m) => m.ScheduleLeaders),
);
export const scheduleModule = deferred(() =>
  import("./schedules/schedule-manager").then((m) => m.ScheduleManager),
);
export const adminScheduleModule = deferred(() =>
  import("./schedules/admin-schedule").then((m) => m.AdminSchedule),
);
export const assignmentsModule = deferred(() =>
  import("./schedules/my-assignments").then((m) => m.MyAssignments),
);
export const notifiedScheduleModule = deferred(() =>
  import("./schedules/notified-schedule").then((m) => m.NotifiedSchedule),
);
export const notificationsModule = deferred(() =>
  import("./notifications").then((m) => m.Notifications),
);
export const eventModule = deferred(() =>
  import("./push-event").then((m) => m.PushEvent),
);
export const teamOtpModule = deferred(() =>
  import("./team-otps").then((m) => m.TeamOtps),
);
export const adminShellModule = deferred(() =>
  import("./admin-shell").then((m) => m.AdminShell),
);

export async function preloadRoute(value: string) {
  const url = new URL(value, location.href);
  const path = url.pathname;
  const modules: { preload: () => Promise<void> }[] = [];
  if (path.startsWith("/dashboard")) modules.push(adminShellModule);
  if (path === "/dashboard/members") modules.push(membersModule);
  else if (path === "/dashboard/admin/roles/members")
    modules.push(roleMembersModule);
  else if (path === "/dashboard/admin/roles/settings")
    modules.push(roleSettingsModule);
  else if (path === "/dashboard/departments") modules.push(departmentsModule);
  else if (path.startsWith("/dashboard/departments/"))
    modules.push(departmentDetailModule);
  else if (path.endsWith("/calendar/email-groups"))
    modules.push(emailGroupsModule);
  else if (path === "/dashboard/calendar/my-schedule")
    modules.push(assignmentsModule);
  else if (path.endsWith("/calendar"))
    modules.push(calendarModule, assignmentsModule);
  else if (
    path.includes("/schedules/") ||
    path.startsWith("/client/assignments/")
  )
    modules.push(notifiedScheduleModule);
  else if (path.endsWith("/schedules")) modules.push(scheduleModule);
  else if (path.endsWith("/schedule-leaders"))
    modules.push(scheduleLeadersModule);
  else if (path.startsWith("/dashboard") && /otps?$/.test(path))
    modules.push(leaderOtpModule, settingsModule);
  else if (path.startsWith("/dashboard")) modules.push(settingsModule);
  else if (/\/members\//.test(path) || path === "/client/profile")
    modules.push(memberDetailModule, directoryModule);
  else if (path.endsWith("/members")) modules.push(directoryModule);
  else if (path.startsWith("/client/events/")) modules.push(eventModule);
  else if (path.startsWith("/worship-viber/")) modules.push(worshipModule);
  else if (path.endsWith("/assignments"))
    modules.push(assignmentsModule, adminScheduleModule);
  else if (path.startsWith("/client/notifications"))
    modules.push(notificationsModule);
  else if (path.endsWith("/otps")) modules.push(teamOtpModule);
  if (url.searchParams.has("member")) modules.push(memberDetailModule);
  await Promise.all(modules.map((module) => module.preload()));
}
