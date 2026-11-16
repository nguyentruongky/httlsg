import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatedSheetContent } from "./animated-sheet-content";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChurchStatusSchema,
  demo,
  getDirectoryMember,
  updateMemberReads,
  apiRequest,
  isApiMode,
  type DirectoryMember,
} from "@org/core";
import { Button, Dialog, ErrorMessage, Input, useToast } from "@org/ui";
import { valuesFor } from "./member-detail-values";

export function MemberStatusSheet({
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
  initial?: { version?: number; churchStatus?: string | null; chuyenHoiDen?: string | null };
}) {
  const client = useQueryClient();
  const { toast } = useToast();
  const saving = useRef(false);
  const [transfer, setTransfer] = useState(false);
  const [destination, setDestination] = useState<string | undefined>();
  const query = useQuery({
    queryKey: ["organizations", org, "member", memberId],
    queryFn: () => getDirectoryMember(org, memberId, false),
    enabled: initial?.version === undefined,
    staleTime: 30_000,
    refetchOnMount: false,
  });
  const selected = transfer ? "Chuyển hội" : query.data?.churchStatus ?? initial?.churchStatus ?? "";
  const save = useMutation({
    mutationFn: async ({ status, destination }: { status: string; destination?: string }) => {
      const version = query.data?.version ?? initial?.version;
      if (isApiMode() && version !== undefined)
        return apiRequest<DirectoryMember>(`/api/members/${memberId}`, {
          method: "PATCH",
          body: JSON.stringify({
            values: {
              churchStatus: ChurchStatusSchema.parse(status),
              ...(status !== "Chuyển hội" ? { chuyenHoiDen: "" } : destination !== undefined ? { chuyenHoiDen: destination } : {}),
            },
            version,
          }),
        });
      const member = query.data ?? (await query.refetch()).data;
      if (!member) throw new Error("Không thể tải hồ sơ. Vui lòng thử lại.");
      if (member.canEdit === false)
        throw new Error("Bạn không có quyền cập nhật hồ sơ này.");
      const updated = await demo.updateDetails(
        org,
        memberId,
        {
          ...valuesFor(member),
          churchStatus: ChurchStatusSchema.parse(status),
          chuyenHoiDen: status === "Chuyển hội" ? destination ?? member.chuyenHoiDen ?? "" : "",
        },
        member.version,
      );
      return updated ?? getDirectoryMember(org, memberId, false);
    },
    onSuccess: (updated) => {
      updateMemberReads(client, org, updated);
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
  function submit(status: string) {
    if (saving.current || save.isPending) return;
    saving.current = true;
    flushSync(onClose);
    save.mutate({ status, destination });
  }
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
      <AnimatedSheetContent>
      {query.data?.canEdit === false ? (
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
                    if (option === "Chuyển hội") setTransfer(true);
                    else submit(option);
                  }}
                  className="size-5 accent-primary"
                />
                {option}
              </label>
            ))}
          </fieldset>
          {selected === "Chuyển hội" && (
            <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); submit("Chuyển hội"); }}>
              <label className="block text-sm">
                Điểm đến chuyển hội (không bắt buộc)
                <Input autoFocus className="mt-2" maxLength={200} value={destination ?? query.data?.chuyenHoiDen ?? initial?.chuyenHoiDen ?? ""} onChange={(event) => setDestination(event.target.value)} placeholder="Nhập Hội Thánh hoặc địa điểm chuyển đến" />
              </label>
              <Button type="submit" disabled={save.isPending}>Lưu</Button>
            </form>
          )}
          {query.error && (
            <div className="space-y-3">
              <ErrorMessage error={query.error} />
              <Button variant="outline" onClick={() => void query.refetch()}>
                Thử lại
              </Button>
            </div>
          )}
        </div>
      )}
      </AnimatedSheetContent>
    </Dialog>
  );
}
