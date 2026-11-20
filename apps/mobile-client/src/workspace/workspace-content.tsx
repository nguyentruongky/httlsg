import { Suspense, lazy, useRef } from "react";
import { Button } from "@org/ui";
import type { WorkspaceRoute } from "./use-workspace-route";
import { MemberDetail } from "../member-detail";
const DepartmentManagement = lazy(() =>
  import("../department-management").then((m) => ({
    default: m.DepartmentManagement,
  })),
);
const DepartmentDetail = lazy(() =>
  import("../department-detail").then((m) => ({ default: m.DepartmentDetail })),
);
const CalendarPage = lazy(() =>
  import("../calendar/calendar-page").then((m) => ({
    default: m.CalendarPage,
  })),
);
const CalendarReviewPage = lazy(() =>
  import("../calendar/calendar-review-page").then((m) => ({
    default: m.CalendarReviewPage,
  })),
);
const MyAssignments = lazy(() =>
  import("../schedules/my-assignments").then((m) => ({
    default: m.MyAssignments,
  })),
);
const ApplicationSettings = lazy(() =>
  import("../application-settings").then((m) => ({
    default: m.ApplicationSettings,
  })),
);
const MemberDirectory = lazy(() =>
  import("../member-directory").then((m) => ({ default: m.MemberDirectory })),
);
import {
  notifiedScheduleModule,
  publicWorshipModule,
  scheduleModule,
  scheduleLeadersModule,
  eventModule,
  worshipModule,
  worshipReviewModule,
} from "../route-modules";
const NotifiedSchedule = notifiedScheduleModule.Component;
const ScheduleManager = scheduleModule.Component;
const ScheduleLeaders = scheduleLeadersModule.Component;
const PushEvent = eventModule.Component;
const PublicWorship = publicWorshipModule.Component;
const WorshipViberDraftPage = worshipModule.Component;
const WorshipReviewPage = worshipReviewModule.Component;

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
    calendarContributions,
    publicWorship,
    assignments,
    hasCalendar,
    fullMembers,
    assignmentId,
    scheduleId,
    schedules,
    scheduleAccess,
    administrator,
    search,
    scheduleLeaders,
    settings,
    eventId,
    worshipId,
    worshipReview,
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
      {calendarContributions && <CalendarReviewPage />}
      {assignmentId && <NotifiedSchedule id={assignmentId} assigned />}
      {scheduleId && <NotifiedSchedule id={scheduleId} />}
      {schedules &&
        (scheduleAccess ? (
          <ScheduleManager
            member
            returnHref={fullMembers ? "/client/calendar" : "/client/profile"}
            initialCreate={new URLSearchParams(search).get("create") === "1"}
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
      {publicWorship && <PublicWorship />}
      {worshipId && <WorshipViberDraftPage requestId={worshipId} />}
      {worshipReview && <WorshipReviewPage />}
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
