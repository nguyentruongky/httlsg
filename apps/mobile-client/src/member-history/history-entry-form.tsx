import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { demo, localToday, NoteInputSchema, VisitInputSchema } from "@org/core";
import { Button } from "@org/ui";
import { LoaderCircle } from "lucide-react";
import { DateInput } from "../date-input";
import { useKeyboardScrollSpace } from "../use-keyboard-scroll-space";
import { ClientError } from "../locale";
export function HistoryEntryForm({
  kind,
  org,
  memberId,
  onClose,
  onUpdated,
  onSavingChange,
  inDialog = false,
}: {
  inDialog?: boolean;
  kind: "notes" | "visits";
  onSavingChange?: (saving: boolean) => void;
  org: string;
  memberId: string;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}) {
  const client = useQueryClient();
  const noteInput = useKeyboardScrollSpace(kind === "notes" && !inDialog);
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [text, setText] = useState(""),
    [date, setDate] = useState(localToday),
    [error, setError] = useState<unknown>(null);
  const submitting = useRef(false);
  const mutation = useMutation({
    mutationFn: () =>
      kind === "notes"
        ? demo.addNote(org, memberId, { text, visibility })
        : demo.addVisit(org, memberId, { visitedOn: date }),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: ["organizations", org, "member-history", memberId],
        exact: true,
      });
      await onUpdated();
      onClose();
    },
  });
  return (
    <form
      data-member-note-editor={kind === "notes" ? memberId : undefined}
      aria-label={kind === "notes" ? "Thêm ghi chú" : "Thêm lần thăm viếng"}
      className={
        inDialog
          ? "member-note-form"
          : kind === "visits"
            ? "member-ui-enter member-field-editor mb-5 space-y-3 bg-white dark:bg-background"
            : "member-ui-enter mb-5 space-y-3 rounded-xl border bg-background p-4"
      }
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (submitting.current) return;
        const parsed =
          kind === "notes"
            ? NoteInputSchema.safeParse({ text, visibility })
            : VisitInputSchema.safeParse({ visitedOn: date });
        if (!parsed.success) {
          setError(new Error(parsed.error.issues[0].message));
          return;
        }
        setError(null);
        submitting.current = true;
        onSavingChange?.(true);
        void mutation
          .mutateAsync()
          .catch(() => {})
          .finally(() => {
            submitting.current = false;
            onSavingChange?.(false);
          });
      }}
    >
      <fieldset disabled={mutation.isPending} className="space-y-3">
        {kind === "visits" && (
          <DateInput
            inline
            autoFocus
            aria-label="Ngày thăm viếng"
            value={date}
            max={localToday()}
            onChange={setDate}
            className="block min-h-12 w-full min-w-0 appearance-none rounded-none border-0 bg-transparent px-0 py-2 font-[inherit] text-inherit max-lg:text-[max(16px,1em)] leading-relaxed shadow-none outline-none disabled:opacity-50"
          />
        )}
        {kind === "notes" && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Quyền xem</legend>
            <div className="flex gap-4">
              {(["private", "public"] as const).map((value) => (
                <label
                  key={value}
                  className="flex min-h-11 items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={value}
                    checked={visibility === value}
                    onChange={() => setVisibility(value)}
                  />
                  {value === "private" ? "Private" : "Public"}
                </label>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {visibility === "private"
                ? "Chỉ bạn có thể xem ghi chú này."
                : "Người có quyền đọc ghi chú thành viên có thể xem."}
            </p>
          </fieldset>
        )}
        {kind === "notes" && (
          <label className="block text-sm font-medium">
            Nội dung ghi chú
            <div className="relative mt-2">
              <textarea
                ref={noteInput}
                aria-label={
                  kind === "notes" ? "Nội dung ghi chú" : "Nội dung thăm viếng"
                }
                autoFocus
                maxLength={4000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="h-40 w-full resize-none rounded-lg border border-input bg-card px-3 py-3 text-base text-card-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 box-border"
              />
            </div>
          </label>
        )}
      </fieldset>
      {(error || mutation.error) && (
        <ClientError error={error ?? mutation.error} />
      )}
      <div className="flex gap-2">
        <Button type="submit" size="touch" disabled={mutation.isPending}>
          {mutation.isPending && (
            <LoaderCircle size={16} className="animate-spin" />
          )}
          {mutation.isPending ? "Đang lưu…" : "Lưu"}
        </Button>
        <Button
          type="button"
          size="touch"
          variant="outline"
          disabled={mutation.isPending}
          onClick={onClose}
        >
          Hủy
        </Button>
      </div>
    </form>
  );
}
