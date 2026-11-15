import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChurchStatusSchema,
  demo,
  getDirectoryMember,
  invalidateMemberReads,
  updateMemberReads,
} from "@org/core";
import { Button, Dialog, ErrorMessage, useToast } from "@org/ui";
import { valuesFor } from "./member-detail-values";

export function MemberStatusSheet({
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
  const client = useQueryClient();
  const { toast } = useToast();
  const saving = useRef(false);
  const query = useQuery({
    queryKey: ["organizations", org, "member-status", memberId],
    queryFn: () => getDirectoryMember(org, memberId, false),
    staleTime: 0,
  });
  const selected = query.data?.churchStatus ?? "";
  const save = useMutation({
    mutationFn: async (status: string) => {
      if (!query.data || query.data.canEdit === false)
        throw new Error("Bạn không có quyền cập nhật hồ sơ này.");
      const updated = await demo.updateDetails(
        org,
        memberId,
        {
          ...valuesFor(query.data),
          churchStatus: ChurchStatusSchema.parse(status),
          chuyenHoiDen: status === "Chuyển hội" ? query.data.chuyenHoiDen ?? "" : "",
        },
        query.data.version,
      );
      return updated ?? getDirectoryMember(org, memberId, false);
    },
    onSuccess: (updated) => {
      client.setQueryData(
        ["organizations", org, "member-status", memberId],
        updated,
      );
      updateMemberReads(client, org, updated);
      void invalidateMemberReads(client, org);
      toast({ title: `Đã cập nhật trạng thái của ${name}`, variant: "success" });
    },
    onError: (error) => {
      toast({
        title: `Không thể cập nhật trạng thái của ${name}`,
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    },
  });
  return (
    <Dialog
      open
      title="Cập nhật trạng thái"
      description={name}
      closeLabel="Đóng trạng thái"
      className="member-status-sheet bottom-sheet-menu top-auto! bottom-0! w-full! max-w-lg! translate-y-0! rounded-b-none rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      {query.isPending ? (
        <p role="status">Đang tải trạng thái…</p>
      ) : query.error ? (
        <div className="space-y-3">
          <ErrorMessage error={query.error} />
          <Button variant="outline" onClick={() => void query.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : query.data?.canEdit === false ? (
        <p role="alert">Bạn không có quyền cập nhật hồ sơ này.</p>
      ) : (
        <div className="space-y-4">
          <fieldset disabled={save.isPending} className="space-y-2">
            <legend className="sr-only">Trạng thái thành viên</legend>
            {ChurchStatusSchema.options.map((option) => (
              <label
                key={option}
                className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2"
              >
                <input
                  type="radio"
                  name="member-church-status"
                  value={option}
                  checked={selected === option}
                  onChange={() => {
                    if (saving.current || save.isPending) return;
                    saving.current = true;
                    save.mutate(option);
                    onClose();
                  }}
                  className="size-5 accent-primary"
                />
                {option}
              </label>
            ))}
          </fieldset>
        </div>
      )}
    </Dialog>
  );
}
