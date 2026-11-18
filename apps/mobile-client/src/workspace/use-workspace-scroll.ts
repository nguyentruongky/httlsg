import { useLayoutEffect, useRef } from "react";
import { useWorkspace } from "@org/core";
import { isHistoryNavigation, restoreNavigationScroll } from "../client-router";
import type { WorkspaceRoute } from "./use-workspace-route";

export function useWorkspaceScroll(workspace: WorkspaceRoute) {
  const {
    route,
    calendar,
    worshipReview,
    assignments,
    schedules,
    assignmentId,
    scheduleId,
    eventId,
    departments,
    departmentId,
    settings,
    profile,
  } = workspace;
  const setTab = useWorkspace((state) => state.setTab);
  const previous = useRef(route);
  useLayoutEffect(() => {
    setTab(
      worshipReview ||
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
    worshipReview,
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
}
