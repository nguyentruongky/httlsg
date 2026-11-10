"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import {
  apiRequest,
  PERSONNEL_MINISTRY_NAMES,
  PERSONNEL_CHOIR_NAMES,
  PERSONNEL_MISSION_LABELS,
  PersonnelMissionsInput,
  personnelDepartmentKey,
  type PersonnelMissionsData,
  type PersonnelMissionValue,
} from "@org/core";
import { Button, Dialog, ErrorMessage, Select, useToast } from "@org/ui";

type Target = { id: string; name: string };
type DraftMission = {
  key: number;
  kind: PersonnelMissionValue["kind"] | "";
  departmentId: string | null;
};
export function PersonnelMissionsDialog({
  target,
  onClose,
  onSaved,
}: {
  target: Target;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, setPending] = useState(false);
  const query = useQuery({
    queryKey: ["personnel-missions", target.id],
    queryFn: ({ signal }) =>
      apiRequest<PersonnelMissionsData>(
        `/api/admin/personnel/${target.id}/missions`,
        { signal },
      ),
    staleTime: 0,
    gcTime: 0,
  });
  return (
    <Dialog
      open
      title="Thay đổi công tác"
      className="personnel-missions-dialog"
      description={target.name}
      closeLabel="Đóng công tác"
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      {query.isPending ? (
        <p role="status">Đang tải công tác…</p>
      ) : query.error ? (
        <ErrorMessage error={query.error} />
      ) : (
        <MissionsForm
          target={target}
          data={query.data!}
          onPending={setPending}
          onSaved={() => {
            onSaved();
            onClose();
          }}
        />
      )}
    </Dialog>
  );
}
function MissionsForm({
  target,
  data,
  onPending,
  onSaved,
}: {
  target: Target;
  data: PersonnelMissionsData;
  onPending: (value: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<DraftMission[]>(() =>
    data.missions.map((mission, key) => ({ ...mission, key })),
  );
  const [nextKey, setNextKey] = useState(data.missions.length);
  const groupOptions = (names: readonly string[]) =>
    names.map((name) => ({
      label: name,
      department: data.departments.find(
        (item) =>
          personnelDepartmentKey(item.name) === personnelDepartmentKey(name),
      ),
    }));
  const choirs = groupOptions(PERSONNEL_CHOIR_NAMES);
  const ministries = groupOptions(PERSONNEL_MINISTRY_NAMES);
  function options(includeChoirs: boolean) {
    return (
      <>
        {includeChoirs && (
          <optgroup label="Ban hát">
            {choirs.map(
              (item) =>
                item.department && (
                  <option key={item.department.id} value={item.department.id}>
                    {item.label}
                  </option>
                ),
            )}
          </optgroup>
        )}
        <optgroup label="Ban ngành">
          {ministries.map(
            (item) =>
              item.department && (
                <option key={item.department.id} value={item.department.id}>
                  {item.label}
                </option>
              ),
          )}
        </optgroup>
        {data.departments
          .filter(
            (item) =>
              entries.some((entry) => entry.departmentId === item.id) &&
              ![...choirs, ...ministries].some(
                (option) => option.department?.id === item.id,
              ),
          )
          .map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
      </>
    );
  }
  const mutation = useMutation({
    onMutate: () => onPending(true),
    mutationFn: () =>
      apiRequest(`/api/admin/personnel/${target.id}/missions`, {
        method: "PUT",
        body: JSON.stringify(
          PersonnelMissionsInput.parse({
            revision: data.revision,
            missions: entries.map(({ kind, departmentId }) => ({
              kind,
              departmentId,
            })),
          }),
        ),
      }),
    onSuccess: () => {
      toast({ title: "Đã thay đổi công tác", variant: "success" });
      onSaved();
    },
    onSettled: () => onPending(false),
  });
  const valid = PersonnelMissionsInput.safeParse({
    revision: data.revision,
    missions: entries.map(({ kind, departmentId }) => ({ kind, departmentId })),
  }).success;
  function update(key: number, patch: Partial<DraftMission>) {
    setEntries((old) =>
      old.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) mutation.mutate();
      }}
    >
      <div className="space-y-4">
        {entries.map((entry, index) => (
          <div key={entry.key} className="space-y-2">
            <label
              htmlFor={`mission-${entry.key}`}
              className="block text-sm text-muted-foreground"
            >
              Công tác {index + 1}
            </label>
            <div className="flex items-center gap-2">
              <Select
                id={`mission-${entry.key}`}
                className="min-w-0 flex-1"
                disabled={mutation.isPending}
                value={
                  entry.kind === "department"
                    ? `department:${entry.departmentId}`
                    : entry.kind
                }
                onChange={(event) => {
                  const value = event.target.value;
                  if (value.startsWith("department:"))
                    update(entry.key, {
                      kind: "department",
                      departmentId: value.slice(11),
                    });
                  else {
                    const kind = value as DraftMission["kind"];
                    update(entry.key, {
                      kind,
                      departmentId: ["board", "leader", "specialist"].includes(
                        kind,
                      )
                        ? kind === "leader" &&
                          choirs.some(
                            (item) =>
                              item.department?.id === entry.departmentId,
                          )
                          ? null
                          : entry.departmentId
                        : null,
                    });
                  }
                }}
              >
                <option value="">Chọn công tác</option>
                <optgroup label="Vai trò">
                  {Object.entries(PERSONNEL_MISSION_LABELS)
                    .filter(([kind]) => kind !== "department")
                    .map(([kind, label]) => (
                      <option key={kind} value={kind}>
                        {label}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Ban ngành">
                  {ministries.map(
                    (item) =>
                      item.department && (
                        <option
                          key={item.department.id}
                          value={`department:${item.department.id}`}
                        >
                          {item.label}
                        </option>
                      ),
                  )}
                </optgroup>
                {entry.kind === "department" &&
                  ![...choirs, ...ministries].some(
                    (item) => item.department?.id === entry.departmentId,
                  ) && (
                    <option value={`department:${entry.departmentId}`}>
                      {data.departments.find(
                        (item) => item.id === entry.departmentId,
                      )?.name ?? "Ban hiện tại"}
                    </option>
                  )}
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground"
                aria-label={`Xóa công tác ${index + 1}`}
                disabled={mutation.isPending}
                onClick={() =>
                  setEntries((old) =>
                    old.filter((item) => item.key !== entry.key),
                  )
                }
              >
                <Trash2 size={18} />
              </Button>
            </div>
            {["board", "leader", "specialist"].includes(entry.kind) && (
              <Select
                aria-label={`Ban hát hoặc Ban ngành cho công tác ${index + 1}`}
                className="w-full"
                disabled={mutation.isPending}
                value={entry.departmentId ?? ""}
                onChange={(event) =>
                  update(entry.key, {
                    departmentId: event.target.value || null,
                  })
                }
              >
                <option value="">
                  {entry.kind === "leader"
                    ? "Chọn Ban ngành"
                    : "Chọn Ban hát hoặc Ban ngành"}
                </option>
                {options(entry.kind !== "leader")}
              </Select>
            )}
          </div>
        ))}
      </div>
      {!entries.length && (
        <p className="text-sm text-muted-foreground">
          Chưa có công tác. Chọn “Thêm công tác” để phân công.
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={mutation.isPending || entries.length >= 50}
        onClick={() => {
          setEntries((old) => [
            ...old,
            { key: nextKey, kind: "", departmentId: null },
          ]);
          setNextKey((key) => key + 1);
        }}
      >
        <Plus size={16} />
        Thêm công tác
      </Button>
      {mutation.error && <ErrorMessage error={mutation.error} />}
      <div className="flex justify-end">
        <Button type="submit" disabled={!valid || mutation.isPending}>
          {mutation.isPending ? "Đang lưu…" : "Lưu"}
        </Button>
      </div>
    </form>
  );
}
