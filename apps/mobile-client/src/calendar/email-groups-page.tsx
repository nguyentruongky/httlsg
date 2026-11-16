"use client";
import { useId, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import {
  useAuth,
  canCalendar,
  apiRequest,
  calendarKey,
  parseBulkEmails,
  type EmailGroup,
  type EmailGroupMember,
} from "@org/core";
import { Button, Card, Dialog, Input, ErrorMessage, useToast } from "@org/ui";
export function EmailGroupsPage() {
  const auth = useAuth(),
    readOnly = !canCalendar(auth?.user, "calendar.groups"),
    allowed = canCalendar(auth?.user);
  const [target, setTarget] = useState<string | null | undefined>(undefined);
  const query = useQuery({
    queryKey: [...calendarKey, "groups"],
    queryFn: () => apiRequest<{ items: EmailGroup[] }>("/api/email-groups"),
    enabled: allowed,
  });
  if (auth?.loading) return <p role="status">Đang tải…</p>;
  if (!allowed)
    return <p role="alert">Bạn không có quyền quản lý nhóm email.</p>;
  return (
    <section className="space-y-6">
      <header data-scroll-top-bar className="sticky top-[var(--list-sticky-top,0px)] z-30 flex min-h-11 items-center justify-center gap-3 bg-background md:items-start md:justify-between">
        <Button asChild variant="ghost" size="icon" className="absolute left-0 top-0 size-11 md:hidden">
          <a href="/dashboard/settings" data-navigation="back" aria-label="Quay lại">
            <ChevronLeft size={24} />
          </a>
        </Button>
        <div className="min-w-0 max-md:px-12">
          <h1 className="text-center text-lg font-semibold tracking-tight md:text-left md:text-2xl">Nhóm email</h1>
          <p className="mt-2 hidden text-sm text-muted-foreground md:block">
            Quản lý các nhóm nhận thông báo chương trình.
          </p>
        </div>
        {!readOnly && (
          <Button
            variant="ghost"
            className="max-md:absolute max-md:right-0 max-md:top-0 max-md:size-11 max-md:p-0 md:border md:border-border"
            aria-label="Tạo nhóm email"
            onClick={() => setTarget(null)}
          >
            <Plus size={20} />
            <span className="hidden md:inline">Tạo nhóm</span>
          </Button>
        )}
      </header>
      {query.isPending ? (
        <p role="status">Đang tải nhóm email…</p>
      ) : query.error ? (
        <div>
          <ErrorMessage error={query.error} />
          <Button variant="outline" onClick={() => void query.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : !query.data?.items.length ? (
        <Card className="p-10 text-center">
          <Mail className="mx-auto mb-3 text-primary" />
          <h2 className="font-semibold">Chưa có nhóm email</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tạo nhóm đầu tiên rồi thêm các địa chỉ nhận thông báo.
          </p>
        </Card>
      ) : (
        <div
          className="divide-y rounded-xl border"
          aria-label="Danh sách nhóm email"
        >
          {query.data.items.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => setTarget(group.id)}
              className="flex w-full items-center gap-3 p-4 text-left transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <Mail
                size={20}
                className="shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block break-words font-medium">
                  {group.name}
                </span>
                {group.description && (
                  <span className="mt-1 block line-clamp-2 text-sm text-muted-foreground">
                    {group.description}
                  </span>
                )}
                <span className="mt-1 block text-xs text-muted-foreground">
                  {group.memberCount} địa chỉ
                </span>
              </span>
              <ChevronRight
                size={18}
                className="shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      )}
      {target !== undefined && (
        <GroupDialog
          key={target ?? "new"}
          id={target}
          onClose={() => setTarget(undefined)}
        />
      )}
    </section>
  );
}
function GroupDialog({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const readOnly = !canCalendar(useAuth()?.user, "calendar.groups");
  const query = useQuery({
    queryKey: [...calendarKey, "group", id],
    queryFn: () =>
      apiRequest<EmailGroup & { members: EmailGroupMember[] }>(
        `/api/email-groups/${id}`,
      ),
    enabled: Boolean(id),
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={id ? "Chi tiết nhóm email" : "Tạo nhóm email"}
      description="Danh sách người nhận không được chia sẻ trong email."
      fullScreenOnMobile
      mobileBackButton
      closeLabel="Quay lại danh sách nhóm"
      className="flex flex-col sm:max-w-xl"
    >
      {id && query.isPending ? (
        <p role="status">Đang tải nhóm…</p>
      ) : query.error ? (
        <div>
          <ErrorMessage error={query.error} />
          <Button variant="outline" onClick={() => void query.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : readOnly ? (
        <div className="space-y-3">
          <h2 className="font-semibold">{query.data?.name}</h2>
          <p>{query.data?.description}</p>
          <ul className="space-y-2">
            {query.data?.members.map((member) => (
              <li key={member.id}>{member.email}</li>
            ))}
          </ul>
        </div>
      ) : (
        <GroupForm
          key={query.data?.id ?? "new"}
          group={query.data}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}
function GroupForm({
  group,
  onClose,
}: {
  group?: EmailGroup & { members: EmailGroupMember[] };
  onClose: () => void;
}) {
  const client = useQueryClient(),
    { toast } = useToast();
  const [baseVersion, setBaseVersion] = useState(group?.version ?? 0),
    [name, setName] = useState(group?.name ?? ""),
    [description, setDescription] = useState(group?.description ?? ""),
    [bulk, setBulk] = useState(""),
    [removing, setRemoving] = useState<EmailGroupMember | null>(null),
    [deleting, setDeleting] = useState(false);
  const formId = useId();
  const preview = parseBulkEmails(
      bulk,
      group?.members.map((m) => m.email),
    ),
    dirty = Boolean(
      group && (name !== group.name || description !== group.description),
    );
  const refresh = () =>
    void client.invalidateQueries({ queryKey: calendarKey });
  const save = useMutation({
    mutationFn: async () => {
      let saved = group;
      if (!saved || dirty) {
        saved = await apiRequest<EmailGroup & { members: EmailGroupMember[] }>(
          group ? `/api/email-groups/${group.id}` : "/api/email-groups",
          {
            method: group ? "PATCH" : "POST",
            body: JSON.stringify({
              name,
              description,
              ...(group ? { version: baseVersion } : {}),
            }),
          },
        );
        setBaseVersion(saved.version);
        client.setQueryData([...calendarKey, "group", saved.id], saved);
      }
      if (preview.valid.length) {
        await apiRequest(`/api/email-groups/${saved.id}/members`, {
          method: "POST",
          body: JSON.stringify({ text: bulk }),
        });
      }
    },
    onSuccess: () => {
      refresh();
      toast({ title: `Đã lưu nhóm email ${name}`, variant: "success" });
      onClose();
    },
  });
  const remove = useMutation({
    mutationFn: () =>
      apiRequest(`/api/email-groups/${group!.id}/members/${removing!.id}`, {
        method: "DELETE",
        body: "{}",
      }),
    onSuccess: () => {
      setRemoving(null);
      setBaseVersion((v) => v + 1);
      refresh();
      toast({
        title: `Đã xóa ${removing!.email} khỏi ${group!.name}`,
        variant: "success",
      });
    },
  });
  const destroy = useMutation({
    mutationFn: () =>
      apiRequest(`/api/email-groups/${group!.id}`, {
        method: "DELETE",
        body: JSON.stringify({ version: baseVersion }),
      }),
    onSuccess: () => {
      refresh();
      toast({ title: `Đã xóa nhóm ${group!.name}`, variant: "success" });
      onClose();
    },
  });
  const busy =
    save.isPending || remove.isPending || destroy.isPending;
  return (
    <div className="flex flex-1 shrink-0 flex-col gap-6">
      <form
        id={formId}
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && name.trim() && !preview.invalid.length) save.mutate();
        }}
      >
        <label className="block text-sm font-medium">
          Tên nhóm
          <Input
            aria-label="Tên nhóm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={150}
            disabled={busy}
            className="mt-2"
          />
        </label>
        <label className="block text-sm font-medium">
          Mô tả{" "}
          <span className="font-normal text-muted-foreground">
            (không bắt buộc)
          </span>
          <textarea
            aria-label="Mô tả nhóm"
            className="mt-2 min-h-20 w-full rounded-lg border bg-background p-3 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            disabled={busy}
          />
        </label>
      </form>
      {group && (
        <>
          <section className="space-y-3 border-t pt-5">
            <h2 className="font-semibold">
              Thêm địa chỉ email
            </h2>
            <p className="text-sm text-muted-foreground">
              Dán các địa chỉ, cách nhau bằng xuống dòng, dấu phẩy hoặc chấm
              phẩy.
            </p>
            <textarea
              aria-label="Danh sách email cần thêm"
              className="min-h-28 w-full rounded-lg border bg-background p-3 text-sm"
              value={bulk}
              onChange={(e) => {
                setBulk(e.target.value);
              }}
              maxLength={30000}
              disabled={busy}
              placeholder={"email@example.com\nemail-khac@example.com"}
            />
            {bulk && (
              <div
                className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm"
                aria-live="polite"
              >
                {Object.entries(preview)
                  .filter(([key]) =>
                    [
                      "valid",
                      "invalid",
                      "duplicates",
                      "alreadyExisting",
                    ].includes(key),
                  )
                  .map(([key, values]) => (
                    <div key={key}>
                      <span className="font-medium">
                        {
                          {
                            valid: "Hợp lệ",
                            invalid: "Không hợp lệ",
                            duplicates: "Trùng trong nội dung",
                            alreadyExisting: "Đã có trong nhóm",
                          }[key]
                        }
                        : {(values as string[]).length}
                      </span>
                      <p className="break-all text-xs text-muted-foreground">
                        {(values as string[]).join(", ")}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </section>
          <section className="border-t pt-5">
            <h2 className="mb-3 font-semibold">
              Địa chỉ trong nhóm ({group.members.length})
            </h2>
            <div className="divide-y">
              {group.members.length ? (
                group.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 break-all">
                      {member.email}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy || dirty}
                      aria-label={`Xóa ${member.email}`}
                      onClick={() => setRemoving(member)}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Chưa có địa chỉ email.
                </p>
              )}
            </div>
          </section>
        </>
      )}
      {(save.error || remove.error || destroy.error) && (
        <ErrorMessage
          error={save.error ?? remove.error ?? destroy.error}
        />
      )}
      <footer className="sticky bottom-0 mt-auto flex items-center justify-between gap-3 border-t bg-background py-4">
        <Button
          form={formId}
          type="submit"
          disabled={busy || !name.trim() || Boolean(preview.invalid.length) || Boolean(group && !dirty && !preview.valid.length)}
        >
          {save.isPending ? "Đang lưu…" : "Lưu"}
        </Button>
        {group && (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={busy || dirty}
            onClick={() => setDeleting(true)}
          >
            Xóa nhóm email
          </Button>
        )}
      </footer>
      {removing && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setRemoving(null);
          }}
          closeLabel="Hủy xóa"
          title="Xóa địa chỉ khỏi nhóm?"
          description={`${removing.email} sẽ không nhận các thông báo mới gửi cho nhóm. Lịch sử và người nhận đã xếp hàng không thay đổi.`}
        >
          <Button disabled={busy} onClick={() => remove.mutate()}>
            Xác nhận xóa địa chỉ
          </Button>
          {remove.error && <ErrorMessage error={remove.error} />}
        </Dialog>
      )}
      {deleting && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setDeleting(false);
          }}
          closeLabel="Hủy xóa"
          title="Xóa nhóm email?"
          description="Nhóm được gỡ khỏi các chương trình. Lịch sử và thông báo đã xếp hàng vẫn được giữ lại; thao tác này không hủy email đã xếp hàng."
        >
          <Button disabled={busy} onClick={() => destroy.mutate()}>
            Xác nhận xóa nhóm
          </Button>
          {destroy.error && <ErrorMessage error={destroy.error} />}
        </Dialog>
      )}
    </div>
  );
}
