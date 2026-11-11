"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@org/core";
import { Avatar, Button, Dialog, Input, ErrorMessage, useToast } from "@org/ui";
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
  const [position, setPosition] = useState(() =>
    isBoardMember
      ? (BOARD_POSITIONS.find((item) => fold(item) === fold(person.position)) ??
        "")
      : "",
  );
  const client = useQueryClient(),
    { toast } = useToast();
  const save = useMutation({
    mutationFn: (remove: boolean) =>
      apiRequest(
        "/api/admin/departments/" + encodeURIComponent(departmentId) + "/board",
        {
          method: "PATCH",
          body: JSON.stringify({
            year,
            revision: baseRevision,
            id: person.id,
            position: remove ? null : position.trim(),
          }),
        },
      ),
    onSuccess: async () => {
      await client.invalidateQueries();
      toast({
        title: "Đã cập nhật Ban điều hành năm " + year,
        variant: "success",
      });
      onClose();
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
      title="Phân công Ban điều hành"
      description={person.name + " · " + year}
      closeLabel="Đóng phân công"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (position.trim()) save.mutate(false);
        }}
      >
        <fieldset
          role="radiogroup"
          aria-label="Chức vụ"
          className="space-y-2"
          disabled={save.isPending}
        >
          <legend className="mb-2 text-sm font-medium">Chức vụ</legend>
          {BOARD_POSITIONS.map((item) => (
            <label
              key={item}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="radio"
                name="department-board-position"
                value={item}
                checked={position === item}
                onChange={() => setPosition(item)}
                className="size-4 accent-primary"
              />
              <span>{item}</span>
            </label>
          ))}
        </fieldset>
        {save.error && (
          <div className="space-y-2">
            <ErrorMessage error={save.error} />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void client.invalidateQueries({
                  queryKey: ["department-board-history", departmentId],
                });
                onClose();
              }}
            >
              Tải lại danh sách
            </Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={save.isPending || !position.trim()}>
            {save.isPending ? "Đang lưu…" : "Lưu"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending}
            onClick={onClose}
          >
            Hủy
          </Button>
          {isBoardMember && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              disabled={save.isPending}
              onClick={() => save.mutate(true)}
            >
              Gỡ khỏi Ban điều hành
            </Button>
          )}
        </div>
      </form>
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
            <li key={person.id} className="flex items-center gap-3 py-3">
              <Avatar
                name={person.name}
                className="size-11 shrink-0 rounded-2xl"
              />
              <div className="min-w-0 break-words">
                <p className="font-medium">{person.name}</p>
                <p className="text-sm text-muted-foreground">
                  {person.position}
                </p>
              </div>
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
