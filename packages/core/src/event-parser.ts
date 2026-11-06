export interface ParsedEventText {
  title: string;
  timeText: string | null;
  startTime: string | null;
  endTime: string | null;
  details: string;
}
function clock(value: string): string | null {
  const m = /^(\d{1,2})[:h](\d{2})(?:\s*(AM|PM))?$/i.exec(value.trim());
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  if (minute > 59 || (m[3] ? hour < 1 || hour > 12 : hour > 23)) return null;
  if (m[3]) hour = (hour % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${m[2]}`;
}
export function parseEventTime(value: string) {
  const parts = value.trim().split(/\s*[-–—]\s*/);
  if (parts.length > 2) return null;
  const startTime = clock(parts[0]),
    endTime = parts.length === 2 ? clock(parts[1]) : null;
  if (!startTime || (parts.length === 2 && (!endTime || endTime <= startTime)))
    return null;
  return { startTime, endTime };
}
export const isValidEventTime = (value: string) =>
  parseEventTime(value) !== null;
export function parseEventText(input: string): ParsedEventText {
  const lines = [...input.matchAll(/([^\r\n]*)(\r\n|\n|\r|$)/g)].filter(
    (m) => m[0].length,
  );
  const titleIndex = lines.findIndex((m) => m[1].trim());
  if (titleIndex < 0)
    return {
      title: "",
      timeText: null,
      startTime: null,
      endTime: null,
      details: "",
    };
  const title = lines[titleIndex];
  const second = lines.slice(titleIndex + 1).find((m) => m[1].trim());
  const time = second ? parseEventTime(second[1]) : null;
  const last = time ? second! : title;
  return {
    title: title[1].trim(),
    timeText: time ? second![1].trim() : null,
    startTime: time?.startTime ?? null,
    endTime: time?.endTime ?? null,
    details: input.slice(last.index! + last[0].length),
  };
}
export function formatEventText(input: {
  title: string;
  timeText?: string | null;
  details?: string | null;
}) {
  return [
    input.title.trim(),
    ...(input.timeText ? [input.timeText] : []),
    ...(input.details ? [input.details] : []),
  ].join("\n");
}
