import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiRequest,
  getDirectoryMember,
  invalidateMemberReads,
  updateMemberReads,
  type DirectoryMember,
} from "@org/core";
import { Button, Dialog, ErrorMessage, useToast } from "@org/ui";

export function MemberChoirSheet({
  org,
  memberId,
  name,
  onClose,
}: {
  org: string;
  memberId: string;
  name: string;
  onClose: () => void;
}) {
  const [choice, setChoice] = useState<string>();
  const client = useQueryClient();
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ["organizations", org, "member-choir", memberId],
    queryFn: async () => {
      const [member, catalog] = await Promise.all([
        getDirectoryMember(org, memberId, false),
        apiRequest<{
          departments: { id: string; name: string; departmentType: string }[];
        }>("/api/admin/departments"),
      ]);
      return {
        member,
        choirs: catalog.departments.filter(
          (item) => item.departmentType === "choir",
        ),
      };
    },
    staleTime: 0,
  });
  const selected =
    choice ??
    query.data?.member.departments.find((item) =>
      query.data?.choirs.some((choir) => choir.id === item.id),
    )?.id ??
    "";
  const save = useMutation({
    mutationFn: () => {
      if (!query.data) throw new Error("Vui lòng tải lại hồ sơ.");
      return apiRequest<DirectoryMember>(`/api/members/${memberId}/choir`, {
        method: "PATCH",
        body: JSON.stringify({
          departmentId: selected,
          version: query.data.member.version,
        }),
      });
    },
    onSuccess: (member) => {
      updateMemberReads(client, org, member);
      void invalidateMemberReads(client, org);
      void client.invalidateQueries({
        queryKey: ["organizations", org, "member-choir", memberId],
      });
      toast({ title: "Đã đổi Ban hát lễ", variant: "success" });
      onClose();
    },
  });
  return (
    <Dialog
      open
      title="Đổi ban hát lễ"
      description={name}
      closeLabel="Đóng Ban hát lễ"
      className="member-status-sheet bottom-sheet-menu top-auto! bottom-0! w-full! max-w-lg! translate-y-0! rounded-b-none rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      <p className="mb-4 text-sm text-muted-foreground">
        Lựa chọn thủ công được giữ nguyên khi cập nhật Ban hát lễ toàn danh
        sách.
      </p>
      {query.isPending ? (
        <p role="status">Đang tải Ban hát lễ…</p>
      ) : query.error ? (
        <div className="space-y-3">
          <ErrorMessage error={query.error} />
          <Button variant="outline" onClick={() => void query.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <fieldset disabled={save.isPending} className="space-y-2">
            <legend className="sr-only">Ban hát lễ</legend>
            {query.data?.choirs.map((choir) => (
              <label
                key={choir.id}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 py-2"
              >
                <input
                  type="radio"
                  name="manual-choir"
                  className="size-5 accent-primary"
                  checked={selected === choir.id}
                  onChange={() => setChoice(choir.id)}
                />
                {choir.name}
              </label>
            ))}
          </fieldset>
          {save.error && <ErrorMessage error={save.error} />}
          <Button
            className="min-h-11 w-full"
            type="submit"
            disabled={!selected || save.isPending}
          >
            {save.isPending ? "Đang lưu…" : "Lưu Ban hát lễ"}
          </Button>
        </form>
      )}
    </Dialog>
  );
}
