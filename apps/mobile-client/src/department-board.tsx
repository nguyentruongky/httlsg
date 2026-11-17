"use client";
import { PersonCard } from "./person-card";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, invalidateMemberReads, useWorkspace } from "@org/core";
import { Button, Dialog, Input, useToast } from "@org/ui";
export type BoardPerson = { id: string; name: string; position: string };
export type BoardYear = {
  year: number;
  revision: number;
  members: BoardPerson[];
};
export const BOARD_POSITIONS = [
  "Trưởng ban",
  "Phó ban",
  "Thư ký",
  "Thủ quỹ",
  "Ủy viên",
];
const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .toLocaleLowerCase("vi");
export function BoardRoleEditor({
  departmentId,
  year,
  revision,
  person,
  isBoardMember,
  onClose,
}: {
  departmentId: string;
  year: number;
  revision: number;
  person: BoardPerson;
  isBoardMember: boolean;
  onClose: () => void;
}) {
  const [baseRevision] = useState(revision);
  const [position] = useState(() =>
    isBoardMember
      ? (BOARD_POSITIONS.find((item) => fold(item) === fold(person.position)) ??
        "")
      : "",
  );
  const org = useWorkspace((state) => state.organizationId);
  const client = useQueryClient(),
    { toast } = useToast();
  const submitting = useRef(false);
  const save = useMutation({
    mutationFn: (nextPosition: string | null) =>
      apiRequest(
        "/api/admin/departments/" + encodeURIComponent(departmentId) + "/board",
        {
          method: "PATCH",
          body: JSON.stringify({
            year,
            revision: baseRevision,
            id: person.id,
            position: nextPosition,
          }),
        },
      ),
    onSuccess: async () => {
      await invalidateMemberReads(client, org);
      toast({
        title: `Đã cập nhật Ban điều hành năm ${year} của ${person.name}`,
        variant: "success",
      });
    },
    onError: (error) => {
      void client.invalidateQueries({
        queryKey: ["department-board-history", departmentId],
      });
      toast({
        title: "Không thể cập nhật Ban điều hành",
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại.",
        variant: "error",
      });
    },
  });
  function selectPosition(next: string | null) {
    if (submitting.current) return;
    submitting.current = true;
    save.mutate(next);
    onClose();
  }
  return (
    <Dialog
      open
      bottomSheet
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
      title={`Phân công Ban điều hành năm ${year}`}
      description={person.name}
      closeLabel="Đóng phân công"
    >
      <fieldset
        role="radiogroup"
        aria-label="Chức vụ"
        className="space-y-1"
        disabled={save.isPending}
      >
        <legend className="mb-2 text-sm font-medium">Chức vụ</legend>
        {BOARD_POSITIONS.map((item) => (
          <label
            key={item}
            className="flex min-h-12 cursor-pointer items-center gap-3 py-3"
          >
            <input
              type="radio"
              name="department-board-position"
              value={item}
              checked={position === item}
              onChange={() => selectPosition(item)}
              className="size-4 accent-primary"
            />
            <span>{item}</span>
          </label>
        ))}
      </fieldset>
      {isBoardMember && (
        <Button
          type="button"
          variant="ghost"
          className="mt-3 text-destructive"
          disabled={save.isPending}
          onClick={() => selectPosition(null)}
        >
          Gỡ khỏi Ban điều hành
        </Button>
      )}
    </Dialog>
  );
}
export function BoardYears({
  items,
  year,
  onChoose,
  onClose,
}: {
  items: BoardYear[];
  year: number;
  onChoose: (year: number) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(year),
    [input, setInput] = useState(String(year));
  const record = items.find((item) => item.year === selected);
  const years = [
    ...new Set([...items.map((item) => item.year), year, selected]),
  ].sort((a, b) => b - a);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Danh sách BĐH các năm"
      description=""
      closeLabel="Đóng danh sách BĐH các năm"
    >
      <div className="space-y-4">
        <div
          role="group"
          aria-label="Năm Ban điều hành"
          className="flex flex-wrap gap-2"
        >
          {years.map((value) => (
            <Button
              type="button"
              key={value}
              variant={value === selected ? "default" : "outline"}
              aria-pressed={value === selected}
              onClick={() => {
                setSelected(value);
                setInput(String(value));
              }}
            >
              {value}
            </Button>
          ))}
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const value = Number(input);
            if (Number.isInteger(value) && value >= 1900 && value <= 2200)
              setSelected(value);
          }}
        >
          <label className="min-w-0 flex-1 text-sm">
            Năm
            <Input
              aria-label="Nhập năm Ban điều hành"
              type="number"
              min={1900}
              max={2200}
              required
              className="mt-2 w-full"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
          </label>
          <Button type="submit" variant="outline">
            Xem
          </Button>
        </form>
        <h2 className="font-semibold">Ban điều hành năm {selected}</h2>
        <ul className="divide-y">
          {record?.members.map((person) => (
            <li key={person.id} className="py-1">
              <PersonCard name={person.name} departments={person.position} />
            </li>
          ))}
        </ul>
        {!record?.members.length && (
          <p className="text-sm text-muted-foreground">
            Chưa có Ban điều hành cho năm này.
          </p>
        )}
        <Button type="button" onClick={() => onChoose(selected)}>
          Cập nhật năm {selected}
        </Button>
      </div>
    </Dialog>
  );
}
