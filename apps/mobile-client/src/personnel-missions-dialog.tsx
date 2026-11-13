"use client";
import {
  Children,
  isValidElement,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
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
import { Button, Dialog, ErrorMessage, Dropdown, useToast } from "@org/ui";

// Keep mobile choices inside the dialog so they share its focus and scroll area.
function MissionSelect({
  children,
  value,
  onValueChange,
  className,
  ...props
}: {
  children: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const options: { value: string; label: ReactNode; group?: string }[] = [];
  function collect(nodes: ReactNode, group?: string) {
    Children.forEach(nodes, (node) => {
      if (
        !isValidElement<{
          value?: string;
          label?: string;
          children?: ReactNode;
        }>(node)
      )
        return;
      if (node.type === "option") {
        options.push({
          value: node.props.value ?? "",
          label: node.props.children,
          group,
        });
      } else {
        collect(
          node.props.children,
          node.type === "optgroup" ? node.props.label : group,
        );
      }
    });
  }
  collect(children);
  return (
    <div className={className}>
      <div className="hidden md:block">
        <Dropdown
          {...props}
          value={value}
          className="w-full"
          onChange={(event) => onValueChange(event.target.value)}
        >
          {children}
        </Dropdown>
      </div>
      <div className="md:hidden">
        <Dropdown.Trigger
          indicator={false}
          {...props}
          ref={trigger}
          id={props.id ? `${props.id}-mobile` : undefined}
          type="button"
          aria-labelledby={props.id ? `${props.id}-label` : undefined}
          aria-expanded={expanded && !props.disabled}
          aria-controls={listId}
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left text-sm disabled:opacity-50"
          onClick={() => setExpanded((open) => !open)}
        >
          <span>
            {options.find((option) => option.value === value)?.label ??
              "Chọn công tác"}
          </span>
          <ChevronDown size={16} className="shrink-0" />
        </Dropdown.Trigger>
        {expanded && !props.disabled && (
          <div
            id={listId}
            className="mt-2 max-h-64 space-y-1 overflow-y-auto overscroll-contain rounded-lg border bg-white text-slate-950 p-2"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setExpanded(false);
                trigger.current?.focus();
              }
            }}
          >
            {options.map((option, index) => (
              <div key={option.value}>
                {option.group && option.group !== options[index - 1]?.group && (
                  <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                    {option.group}
                  </p>
                )}
                <button
                  type="button"
                  aria-pressed={option.value === value}
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted aria-pressed:bg-muted"
                  onClick={() => {
                    onValueChange(option.value);
                    setExpanded(false);
                    trigger.current?.focus({ preventScroll: true });
                  }}
                >
                  <span>{option.label}</span>
                  {option.value === value && (
                    <Check size={16} className="shrink-0" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
      title="Phân công công tác"
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
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) mutation.mutate();
      }}
    >
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div key={entry.key} className="space-y-2">
            <label
              id={`mission-${entry.key}-label`}
              htmlFor={`mission-${entry.key}`}
              className="block text-sm text-muted-foreground"
            >
              Công tác {index + 1}
            </label>
            <div className="flex items-center gap-2">
              <MissionSelect
                id={`mission-${entry.key}`}
                className="min-w-0 flex-1"
                disabled={mutation.isPending}
                value={
                  entry.kind === "department"
                    ? `department:${entry.departmentId}`
                    : entry.kind
                }
                onValueChange={(value) => {
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
              </MissionSelect>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0 text-muted-foreground"
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
              <MissionSelect
                aria-label={`Ban hát hoặc Ban ngành cho công tác ${index + 1}`}
                className="w-[calc(100%_-_3.25rem)]"
                disabled={mutation.isPending}
                value={entry.departmentId ?? ""}
                onValueChange={(value) =>
                  update(entry.key, {
                    departmentId: value || null,
                  })
                }
              >
                <option value="">
                  {entry.kind === "leader"
                    ? "Chọn Ban ngành"
                    : "Chọn Ban hát hoặc Ban ngành"}
                </option>
                {options(entry.kind !== "leader")}
              </MissionSelect>
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
