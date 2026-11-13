import { useFieldEditorDismiss } from "./member-profile/use-field-editor-dismiss";
import { DateInput } from "./date-input";
import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { LoaderCircle } from "lucide-react";
import { Button, Input } from "@org/ui";
import { ClientError } from "./locale";
export function InlineMemberField<T>({
  label,
  icon: Icon,
  value,
  display,
  editable,
  editing,
  disabled,
  onStart,
  onCancel,
  onSave,
  type = "text",
  editor,
  displayIsLink = false,
  hideLabel = false,
  actionLabel,
  subdetail = false,
  labelAction,
}: {
  displayIsLink?: boolean;
  hideLabel?: boolean;
  actionLabel?: string;
  subdetail?: boolean;
  labelAction?: ReactNode;
  label: string;
  icon: ElementType;
  value: T;
  display: ReactNode;
  editable: boolean;
  editing: boolean;
  disabled: boolean;
  onStart: () => void;
  onCancel: () => void;
  onSave: (value: T) => Promise<void>;
  type?: string;
  editor?: (value: T, onChange: (value: T) => void) => ReactNode;
}) {
  return (
    <div
      className={`flex overflow-x-clip gap-3 ${subdetail ? "py-0" : "py-3.5"}`}
    >
      {!hideLabel && (
        <Icon
          size={17}
          className={`${labelAction ? "mt-3.5" : "mt-1"} shrink-0 text-muted-foreground`}
        />
      )}
      <div className="min-w-0 flex-1">
        <dt
          className={
            hideLabel
              ? "sr-only"
              : labelAction
                ? "flex items-center justify-between gap-3 text-xs text-muted-foreground"
                : "text-xs text-muted-foreground"
          }
        >
          {displayIsLink && editable && !editing ? (
            <button
              type="button"
              aria-label={`Sửa ${label}`}
              disabled={disabled}
              onClick={onStart}
              className="min-h-9 rounded text-left focus-visible:ring-2 focus-visible:ring-ring"
            >
              {label}
            </button>
          ) : (
            label
          )}
          {labelAction}
        </dt>
        <dd
          key={editing ? "editing" : "display"}
          className={`${editing ? "member-ui-enter" : "member-ui-back"} break-words ${subdetail && !editing ? "text-xs text-muted-foreground" : "mt-1 text-sm"}`}
        >
          {editing ? (
            <FieldEditor
              label={label}
              value={value}
              disabled={disabled}
              onSave={onSave}
              onCancel={onCancel}
              type={type}
              editor={editor}
            />
          ) : editable && !displayIsLink ? (
            <button
              type="button"
              aria-label={
                actionLabel ? `${actionLabel} ${label}` : `Sửa ${label}`
              }
              className={`${subdetail ? "min-h-11 py-1" : "min-h-12 py-2"} w-full rounded-lg leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${actionLabel ? "border text-center font-medium hover:bg-muted/50" : "text-left"}`}
              disabled={disabled}
              onClick={onStart}
            >
              {actionLabel ?? display}
            </button>
          ) : (
            display
          )}
        </dd>
      </div>
    </div>
  );
}
function FieldEditor<T>({
  label,
  value,
  disabled,
  onSave,
  onCancel,
  type,
  editor,
}: {
  label: string;
  value: T;
  disabled: boolean;
  onSave: (value: T) => Promise<void>;
  onCancel: () => void;
  type: string;
  editor?: (value: T, onChange: (value: T) => void) => ReactNode;
}) {
  const [draft, setDraft] = useState(value),
    [error, setError] = useState<unknown>(null);
  const form = useFieldEditorDismiss(disabled, onCancel);
  return (
    <form
      ref={form}
      aria-label={`Chỉnh sửa ${label}`}
      className="mt-2 space-y-3 member-field-editor"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        void onSave(draft).catch(setError);
      }}
    >
      <fieldset disabled={disabled} className="space-y-3">
        {editor ? (
          editor(draft, setDraft)
        ) : type === "date" ? (
          <DateInput
            autoFocus
            aria-label={label}
            value={String(draft ?? "")}
            onChange={(next) => setDraft(next as T)}
            className="profile-edit-input min-h-12 text-base"
          />
        ) : (
          <Input
            autoFocus
            aria-label={label}
            type={type}
            placeholder={
              type === "email"
                ? "Nhập email, ví dụ: ten@example.com"
                : type === "tel"
                  ? "Nhập số điện thoại"
                  : `Nhập ${label.toLocaleLowerCase("vi")}…`
            }
            value={String(draft ?? "")}
            onChange={(e) => setDraft(e.target.value as T)}
            className="profile-edit-input min-h-12 text-base"
          />
        )}
      </fieldset>
      {error != null && <ClientError error={error} />}
      <div className="flex gap-2">
        <Button type="submit" size="touch" disabled={disabled}>
          {disabled ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : null}
          {disabled ? "Đang lưu…" : "Lưu"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="touch"
          disabled={disabled}
          onClick={onCancel}
        >
          Hủy
        </Button>
      </div>
    </form>
  );
}
