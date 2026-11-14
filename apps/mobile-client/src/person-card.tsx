import type { MouseEvent, ReactNode } from "react";
import { Phone, Mail, Check } from "lucide-react";
import { Avatar, cn } from "@org/ui";
import type { DirectoryQuery } from "@org/core";
import { MemberStatusTag } from "./member-status-tag";

type PersonCardProps = {
  name: string;
  href?: string;
  onOpen?: (event: MouseEvent<HTMLElement>) => void;
  status?: string | null;
  onFilterStatus?: (
    status: NonNullable<DirectoryQuery["churchStatuses"]>[number],
  ) => void;
  departments?: ReactNode;
  phone?: string | null;
  email?: string | null;
  actions?: ReactNode;
  colorIndex?: number;
  selected?: boolean;
  onAvatarClick?: () => void;
  avatarLabel?: string;
  disabled?: boolean;
  className?: string;
};

/** Shared compact layout for directories, member cards, and person pickers. */
export function PersonCard({
  name,
  href,
  onOpen,
  status,
  onFilterStatus,
  departments,
  phone,
  email,
  actions,
  colorIndex,
  selected,
  onAvatarClick,
  avatarLabel,
  disabled,
  className,
}: PersonCardProps) {
  const avatar = (
    <>
      <Avatar
        name={name}
        variant="member"
        colorIndex={colorIndex}
        className="size-11 shrink-0"
      />
      {selected && (
        <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Check size={20} />
        </span>
      )}
    </>
  );
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border bg-card px-3 py-2.5",
        selected && "border-primary/40 bg-accent/20",
        (href || onOpen) && !disabled && "cursor-pointer",
        disabled && "opacity-60",
        className,
      )}
      onClick={(event) => {
        if (
          disabled ||
          !(event.target instanceof Element) ||
          !event.currentTarget.contains(event.target) ||
          event.target.closest(
            'a,button,input,select,textarea,[role="button"],[role="checkbox"]',
          )
        )
          return;
        if (href) {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return;
          event.currentTarget
            .querySelector<HTMLAnchorElement>("[data-person-link]")
            ?.click();
        } else {
          onOpen?.(event);
        }
      }}
    >
      <div className="flex items-start gap-3">
        {onAvatarClick ? (
          <button
            type="button"
            className="relative shrink-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={avatarLabel ?? `Chọn ${name}`}
            aria-pressed={Boolean(selected)}
            disabled={disabled}
            onClick={onAvatarClick}
          >
            {avatar}
          </button>
        ) : (
          <div className="relative shrink-0">{avatar}</div>
        )}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="wrap-break-word text-base font-semibold leading-tight">
            {href ? (
              <a
                data-person-link
                href={href}
                onClick={onOpen}
                className="hover:underline"
              >
                {name}
              </a>
            ) : onOpen ? (
              <button
                type="button"
                disabled={disabled}
                onClick={onOpen}
                className="text-left hover:underline"
              >
                {name}
              </button>
            ) : (
              name
            )}
          </div>
          {status !== undefined && (
            <MemberStatusTag status={status} onFilter={onFilterStatus} />
          )}
          {departments && (
            <div className="truncate text-sm leading-tight text-muted-foreground">
              {departments}
            </div>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {(phone || email) && (
        <div className="mt-1.5 flex min-w-0 flex-wrap gap-x-4 gap-y-0.5 border-t pt-1 text-sm text-muted-foreground">
          {phone && (
            <a
              href={`tel:${phone.replace(/[^+0-9]/g, "")}`}
              className="inline-flex min-h-7 min-w-0 items-center gap-1.5 hover:underline"
            >
              <Phone size={13} className="shrink-0" />
              <span className="wrap-break-word">{phone}</span>
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="inline-flex min-h-7 min-w-0 items-center gap-1.5 hover:underline"
            >
              <Mail size={13} className="shrink-0" />
              <span className="break-all">{email}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
