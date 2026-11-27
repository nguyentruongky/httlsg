import {
  Building2,
  CalendarDays,
  Settings,
  UserRound,
  Users,
  Vote,
} from "lucide-react";
import { BottomNavigation } from "@org/ui";
import type { WorkspaceRoute } from "./use-workspace-route";

export function WorkspaceTabs({ workspace }: { workspace: WorkspaceRoute }) {
  const {
    hasCalendar,
    settingsAccess,
    calendar,
    calendarContributions,
    assignments,
    schedules,
    assignmentId,
    scheduleId,
    eventId,
    worshipId,
    worshipReview,
    directory,
    memberId,
    departments,
    departmentId,
    settings,
    profile,
    elections,
    electionId,
  } = workspace;
  if (elections || electionId || workspace.scrutineer) return null;
  const tabs = [
    ...(hasCalendar
      ? [{ id: "calendar", label: "Lịch", icon: CalendarDays }]
      : []),
    { id: "members", label: "Danh sách", icon: Users },
    { id: "departments", label: "Ban ngành", icon: Building2 },
    ...(workspace.hasElectionAssignments
      ? [{ id: "elections", label: "Bầu cử", icon: Vote }]
      : []),
    settingsAccess
      ? { id: "settings", label: "Cài đặt", icon: Settings }
      : { id: "profile", label: "Cá nhân", icon: UserRound },
  ];
  return (
    <BottomNavigation
      data-bottom-tabs
      aria-label="Điều hướng chính"
      className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-7xl -translate-x-1/2 items-start border-x border-t border-border/40 bg-background px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2"
      itemClassName={({ active }) =>
        `min-h-14 rounded-xl ${active ? "text-primary" : "text-muted-foreground"}`
      }
      labelClassName="text-xs font-medium"
      items={tabs.map(({ id, label, icon: Icon }) => {
        const active =
          id === "calendar"
            ? worshipReview ||
              calendarContributions ||
              calendar ||
              assignments ||
              schedules ||
              Boolean(assignmentId || scheduleId || eventId || worshipId)
            : id === "members"
              ? directory || Boolean(memberId)
              : id === "departments"
                ? departments || Boolean(departmentId)
                : id === "settings"
                  ? settings || profile || workspace.elections
                  : profile;
        return {
          id,
          label,
          active,
          href: `/client/${id}`,
          icon: <Icon size={23} strokeWidth={active ? 2.2 : 1.6} />,
        };
      })}
    />
  );
}
