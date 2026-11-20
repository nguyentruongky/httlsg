import { CalendarDays, List, Plus, Download, Mail, MoreVertical } from "lucide-react";
import { Button, DropdownMenu, MenuItem } from "@org/ui";
import { WorshipContributions, WorshipContributionsBadge } from "./worship-contributions";
import { navigateClient } from "../client-router";
import { canCalendar, canViewSchedules, hasScheduleCreation } from "@org/core";
import type { AuthUser } from "@org/core";

type CalendarToolbarProps = {
  viewMode: "month" | "list";
  user: AuthUser | null | undefined;
  exporting: boolean;
  onToggleView: () => void;
  onExport: () => void;
  onOpenEmailGroups: () => void;
};

export function CalendarToolbar({
  viewMode,
  user,
  exporting,
  onToggleView,
  onExport,
  onOpenEmailGroups,
}: CalendarToolbarProps) {
  return (
    <header
      data-scroll-top-bar
      className="sticky top-[var(--list-sticky-top,0px)] z-30 flex flex-wrap items-start justify-between gap-4 bg-background py-3"
    >
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          aria-label={
            viewMode === "month" ? "Xem dạng danh sách" : "Xem dạng lịch tháng"
          }
          aria-pressed={viewMode === "list"}
          onClick={onToggleView}
        >
          {viewMode === "month" ? (
            <List size={18} />
          ) : (
            <CalendarDays size={18} />
          )}
          {viewMode === "month" ? "" : "Lịch tháng"}
        </Button>
        <Button variant="outline" onClick={() => navigateClient("/worship")}>
          <Plus size={18} />
          Thêm thông tin
        </Button>
        <h2 className="flex items-center gap-3 text-3xl font-semibold">
          <CalendarDays className="hidden sm:block text-primary" />
          <span className="hidden sm:block">Lịch sinh hoạt</span>
        </h2>
      </div>
      <DropdownMenu
        animateOnMobile
        label=""
        trigger={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Menu lịch"
            className="relative"
          >
            <MoreVertical size={21} />
            {user && ["admin", "secretary"].includes(user.role) && (
              <WorshipContributionsBadge />
            )}
          </Button>
        }
      >
        {user && ["admin", "secretary"].includes(user.role) && (
          <WorshipContributions />
        )}
        {user?.role === "secretary" && (
          <MenuItem onSelect={() => navigateClient("/client/assignments")}>
            <CalendarDays size={16} />
            Lịch của tôi
          </MenuItem>
        )}
        {canCalendar(user, "calendar.export") && (
          <MenuItem onSelect={onExport}>
            <Download size={16} />
            Tải thông báo
          </MenuItem>
        )}
        {canCalendar(user, "calendar.groups") && (
          <MenuItem onSelect={onOpenEmailGroups}>
            <Mail size={16} />
            Nhóm email nhận thông báo
          </MenuItem>
        )}
        {canViewSchedules(user) && (
          <>
            <MenuItem onSelect={() => navigateClient("/client/schedules")}>
              <List size={16} />
              Xem lịch phân công
            </MenuItem>
            {hasScheduleCreation(user) && (
              <MenuItem
                onSelect={() => navigateClient("/client/schedules?create=1")}
              >
                <Plus size={16} />
                Tạo lịch phân công
              </MenuItem>
            )}
          </>
        )}
      </DropdownMenu>
    </header>
  );
}