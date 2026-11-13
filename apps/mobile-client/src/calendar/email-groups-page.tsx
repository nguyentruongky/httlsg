"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Plus, ArrowLeft, Trash2 } from "lucide-react";
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
      <a
        href="/dashboard/calendar"
        className="inline-flex min-h-10 items-center gap-2 text-sm text-primary"
      >
        <ArrowLeft size={18} />
        Lịch
      </a>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-semibold">
            <Mail className="text-primary" />
            Nhóm email nhận thông báo
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Quản lý người nhận thông báo chương trình. Địa chỉ có thể thuộc
            người ngoài danh sách tín hữu.
          </p>
        </div>
        {!readOnly && (
          <Button onClick={() => setTarget(null)}>
            <Plus size={16} />
            Tạo nhóm
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {query.data.items.map((group) => (
            <button
              key={group.id}
              onClick={() => setTarget(group.id)}
              className="rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary/40"
            >
              <span className="block text-lg font-semibold">{group.name}</span>
              <span className="mt-2 block whitespace-pre-wrap text-sm text-muted-foreground">
                {group.description || "Chưa có mô tả"}
              </span>
              <span className="mt-4 block text-sm text-primary">
                {group.memberCount} địa chỉ
              </span>
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
      description="Địa chỉ email chỉ hiển thị cho Admin; không chia sẻ danh sách người nhận trong email."
      fullScreenOnMobile
      closeLabel="Đóng nhóm"
      className="sm:max-w-2xl"
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
    [deleting, setDeleting] = useState(false),
    [summary, setSummary] = useState<ReturnType<typeof parseBulkEmails> | null>(
      null,
    );
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
    mutationFn: () =>
      apiRequest(
        group ? `/api/email-groups/${group.id}` : "/api/email-groups",
        {
          method: group ? "PATCH" : "POST",
          body: JSON.stringify({
            name,
            description,
            ...(group ? { version: baseVersion } : {}),
          }),
        },
      ),
    onSuccess: () => {
      refresh();
      toast({ title: "Đã lưu nhóm email", variant: "success" });
      onClose();
    },
  });
  const add = useMutation({
    mutationFn: () =>
      apiRequest<ReturnType<typeof parseBulkEmails> & { added: number }>(
        `/api/email-groups/${group!.id}/members`,
        { method: "POST", body: JSON.stringify({ text: bulk }) },
      ),
    onSuccess: (data) => {
      setSummary(data);
      setBulk(data.invalid.join("\n"));
      setBaseVersion((v) => v + (data.added ? 1 : 0));
      refresh();
      toast({
        title: `Đã thêm ${data.added} địa chỉ`,
        description: `${data.invalid.length} không hợp lệ; ${data.duplicates.length} trùng trong nội dung; ${data.alreadyExisting.length} đã có.`,
        variant: "success",
      });
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
      toast({ title: "Đã xóa địa chỉ", variant: "success" });
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
      toast({ title: "Đã xóa nhóm", variant: "success" });
      onClose();
    },
  });
  const busy =
    save.isPending || add.isPending || remove.isPending || destroy.isPending;
  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
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
          Mô tả
          <textarea
            aria-label="Mô tả nhóm"
            className="mt-2 min-h-20 w-full rounded-lg border bg-background p-3 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            disabled={busy}
          />
        </label>
        <Button disabled={busy || !name.trim()} type="submit">
          {save.isPending ? "Đang lưu…" : "Lưu nhóm"}
        </Button>
      </form>
      {group && (
        <>
          <section className="space-y-3 border-t pt-5">
            <h2 className="font-semibold">Thêm địa chỉ email</h2>
            <p className="text-sm text-muted-foreground">
              Dán nhiều địa chỉ, ngăn cách bằng xuống dòng, dấu phẩy hoặc chấm
              phẩy. Địa chỉ không hợp lệ không được thêm.
            </p>
            {dirty && (
              <p className="text-sm text-primary">
                Lưu tên/mô tả trước khi thay đổi địa chỉ để giữ phiên bản nhóm
                nhất quán.
              </p>
            )}
            <textarea
              aria-label="Danh sách email cần thêm"
              className="min-h-28 w-full rounded-lg border bg-background p-3 text-sm"
              value={bulk}
              onChange={(e) => {
                setBulk(e.target.value);
                setSummary(null);
              }}
              maxLength={30000}
              disabled={busy || dirty}
              placeholder={"email@example.com\nemail-khac@example.com"}
            />
            {(bulk || summary) && (
              <div
                className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm"
                aria-live="polite"
              >
                {Object.entries(summary ?? preview)
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
            <Button
              variant="outline"
              disabled={busy || dirty || !preview.valid.length}
              onClick={() => add.mutate()}
            >
              {add.isPending
                ? "Đang thêm…"
                : `Thêm ${preview.valid.length} địa chỉ hợp lệ`}
            </Button>
          </section>
          <section className="border-t pt-5">
            <h2 className="mb-3 font-semibold">
              Địa chỉ trong nhóm ({group.members.length})
            </h2>
            <div className="max-h-64 overflow-y-auto">
              {group.members.length ? (
                group.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex min-h-12 items-center justify-between gap-3 border-b py-2 text-sm"
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
          <Button
            variant="ghost"
            className="text-destructive"
            disabled={busy || dirty}
            onClick={() => setDeleting(true)}
          >
            Xóa nhóm email
          </Button>
        </>
      )}
      {(save.error || add.error || remove.error || destroy.error) && (
        <ErrorMessage
          error={save.error ?? add.error ?? remove.error ?? destroy.error}
        />
      )}
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
