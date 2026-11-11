import type { CalendarEvent } from "./calendar";
import { addCalendarDays, calendarMonth } from "./calendar";

export type CalendarEventLane = {
  event: CalendarEvent;
  lane: number;
};

export type CalendarWeekSegment = {
  event: CalendarEvent;
  lane: number;
  startColumn: number;
  endColumn: number;
  startsEvent: boolean;
  endsEvent: boolean;
};

export function calendarMonthWeeks(anchor: string) {
  const { from, to } = calendarMonth(anchor);
  const days: string[] = [];
  for (let day = from; day <= to; day = addCalendarDays(day, 1)) days.push(day);
  const weeks: string[][] = [];
  for (let index = 0; index < days.length; index += 7)
    weeks.push(days.slice(index, index + 7));
  return weeks;
}

export function assignCalendarEventLanes(
  events: readonly CalendarEvent[],
  range: { from: string; to: string },
): CalendarEventLane[] {
  const spanning = events
    .filter((event) => {
      const endDate = event.endDate ?? event.eventDate;
      return (
        event.eventDate < endDate &&
        event.eventDate <= range.to &&
        endDate >= range.from
      );
    })
    .sort(
      (left, right) =>
        left.eventDate.localeCompare(right.eventDate) ||
        (right.endDate ?? right.eventDate).localeCompare(
          left.endDate ?? left.eventDate,
        ) ||
        left.id.localeCompare(right.id),
    );
  const laneEnds: string[] = [];
  return spanning.map((event) => {
    const lane = laneEnds.findIndex((end) => end < event.eventDate);
    const assignedLane = lane === -1 ? laneEnds.length : lane;
    laneEnds[assignedLane] = event.endDate ?? event.eventDate;
    return { event, lane: assignedLane };
  });
}

export function calendarWeekSegments(
  week: readonly string[],
  lanes: readonly CalendarEventLane[],
): CalendarWeekSegment[] {
  if (week.length !== 7)
    throw new RangeError("Calendar weeks need seven days.");
  const firstDay = week[0];
  const lastDay = week[6];
  return lanes
    .filter(
      ({ event }) =>
        event.eventDate <= lastDay &&
        (event.endDate ?? event.eventDate) >= firstDay,
    )
    .map(({ event, lane }) => {
      const endDate = event.endDate ?? event.eventDate;
      const visibleStart =
        event.eventDate < firstDay ? firstDay : event.eventDate;
      const visibleEnd = endDate > lastDay ? lastDay : endDate;
      return {
        event,
        lane,
        startColumn: week.indexOf(visibleStart),
        endColumn: week.indexOf(visibleEnd),
        startsEvent: event.eventDate >= firstDay,
        endsEvent: endDate <= lastDay,
      };
    });
}

export function calendarEventsForDate(
  events: readonly CalendarEvent[],
  date: string,
) {
  return events.filter(
    (event) =>
      event.eventDate <= date && (event.endDate ?? event.eventDate) >= date,
  );
}
