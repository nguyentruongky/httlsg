import { clientPath } from "@org/core";
import { deferred } from "./navigation/deferred-route";

// Keep existing consumers compatible; the registry below owns screen imports only.
export { deferred } from "./navigation/deferred-route";

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
export const worshipReviewModule = deferred(() =>
  import("./calendar/worship-review-page").then((m) => m.WorshipReviewPage),
);
export const publicWorshipModule = deferred(() =>
  import("./calendar/public-worship-page").then((m) => m.PublicWorshipPage),
);
export const worshipModule = deferred(() =>
  import("./calendar/worship-viber-draft-page").then(
    (m) => m.WorshipViberDraftPage,
  ),
);
export const settingsModule = deferred(() =>
  import("./application-settings").then((m) => m.ApplicationSettings),
);
export const scheduleLeadersModule = deferred(() =>
  import("./schedule-leaders").then((m) => m.ScheduleLeaders),
);
export const scheduleModule = deferred(() =>
  import("./schedules/schedule-manager").then((m) => m.ScheduleManager),
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
export async function preloadRoute(value: string) {
  const url = new URL(value, location.href);
  const path = clientPath(url.pathname);
  const modules: { preload: () => Promise<void> }[] = [];
  if (path === "/dashboard/members") modules.push(membersModule);
  else if (
    path === "/dashboard/admin/roles/members" ||
    path === "/client/personnel"
  )
    modules.push(roleMembersModule);
  else if (path === "/dashboard/admin/roles/settings")
    modules.push(settingsModule);
  else if (path === "/dashboard/departments" || path === "/client/departments")
    modules.push(departmentsModule);
  else if (
    path.startsWith("/dashboard/departments/") ||
    path.startsWith("/client/departments/")
  )
    modules.push(departmentDetailModule);
  else if (path.endsWith("/calendar/email-groups"))
    modules.push(settingsModule);
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
  else if (path.startsWith("/dashboard")) modules.push(settingsModule);
  else if (/\/members\//.test(path) || path === "/client/profile")
    modules.push(memberDetailModule, directoryModule);
  else if (path.endsWith("/members")) modules.push(directoryModule);
  else if (
    path === "/client/settings" ||
    path.startsWith("/client/admin/") ||
    ["/client/activity", "/client/church-status-report"].includes(path)
  )
    modules.push(settingsModule);
  else if (path.startsWith("/client/events/")) modules.push(eventModule);
  else if (path === "/client/worship-review") modules.push(worshipReviewModule);
  else if (path === "/worship" || path === "/client/worship")
    modules.push(publicWorshipModule);
  else if (path.startsWith("/worship-viber/")) modules.push(worshipModule);
  else if (path.endsWith("/assignments")) modules.push(assignmentsModule);
  else if (path.startsWith("/client/notifications"))
    modules.push(notificationsModule);
  if (url.searchParams.has("member")) modules.push(memberDetailModule);
  await Promise.all(modules.map((module) => module.preload()));
}
