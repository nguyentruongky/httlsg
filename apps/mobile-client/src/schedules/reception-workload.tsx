"use client";
import { PersonCard } from "../person-card";
import { useState } from "react";
import {
  receptionWorkload,
  formatReceptionName,
  RECEPTION_ELIGIBILITY_LABELS,
  type ReceptionRosterPerson,
  type ScheduleRecord,
} from "@org/core";
import { Button, Card } from "@org/ui";
export function ReceptionWorkloadSummary({
  schedule,
  team,
}: {
  schedule: ScheduleRecord;
  team: readonly ReceptionRosterPerson[];
}) {
  const [expanded, setExpanded] = useState(false),
    summary = receptionWorkload(schedule, team),
    visible = expanded ? summary.people : summary.people.slice(0, 8);
  return (
    <section aria-label="Phân công từng người">
      <Card className="overflow-hidden">
        <div className="border-b p-4">
          <h2 className="font-semibold">Phân công từng người</h2>
          {summary.unresolved > 0 && (
            <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
              Các tên chưa xác định hồ sơ chưa được tính.
            </p>
          )}
        </div>
        <ul className="divide-y">
          {visible.map((person) => (
            <li key={person.memberId} className="px-4 py-3">
              <PersonCard
                name={formatReceptionName(
                  person.name,
                  RECEPTION_ELIGIBILITY_LABELS[
                    person.eligibility as keyof typeof RECEPTION_ELIGIBILITY_LABELS
                  ] ?? "",
                )}
                departments={`${person.morning} sáng - ${person.evening} tối`}
                className="border-0 p-0"
              />
            </li>
          ))}
        </ul>
        {summary.people.length > 8 && (
          <div className="border-t p-3">
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setExpanded((old) => !old)}
            >
              {expanded
                ? "Thu gọn"
                : `Xem tất cả ${summary.people.length} người`}
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}
