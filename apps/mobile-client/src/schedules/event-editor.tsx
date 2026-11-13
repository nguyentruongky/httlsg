"use client";
import { useDebouncedSearch } from "../use-debounced-search";
import { useState } from "react";
import { ChevronUp, ChevronDown, X, Plus } from "lucide-react";
import {
  QUARTERLY_TEAMS,
  QUARTERLY_CHOIRS,
  createRequestId,
  CalendarDate,
  ScheduleEvent,
  calendarWeekday,
  type ScheduleEventValue,
  type ScheduleCategory,
  type ScheduleDraftValue,
} from "@org/core";
import {
  Button,
  Dialog,
  Input,
  Dropdown,
  Checkbox,
  ErrorMessage,
} from "@org/ui";
import { DateInput } from "../date-input";
import { ScheduleMemberPicker } from "./member-picker";
export function ScheduleEventEditor({
  value,
  category,
  departments,
  settings,
  periodStart,
  periodEnd,
  names,
  onSave,
  onClose,
}: {
  value: ScheduleEventValue;
  category: ScheduleCategory;
  departments: { id: string; name: string }[];
  settings: ScheduleDraftValue["settings"];
  periodStart: string;
  periodEnd: string;
  names: Record<string, string>;
  onSave: (event: ScheduleEventValue, names: Record<string, string>) => void;
  onClose: () => void;
}) {
  const [event, setEvent] = useState(() => structuredClone(value)),
    [memberNames, setMemberNames] = useState(names),
    [error, setError] = useState<string>(),
    [teamSearch, setTeamSearch] = useState("");
  const change = (field: string, value: unknown) =>
    setEvent((old) => ({ ...old, [field]: value }));
  function duty(index: number, field: string, value: unknown) {
    setEvent((old) => ({
      ...old,
      responsibilities: old.responsibilities.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
              ...(["assignments", "departmentIds"].includes(field)
                ? { displayText: null }
                : {}),
            }
          : item,
      ),
    }));
  }
  function move(index: number, offset: number) {
    const list = [...event.responsibilities];
    [list[index], list[index + offset]] = [list[index + offset], list[index]];
    change("responsibilities", list);
  }
  const debouncedTeamSearch = useDebouncedSearch(teamSearch);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Chương trình và phân công"
      description=""
      closeLabel="Đóng chương trình phân công"
      fullScreenOnMobile
      className="sm:max-w-3xl"
    >
      <form
        className="space-y-5"
        onSubmit={(submit) => {
          submit.preventDefault();
          try {
            const parsed = ScheduleEvent.parse(event);
            if (parsed.date < periodStart || parsed.date > periodEnd)
              throw new Error("Ngày nằm ngoài kỳ lịch.");
            if (
              parsed.endTime &&
              (!parsed.startTime || parsed.endTime <= parsed.startTime)
            )
              throw new Error("Giờ kết thúc phải sau giờ bắt đầu.");
            onSave(parsed, memberNames);
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Kiểm tra nội dung chương trình.",
            );
          }
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Ngày
            <DateInput
              aria-label="Ngày phân công"
              className="mt-2"
              value={event.date}
              onChange={(date) => {
                const oldDefault =
                  CalendarDate.safeParse(event.date).success &&
                  calendarWeekday(event.date) === 0
                    ? settings.sundayTime
                    : settings.weekdayTime;
                change("date", date);
                if (
                  CalendarDate.safeParse(date).success &&
                  (!event.startTime || event.startTime === oldDefault)
                )
                  change(
                    "startTime",
                    calendarWeekday(date) === 0
                      ? settings.sundayTime
                      : settings.weekdayTime,
                  );
              }}
            />
          </label>
          <label className="block text-sm">
            Tên chương trình
            <Input
              required
              maxLength={200}
              value={event.title}
              onChange={(e) => change("title", e.target.value)}
              className="mt-2 w-full"
            />
          </label>
          <label className="block text-sm">
            Giờ bắt đầu
            <Input
              type="time"
              value={event.startTime ?? ""}
              onChange={(e) => change("startTime", e.target.value || null)}
              className="mt-2 w-full"
            />
          </label>
          <label className="block text-sm">
            Giờ kết thúc
            <Input
              type="time"
              value={event.endTime ?? ""}
              onChange={(e) => change("endTime", e.target.value || null)}
              className="mt-2 w-full"
            />
          </label>
          <label className="block text-sm">
            Buổi / Nhóm chương trình
            <Input
              value={event.session}
              maxLength={80}
              placeholder={settings.sessions.join(", ")}
              onChange={(e) => change("session", e.target.value)}
              className="mt-2 w-full"
            />
          </label>
          <label className="block text-sm">
            Địa điểm
            <Input
              value={event.location}
              maxLength={200}
              onChange={(e) => change("location", e.target.value)}
              className="mt-2 w-full"
            />
          </label>
        </div>
        {settings.sessions.length > 0 && (
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Buổi gợi ý"
          >
            {settings.sessions.map((session) => (
              <Button
                type="button"
                key={session}
                variant="outline"
                onClick={() => change("session", session)}
              >
                {session}
              </Button>
            ))}
          </div>
        )}
        <label className="block text-sm">
          Ghi chú chương trình
          <textarea
            className="mt-2 min-h-24 w-full rounded-lg border bg-background p-3"
            maxLength={1000}
            value={event.description}
            onChange={(e) => change("description", e.target.value)}
          />
        </label>
        <section className="space-y-4">
          <h2 className="font-semibold">Trách nhiệm</h2>
          {event.responsibilities.map((item, index) => (
            <div className="space-y-3 rounded-xl border p-4" key={item.id}>
              <div className="flex items-center gap-2">
                <Input
                  aria-label={"Tên trách nhiệm " + (index + 1)}
                  required
                  readOnly={settings.template === "quarterly_work"}
                  maxLength={100}
                  className="min-w-0 flex-1"
                  value={item.name}
                  onChange={(e) => duty(index, "name", e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={"Đưa trách nhiệm " + (index + 1) + " lên"}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ChevronUp size={17} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={"Đưa trách nhiệm " + (index + 1) + " xuống"}
                  disabled={index === event.responsibilities.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown size={17} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={"Xóa trách nhiệm " + (index + 1)}
                  onClick={() =>
                    change(
                      "responsibilities",
                      event.responsibilities.filter(
                        (duty) => duty.id !== item.id,
                      ),
                    )
                  }
                >
                  <X size={17} />
                </Button>
              </div>
              <label className="block text-sm">
                Ghi chú trách nhiệm
                <Input
                  maxLength={500}
                  value={item.description}
                  className="mt-2 w-full"
                  onChange={(e) => duty(index, "description", e.target.value)}
                />
              </label>
              {settings.template === "quarterly_work" &&
              ["Ban thờ phượng", "Ban hát"].includes(item.name) ? (
                <label className="block text-sm">
                  {item.name}
                  <Dropdown
                    className="mt-2 w-full"
                    value={item.displayText ?? ""}
                    onChange={(e) => duty(index, "displayText", e.target.value)}
                  >
                    <option value="">Chọn {item.name.toLowerCase()}</option>
                    {(item.name === "Ban thờ phượng"
                      ? QUARTERLY_TEAMS
                      : QUARTERLY_CHOIRS
                    ).map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </Dropdown>
                </label>
              ) : (
                <>
                  {!item.assignments.length && !item.departmentIds.length && (
                    <p className="text-sm text-destructive">Chưa phân công</p>
                  )}
                  {item.assignments.map((assignment) => (
                    <div
                      className="rounded-lg bg-muted/40 p-3"
                      key={assignment.memberId}
                    >
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 break-words">
                          {memberNames[assignment.memberId] ??
                            assignment.memberId}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={
                            "Gỡ " +
                            (memberNames[assignment.memberId] ??
                              assignment.memberId)
                          }
                          onClick={() =>
                            duty(
                              index,
                              "assignments",
                              item.assignments.filter(
                                (a) => a.memberId !== assignment.memberId,
                              ),
                            )
                          }
                        >
                          <X size={16} />
                        </Button>
                      </div>
                      <Input
                        aria-label={
                          "Ghi chú cho " +
                          (memberNames[assignment.memberId] ??
                            assignment.memberId)
                        }
                        placeholder="Ghi chú cho thành viên"
                        maxLength={500}
                        className="mt-2 w-full"
                        value={assignment.notes}
                        onChange={(e) =>
                          duty(
                            index,
                            "assignments",
                            item.assignments.map((a) =>
                              a.memberId === assignment.memberId
                                ? { ...a, notes: e.target.value }
                                : a,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                  {item.assignments.length <
                    (settings.template === "quarterly_work" ? 1 : 30) && (
                    <ScheduleMemberPicker
                      categoryId={category.id}
                      selected={item.assignments.map((a) => a.memberId)}
                      onPick={(person) => {
                        duty(index, "assignments", [
                          ...item.assignments,
                          { memberId: person.id, notes: "" },
                        ]);
                        setMemberNames((old) => ({
                          ...old,
                          [person.id]: person.name,
                        }));
                      }}
                    />
                  )}
                  {settings.template !== "quarterly_work" && (
                    <details className="rounded-lg border p-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        Phân công Ban ngành ({item.departmentIds.length})
                      </summary>
                      <Input
                        aria-label={
                          "Tìm Ban ngành cho trách nhiệm " + (index + 1)
                        }
                        placeholder="Tìm Ban ngành"
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        className="my-3 w-full"
                      />
                      <div className="space-y-2">
                        {departments
                          .filter((team) =>
                            team.name
                              .toLocaleLowerCase("vi")
                              .includes(
                                debouncedTeamSearch.toLocaleLowerCase("vi"),
                              ),
                          )
                          .map((team) => (
                            <label
                              className="flex min-h-11 items-center gap-3 text-sm"
                              key={team.id}
                            >
                              <Checkbox
                                checked={item.departmentIds.includes(team.id)}
                                disabled={
                                  item.departmentIds.length >= 20 &&
                                  !item.departmentIds.includes(team.id)
                                }
                                onCheckedChange={(checked) =>
                                  duty(
                                    index,
                                    "departmentIds",
                                    checked
                                      ? [...item.departmentIds, team.id]
                                      : item.departmentIds.filter(
                                          (id) => id !== team.id,
                                        ),
                                  )
                                }
                              />
                              {team.name}
                            </label>
                          ))}
                        {item.departmentIds
                          .filter(
                            (id) => !departments.some((team) => team.id === id),
                          )
                          .map((id) => (
                            <Button
                              key={id}
                              type="button"
                              variant="outline"
                              onClick={() =>
                                duty(
                                  index,
                                  "departmentIds",
                                  item.departmentIds.filter(
                                    (value) => value !== id,
                                  ),
                                )
                              }
                            >
                              Gỡ Ban ngành không còn tồn tại: {id}
                            </Button>
                          ))}
                      </div>
                    </details>
                  )}
                </>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={
              settings.template === "quarterly_work" ||
              event.responsibilities.length >= 20
            }
            onClick={() =>
              change("responsibilities", [
                ...event.responsibilities,
                {
                  id: createRequestId(),
                  name: "",
                  description: "",
                  assignments: [],
                  departmentIds: [],
                },
              ])
            }
          >
            <Plus size={16} />
            Thêm trách nhiệm
          </Button>
        </section>
        {error && <ErrorMessage error={new Error(error)} />}
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Lưu chương trình vào bản soạn</Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
