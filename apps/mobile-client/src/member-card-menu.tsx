import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MoreVertical,
  Pencil,
  ListChecks,
  BriefcaseBusiness,
  Music,
  KeyRound,
  Shield,
  UserRoundCheck,
  Trash2,
} from "lucide-react";
import {
  apiRequest,
  getDirectoryMember,
  invalidateMemberReads,
  useAuth,
} from "@org/core";
import { Button, Dialog, ErrorMessage, Popover } from "@org/ui";
import { AccountCredentials } from "./account-credentials";
import { MemberStatusSheet } from "./member-status-sheet";
import { MemberChoirSheet } from "./member-choir-sheet";
import { MemberRoleAssignment } from "./member-role-assignment";
import { PersonnelMissionsDialog } from "./personnel-missions-dialog";

type Action =
  | "edit"
  | "status"
  | "missions"
  | "choir"
  | "credentials"
  | "permissions"
  | "delete";
export type MemberCardMenuMember = {
  id: string;
  name: string;
  userId?: string;
  phone?: string | null;
  email?: string | null;
  accountStatus?: "active" | "invited" | "suspended";
};

/** One permission-aware action sheet shared by both administrative member lists. */
export function MemberCardMenu({
  org,
  member,
  onEdit,
  profileHref,
}: {
  org: string;
  member: MemberCardMenuMember;
  onEdit?: () => void;
  profileHref?: string;
}) {
  const actor = useAuth()?.user;
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 767px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setMobile(media.matches);
      setOpen(false);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const [action, setAction] = useState<Action | null>(null);
  const pending = useRef<Action | null>(null);
  const editLink = useRef<HTMLAnchorElement>(null);
  const trigger = useRef<HTMLSpanElement>(null);
  const canManage = Boolean(actor && actor.role !== "deacon");
  const canManageAccount =
    canManage && (member.userId ?? member.id) !== actor?.id;
  const canChangeChoir = ["admin", "secretary"].includes(actor?.role ?? "");
  const detail = useQuery({
    queryKey: ["organizations", org, "member", member.id],
    queryFn: () => getDirectoryMember(org, member.id, false),
    enabled: open && canManageAccount && !member.accountStatus,
    staleTime: 0,
  });
  const accountStatus = member.accountStatus ?? detail.data?.status;
  const access = useMutation({
    mutationFn: () =>
      apiRequest("/api/admin/users/access", {
        method: "POST",
        body: JSON.stringify({
          ids: [member.id],
          status: "active",
        }),
      }),
    onSuccess: async () => {
      setOpen(false);
      await invalidateMemberReads(client, org);
    },
  });
  const deletion = useMutation({
    mutationFn: () =>
      apiRequest(`/api/members/${member.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setAction(null);
      await invalidateMemberReads(client, org);
    },
  });
  function choose(next: Action) {
    pending.current = next;
    setOpen(false);
  }
  function item(
    next: Action,
    label: string,
    icon: ReactNode,
    destructive = false,
  ) {
    return (
      <Button
        type="button"
        variant="ghost"
        className={`min-h-11 w-full justify-start gap-3 ${destructive ? "text-destructive" : ""}`}
        onClick={() => choose(next)}
        disabled={access.isPending}
      >
        {icon}
        {label}
      </Button>
    );
  }
  function onMenuCloseAutoFocus(event: Event) {
    const next = pending.current;
    event.preventDefault();
    if (!next) {
      trigger.current?.querySelector("button")?.focus();
      return;
    }
    pending.current = null;
    if (next === "edit") {
      if (onEdit) onEdit();
      else editLink.current?.click();
    } else {
      deletion.reset();
      setAction(next);
    }
  }
  const menuItems = (
    <>
      <div className="space-y-0.5">
        {canManage && item("edit", "Cập nhật thông tin", <Pencil size={17} />)}
        {item("status", "Cập nhật trạng thái", <ListChecks size={17} />)}
        {canManage &&
          item(
            "missions",
            "Thay đổi công tác",
            <BriefcaseBusiness size={17} />,
          )}
        {canChangeChoir && item("choir", "Đổi ban hát lễ", <Music size={17} />)}
        {canManageAccount && (
          <>
            {item("credentials", "Thông tin đăng nhập", <KeyRound size={17} />)}
            {item("permissions", "Phân quyền", <Shield size={17} />)}
            {accountStatus === "suspended" && (
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 w-full justify-start gap-3"
                disabled={access.isPending}
                onClick={() => access.mutate()}
              >
                <UserRoundCheck size={17} />
                {access.isPending ? "Đang cập nhật…" : "Kích hoạt tài khoản"}
              </Button>
            )}
            {item("delete", "Xóa thành viên", <Trash2 size={17} />, true)}
          </>
        )}
      </div>
      {access.error && <ErrorMessage error={access.error} />}
      {!member.accountStatus && detail.error && canManageAccount && (
        <div className="mt-2 space-y-2">
          <ErrorMessage error={detail.error} />
          <Button variant="outline" onClick={() => void detail.refetch()}>
            Thử lại
          </Button>
        </div>
      )}
    </>
  );
  return (
    <Popover.Root
      modal
      open={!mobile && open}
      onOpenChange={(value) => {
        if (!access.isPending) setOpen(value);
      }}
    >
      <a
        ref={editLink}
        href={profileHref ?? `/client/members/${member.id}`}
        hidden
        tabIndex={-1}
        aria-hidden="true"
      >
        {member.name}
      </a>
      <Popover.Anchor asChild>
        <span ref={trigger}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            aria-label={`Thao tác cho ${member.name}`}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={(event) => {
              event.stopPropagation();
              access.reset();
              setOpen((value) => !value);
            }}
          >
            <MoreVertical size={20} />
          </Button>
        </span>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          aria-label={`Thao tác cho ${member.name}`}
          onCloseAutoFocus={onMenuCloseAutoFocus}
          className="z-50 max-h-[min(85dvh,var(--radix-popover-content-available-height))] w-72 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border bg-popover p-2 text-popover-foreground shadow-xl"
        >
          <p className="px-3 py-2 text-sm font-semibold">{member.name}</p>
          {menuItems}
        </Popover.Content>
      </Popover.Portal>
      <Dialog
        open={mobile && open}
        onOpenChange={(value) => {
          if (!access.isPending) setOpen(value);
        }}
        title="Thao tác thành viên"
        description={member.name}
        closeLabel="Đóng menu thành viên"
        bottomSheet
        onCloseAutoFocus={onMenuCloseAutoFocus}
      >
        {menuItems}
      </Dialog>
      {action === "status" && (
        <MemberStatusSheet
          org={org}
          memberId={member.id}
          name={member.name}
          onClose={() => setAction(null)}
        />
      )}
      {action === "choir" && (
        <MemberChoirSheet
          org={org}
          memberId={member.id}
          name={member.name}
          onClose={() => setAction(null)}
        />
      )}
      {action === "missions" && (
        <PersonnelMissionsDialog
          target={member}
          onClose={() => setAction(null)}
          onSaved={() => {
            void invalidateMemberReads(client, org);
          }}
        />
      )}
      {action === "credentials" && (
        <AccountCredentials
          member={{
            id: member.id,
            phone: member.phone,
            user: { email: member.email ?? null },
          }}
          org={org}
          onClose={() => {
            setAction(null);
            void invalidateMemberReads(client, org);
          }}
        />
      )}
      {action === "permissions" && (
        <MemberRoleAssignment
          memberId={member.id}
          org={org}
          onClose={() => setAction(null)}
        />
      )}
      <Dialog
        open={action === "delete"}
        onOpenChange={(value) => {
          if (!value && !deletion.isPending) setAction(null);
        }}
        title="Xóa thành viên"
        description={`Xóa ${member.name} khỏi danh sách và vô hiệu hóa đăng nhập?`}
        closeLabel="Đóng xác nhận xóa"
      >
        {deletion.error && <ErrorMessage error={deletion.error} />}
        <div className="flex gap-2">
          <Button
            disabled={deletion.isPending}
            onClick={() => deletion.mutate()}
          >
            Xác nhận xóa
          </Button>
          <Button
            variant="outline"
            disabled={deletion.isPending}
            onClick={() => setAction(null)}
          >
            Hủy
          </Button>
        </div>
      </Dialog>
    </Popover.Root>
  );
}
