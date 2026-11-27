"use client";
import {
  QuarterlyWorkTable,
  type QuarterlyCellChange,
} from "./quarterly-table";
import {
  isQuarterlyWork,
  isReceptionTable,
  scheduleTableSections,
  scheduleDutyText,
  displayCalendarDate,
  type ReceptionRuleIssue,
  type QuarterlyCellIssue,
  type ScheduleRecord,
  type ScheduleEventValue,
} from "@org/core";
import { Button, cn } from "@org/ui";
import { ReceptionTable } from "./reception-table";
export type ReceptionCellChange = (
  date: string,
  session: "Sáng" | "Tối",
  position: string,
  text: string,
) => void;
export function ScheduleTable({
  schedule,
  onEvent,
  onCellChange,
  onCellBlur,
  receptionIssues,
  onQuarterlyCellChange,
  canEditQuarterlyColumn,
  quarterlyIssues,
}: {
  schedule: ScheduleRecord;
  onEvent?: (event: ScheduleEventValue) => void;
  onCellChange?: ReceptionCellChange;
  onCellBlur?: ReceptionCellChange;
  receptionIssues?: ReceptionRuleIssue[];
  onQuarterlyCellChange?: QuarterlyCellChange;
  canEditQuarterlyColumn?: (column: string) => boolean;
  quarterlyIssues?: QuarterlyCellIssue[];
}) {
  if (isQuarterlyWork(schedule))
    return (
      <QuarterlyWorkTable
        schedule={schedule}
        onCellChange={onQuarterlyCellChange}
        canEditColumn={canEditQuarterlyColumn}
        issues={quarterlyIssues}
      />
    );
  if (isReceptionTable(schedule))
    return (
      <ReceptionTable
        schedule={schedule}
        onCellChange={onCellChange}
        onCellBlur={onCellBlur}
        receptionIssues={receptionIssues}
      />
    );
  return (
    <div className="space-y-5">
      {scheduleTableSections(schedule).map((section) => (
        <section key={section.name} className="space-y-2">
          <h3 className="font-semibold">{section.name}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="border p-3">Ngày / Chương trình</th>
                  {section.columns.map((name) => (
                    <th className="border p-3" key={name}>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.events.map((event) => (
                  <tr key={event.id} className="align-top">
                    <td className="min-w-40 border p-3">
                      <p className="font-medium">
                        {displayCalendarDate(event.date)}
                      </p>
                      {event.startTime && (
                        <p>
                          {event.startTime}
                          {event.endTime ? " – " + event.endTime : ""}
                        </p>
                      )}
                      <p className="break-words">{event.title}</p>
                      {event.location && (
                        <p className="text-muted-foreground">
                          {event.location}
                        </p>
                      )}
                      {onEvent && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="print:hidden"
                          onClick={() => onEvent(event)}
                        >
                          Sửa chương trình
                        </Button>
                      )}
                    </td>
                    {section.columns.map((name) => (
                      <td
                        key={name}
                        className="min-w-32 whitespace-pre-wrap break-words border p-3"
                      >
                        {event.responsibilities
                          .filter((duty) => duty.name === name)
                          .map((duty) => (
                            <div
                              key={duty.id}
                              className={cn(
                                "mb-2",
                                !duty.assignments.length &&
                                  !duty.departmentIds.length &&
                                  "text-destructive",
                              )}
                            >
                              <p>{scheduleDutyText(schedule, duty)}</p>
                              {duty.description && (
                                <p className="text-muted-foreground">
                                  {duty.description}
                                </p>
                              )}
                            </div>
                          ))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
