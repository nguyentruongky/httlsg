import {
  CalendarFileEventSchema,
  calendarTimestamp,
  type CalendarFileEvent,
} from "@org/core";
import type { Assignment } from "./my-assignments";
import { assignmentResponsibilityLabel } from "./assignment-label";

function assignmentEvent(row: Assignment, memberId: string): CalendarFileEvent {
  const start = row.startTime
    ? new Date(
        `${row.date}T${row.startTime.length === 5 ? row.startTime + ":00" : row.startTime}+07:00`,
      )
    : new Date(`${row.date}T00:00:00Z`);
  let end: Date;
  if (!row.startTime) end = new Date(start.getTime() + 86400000);
  else if (row.endTime) {
    end = new Date(
      `${row.date}T${row.endTime.length === 5 ? row.endTime + ":00" : row.endTime}+07:00`,
    );
    if (end <= start) end = new Date(end.getTime() + 86400000);
  } else end = new Date(start.getTime() + 3600000);
  return CalendarFileEventSchema.parse({
    uid: `${row.responsibilityId}-${memberId}@church-management`,
    title: [row.categoryName, row.session].filter(Boolean).join(" - "),
    description:
      row.categoryId === "reception" && row.session === "Sáng"
        ? `Vị trí: ${assignmentResponsibilityLabel(row.responsibility)}`
        : [
            row.scheduleTitle,
            row.title,
            row.responsibility &&
              "Công tác: " + assignmentResponsibilityLabel(row.responsibility),
            row.description,
            row.responsibilityDescription,
            row.notes,
          ]
            .filter(Boolean)
            .join("\n"),
    location: row.location || "",
    start: row.startTime ? start.toISOString() : row.date,
    end: row.startTime ? end.toISOString() : end.toISOString().slice(0, 10),
    allDay: !row.startTime,
  });
}
function googleCalendarUrl(event: CalendarFileEvent) {
  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${calendarTimestamp(event.start)}/${calendarTimestamp(event.end)}`,
    details: event.description,
    location: event.location,
    ctz: "Asia/Ho_Chi_Minh",
  });
  return `https://calendar.google.com/calendar/render?${query}`;
}
export function calendarSaveLabel() {
  return /Android/i.test(navigator.userAgent)
    ? "Lưu vào lịch điện thoại"
    : "Thêm vào Google Calendar";
}
export function saveAssignmentToCalendar(row: Assignment, memberId = "me") {
  const event = assignmentEvent(row, memberId);
  const google = googleCalendarUrl(event);
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) {
    // Navigate directly from the tap, including in installed iOS PWAs.
    // Safari's ICS download preview does not reliably offer calendar import.
    window.location.assign(google);
    return;
  }
  if (/Android/i.test(navigator.userAgent)) {
    const start = new Date(event.start).getTime();
    const end = new Date(event.end).getTime();
    // Browsers can only launch calendar activities that allow browser intents.
    // If none is installed, Chrome opens the prefilled Google Calendar editor.
    window.location.href =
      "intent://com.android.calendar/events#Intent;" +
      "scheme=content;action=android.intent.action.INSERT;" +
      `S.title=${encodeURIComponent(event.title)};S.description=${encodeURIComponent(event.description)};` +
      `S.eventLocation=${encodeURIComponent(event.location)};l.beginTime=${start};l.endTime=${end};` +
      `B.allDay=${event.allDay};S.eventTimezone=Asia%2FHo_Chi_Minh;` +
      `S.browser_fallback_url=${encodeURIComponent(google)};end`;
    return;
  }
  window.open(google, "_blank", "noopener,noreferrer");
}
