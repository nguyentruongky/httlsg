import { Suspense, useRef } from "react";
import { Button } from "@org/ui";
import type { WorkspaceRoute } from "./use-workspace-route";
import { MemberDetail } from "../member-detail";
import { DepartmentManagement } from "../department-management";
import { DepartmentDetail } from "../department-detail";
import { CalendarPage } from "../calendar/calendar-page";
import { MyAssignments } from "../schedules/my-assignments";
import { ApplicationSettings } from "../application-settings";
import { MemberDirectory } from "../member-directory";
import {
  notifiedScheduleModule,
  scheduleModule,
  scheduleLeadersModule,
  eventModule,
  worshipModule,
} from "../route-modules";
const NotifiedSchedule = notifiedScheduleModule.Component;
const ScheduleManager = scheduleModule.Component;
const ScheduleLeaders = scheduleLeadersModule.Component;
const PushEvent = eventModule.Component;
const WorshipViberDraftPage = worshipModule.Component;

export function WorkspaceContent({ workspace }: { workspace: WorkspaceRoute }) {
  const {
    directory,
    memberId,
    profile,
    organizationId,
    assigned,
    departments,
    departmentId,
    calendar,
    assignments,
    hasCalendar,
    fullMembers,
    assignmentId,
    scheduleId,
    schedules,
    administrator,
    search,
    scheduleLeaders,
    settings,
    eventId,
    worshipId,
    valid,
    home,
  } = workspace;
  const retainedDirectory = useRef(false);
  if (directory || memberId) retainedDirectory.current = true;
  const directoryScroll = useRef<HTMLDivElement>(null);
  return (
    <Suspense fallback={null}>
      {retainedDirectory.current && (
        <div hidden={!directory} className={directory ? "h-full" : "hidden"}>
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
      {departmentId && <DepartmentDetail id={departmentId} fixedViewport />}
      {(calendar || assignments) &&
        (hasCalendar ? (
          fullMembers && calendar ? (
            <CalendarPage />
          ) : (
            <MyAssignments />
          )
        ) : (
          <p role="alert">Bạn chưa có phân công công tác hoặc tiếp tân.</p>
        ))}
      {assignmentId && <NotifiedSchedule id={assignmentId} assigned />}
      {scheduleId && <NotifiedSchedule id={scheduleId} />}
      {schedules &&
        (fullMembers ? (
          <ScheduleManager
            member
            returnHref="/client/calendar"
            initialCreate={
              administrator && new URLSearchParams(search).get("create") === "1"
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
          <p role="alert">Bạn không có quyền truy cập cài đặt quản trị.</p>
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
  );
}
