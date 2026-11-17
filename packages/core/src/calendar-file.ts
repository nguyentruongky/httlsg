import { z } from "zod";

export const CalendarFileEventSchema = z
  .object({
    uid: z
      .string()
      .max(200)
      .regex(/^[a-zA-Z0-9@._-]+$/),
    title: z.string().min(1).max(500),
    description: z.string().max(12000),
    location: z.string().max(1000),
    start: z.string().max(30),
    end: z.string().max(30),
    allDay: z.boolean(),
  })
  .strict()
  .superRefine((event, context) => {
    const schema = event.allDay ? z.iso.date() : z.iso.datetime();
    if (
      !schema.safeParse(event.start).success ||
      !schema.safeParse(event.end).success ||
      event.end <= event.start
    )
      context.addIssue({
        code: "custom",
        message: "Ngày giờ lịch không hợp lệ.",
      });
  });
export type CalendarFileEvent = z.infer<typeof CalendarFileEventSchema>;
export function calendarTimestamp(value: string) {
  return value.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
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
export function calendarFile(event: CalendarFileEvent) {
  const dateType = event.allDay ? ";VALUE=DATE" : "";
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Church Management//Service Schedule//VI",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${calendarTimestamp(new Date().toISOString())}`,
      `SUMMARY:${escapeText(event.title)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      `DTSTART${dateType}:${calendarTimestamp(event.start)}`,
      `DTEND${dateType}:${calendarTimestamp(event.end)}`,
      ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .map(foldLine)
      .join("\r\n") + "\r\n"
  );
}
