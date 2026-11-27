import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiRequest,
  departments,
  getDirectoryMember,
  updateMemberReads,
  type DirectoryMember,
} from "@org/core";
import { Button, Dialog, ErrorMessage, useToast } from "@org/ui";

const choirOptions = departments.filter(
  (item) => item.departmentType === "choir",
);

export function MemberChoirSheet({
  org,
  memberId,
  name,
  onClose,
  initial,
}: {
  org: string;
  memberId: string;
  name: string;
  onClose: () => void;
  initial?: { version?: number; departmentIds?: string[] };
}) {
  const saving = useRef(false);
  const client = useQueryClient();
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ["organizations", org, "member", memberId],
    queryFn: () => getDirectoryMember(org, memberId, false),
    enabled: initial?.version === undefined,
    staleTime: 30_000,
    refetchOnMount: false,
  });
  const selected =
    query.data?.departments.find((item) =>
      choirOptions.some((choir) => choir.id === item.id),
    )?.id ??
    initial?.departmentIds?.find((id) =>
      choirOptions.some((choir) => choir.id === id),
    ) ??
    "";
  const save = useMutation({
    mutationFn: async (departmentId: string) => {
      const version =
        query.data?.version ??
        initial?.version ??
        (await query.refetch()).data?.version;
      if (version === undefined) throw new Error("Vui lòng tải lại hồ sơ.");
      return apiRequest<DirectoryMember>(`/api/members/${memberId}/choir`, {
        method: "PATCH",
        body: JSON.stringify({
          departmentId,
          version,
        }),
      });
    },
    onSuccess: (member) => {
      updateMemberReads(client, org, member);
      toast({ title: `Đã đổi Ban hát lễ của ${name}`, variant: "success" });
    },
    onError: (error) => {
      toast({
        title: `Không thể đổi Ban hát lễ của ${name}`,
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
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
      {query.error && (
        <div className="space-y-3">
          <ErrorMessage error={query.error} />
          <Button variant="outline" onClick={() => void query.refetch()}>
            Thử lại
          </Button>
        </div>
      )}
      <div className="space-y-4">
        <fieldset disabled={save.isPending} className="space-y-2">
          <legend className="sr-only">Ban hát lễ</legend>
          {choirOptions.map((choir) => (
            <label
              key={choir.id}
              className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2"
            >
              <input
                type="radio"
                name="manual-choir"
                className="size-5 accent-primary"
                checked={selected === choir.id}
                onChange={() => {
                  if (saving.current || save.isPending) return;
                  saving.current = true;
                  save.mutate(choir.id);
                  onClose();
                }}
              />
              {choir.name}
            </label>
          ))}
        </fieldset>
        {save.error && <ErrorMessage error={save.error} />}
      </div>
    </Dialog>
  );
}
