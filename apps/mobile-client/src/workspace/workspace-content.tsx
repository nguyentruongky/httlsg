import { ElectionAdminPage } from "../elections/election-admin-page";
import { ElectionSync } from "../elections/election-sync";
import { Suspense, lazy, useRef } from "react";
import { Button, LoadingView } from "@org/ui";
import type { WorkspaceRoute } from "./use-workspace-route";
import { MemberDetail } from "../member-detail";
import { DepartmentManagement } from "../department-management";
import { CalendarPage } from "../calendar/calendar-page";
import { ApplicationSettings } from "../application-settings";
import { MemberDirectory } from "../member-directory";
// Main tab screens are eager so their first navigation cannot suspend to a blank page.
const ScrutineerPage = lazy(() =>
  import("../elections/scrutineer-page").then((m) => ({
    default: m.ScrutineerPage,
  })),
);
const DepartmentDetail = lazy(() =>
  import("../department-detail").then((m) => ({ default: m.DepartmentDetail })),
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
import {
  notifiedScheduleModule,
  publicWorshipModule,
  scheduleModule,
  scheduleLeadersModule,
  eventModule,
  worshipModule,
  worshipReviewModule,
} from "../route-modules";
import { BotIcon, BotOffIcon } from "lucide-react";
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
    elections,
    electionId,
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
    <Suspense fallback={<LoadingView />}>
      <ElectionSync />
      {workspace.scrutineer && (
        <ScrutineerPage
          roundId={workspace.scrutineerRoundId}
          electionId={workspace.scrutineerElectionId}
        />
      )}
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
      {elections || electionId ? (
        <ElectionAdminPage
          electionId={electionId ?? undefined}
          organizationId={organizationId}
        />
      ) : (
        <>
          {settings &&
            (workspace.settingsAccess ? (
              <ApplicationSettings />
            ) : (
              <p role="alert">Bạn không có quyền truy cập cài đặt quản trị.</p>
            ))}
          {eventId && <PushEvent id={eventId} />}
          {publicWorship && <PublicWorship />}
          {worshipId && <WorshipViberDraftPage requestId={worshipId} />}
          {worshipReview && <WorshipReviewPage />}
          {!valid && (
            <div className="flex flex-col items-center justify-center py-20 text-center mt-24">
              <BotIcon size={56} />
              <h1 className="text-xl mt-4 font-semibold text-foreground mb-2">
                Trang không tồn tại
              </h1>
              <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">
                Trang bạn đang tìm không có sẵn hoặc đã được di chuyển.
              </p>
              <Button asChild variant="default">
                <a href={home}>Về trang chính</a>
              </Button>
            </div>
          )}
        </>
      )}
    </Suspense>
  );
}
