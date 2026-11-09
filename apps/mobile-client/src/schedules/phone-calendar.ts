import type { Assignment } from "./my-assignments";

function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
function timestamp(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}
// Fold at 75 UTF-8 octets without splitting Vietnamese characters (RFC 5545).
function foldLine(line: string) {
  const encoder = new TextEncoder();
  let result = "",
    length = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (length + size > 75) {
      result += "\r\n ";
      length = 1;
    }
    result += character;
    length += size;
  }
  return result;
}

export function saveAssignmentToCalendar(row: Assignment, memberId = "me") {
  const summary = [row.categoryName, row.session].filter(Boolean).join(" - ");
  const description = [
    row.scheduleTitle,
    row.title,
    row.responsibility && "Vị trí: " + row.responsibility,
    row.description,
    row.responsibilityDescription,
    row.notes,
  ]
    .filter(Boolean)
    .join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Church Management//Service Schedule//VI",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${row.responsibilityId}-${memberId}@church-management`,
    `DTSTAMP:${timestamp(new Date())}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
  ];
  if (row.startTime) {
    // Stored service times use the church timezone, regardless of the phone timezone.
    lines.push(
      `DTSTART:${timestamp(new Date(`${row.date}T${row.startTime}:00+07:00`))}`,
    );
    if (row.endTime) {
      lines.push(
        `DTEND:${timestamp(new Date(`${row.date}T${row.endTime}:00+07:00`))}`,
      );
    }
  } else {
    // A session label alone does not specify a time: retain it in the event title.
    lines.push(`DTSTART;VALUE=DATE:${row.date.replace(/-/g, "")}`);
  }
  if (row.location) lines.push(`LOCATION:${escapeText(row.location)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  const url = URL.createObjectURL(
    new Blob([lines.map(foldLine).join("\r\n") + "\r\n"], {
      type: "text/calendar;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `lich-phuc-vu-${row.date}-${row.responsibilityId}.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
