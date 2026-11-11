"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, type Member } from "@org/core";
import { Button, Checkbox, Dialog, ErrorMessage, useToast } from "@org/ui";
type Preview = {
  ids: string[];
  previewToken: string;
  profiles: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  }[];
  retainedAccount: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  conflicts: string[];
  roles: string[];
  requiresLogin: boolean;
  counts: {
    departments: number;
    households: number;
    notes: number;
    visits: number;
  };
};
export function MergeProfilesDialog({
  members,
  initialIds,
  onClose,
  onMerged,
}: {
  members: Member[];
  initialIds: string[];
  onClose: () => void;
  onMerged: () => void;
}) {
  const [ids, setIds] = useState(initialIds),
    [confirmedToken, setConfirmedToken] = useState<string | null>(null);
  const client = useQueryClient(),
    { toast } = useToast();
  const preview = useQuery({
    queryKey: ["merge-preview", ...ids],
    queryFn: ({ signal }) =>
      apiRequest<Preview>("/api/admin/members/merge/preview", {
        method: "POST",
        body: JSON.stringify({ ids }),
        signal,
      }),
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const confirmed = Boolean(
    preview.data && confirmedToken === preview.data.previewToken,
  );
  const merge = useMutation({
    mutationFn: () =>
      apiRequest<{ id: string; requiresLogin: boolean }>(
        "/api/admin/members/merge",
        {
          method: "POST",
          body: JSON.stringify({
            ids,
            previewToken: preview.data!.previewToken,
          }),
        },
      ),
    onSuccess: async (result) => {
      onMerged();
      onClose();
      if (result.requiresLogin) {
        client.clear();
        window.location.assign("/login");
        return;
      }
      await client.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== "merge-preview",
      });
      toast({
        title: "Đã hợp nhất hồ sơ",
        description: `ID được giữ lại: ${result.id}`,
      });
    },
    onError: () => {
      setConfirmedToken(null);
      void preview.refetch();
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !merge.isPending) onClose();
      }}
      title="Hợp nhất hồ sơ"
      closeLabel="Đóng"
      className="sm:max-w-2xl"
      description="Hồ sơ đầu tiên giữ nguyên ID. Các hồ sơ còn lại và dữ liệu liên kết sẽ được chuyển về ID này."
    >
      <ol className="space-y-3">
        {ids.map((id, index) => {
          const member = members.find((m) => m.id === id);
          return (
            <li
              key={id}
              className="flex items-start gap-3 rounded-xl border p-3"
            >
              <span className="pt-1 text-sm font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{member?.user.name ?? id}</p>
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  {id}
                </p>
                {index === 0 && (
                  <p className="mt-1 text-sm font-medium text-primary">
                    Giữ ID này ·{" "}
                    {member?.status === "suspended"
                      ? "Tạm ngưng"
                      : "Đang hoạt động"}
                  </p>
                )}
              </div>
              {index > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={merge.isPending}
                  onClick={() => {
                    setIds([id, ...ids.filter((x) => x !== id)]);
                    setConfirmedToken(null);
                    merge.reset();
                  }}
                >
                  Giữ ID này
                </Button>
              )}
            </li>
          );
        })}
      </ol>
      {preview.isPending && (
        <p role="status" className="py-4">
          Đang kiểm tra dữ liệu…
        </p>
      )}
      {preview.error && (
        <div className="mt-4">
          <ErrorMessage error={preview.error} />
          <Button
            variant="outline"
            className="mt-2"
            onClick={() => {
              void preview.refetch();
            }}
          >
            Thử lại
          </Button>
        </div>
      )}
      {preview.data && (
        <div className="mt-5 space-y-3 text-sm leading-relaxed">
          <p>
            Giữ thông tin đã có của hồ sơ đầu tiên, chỉ bổ sung các trường còn
            trống theo thứ tự trên. Hợp nhất {preview.data.counts.departments}{" "}
            Ban ngành, {preview.data.counts.households} gia đình,{" "}
            {preview.data.counts.notes} ghi chú và {preview.data.counts.visits}{" "}
            lần thăm viếng.
          </p>
          {!!preview.data.conflicts.length && (
            <p>
              Thông tin khác nhau, ưu tiên hồ sơ đầu tiên:{" "}
              <strong>{preview.data.conflicts.join(", ")}</strong>.
            </p>
          )}
          <p>
            Quyền sau khi hợp nhất:{" "}
            <strong>{preview.data.roles.join(", ")}</strong>.
          </p>
          <p>
            {preview.data.retainedAccount
              ? `Giữ thông tin đăng nhập của ${preview.data.retainedAccount.name} (${preview.data.retainedAccount.email ?? preview.data.retainedAccount.phone}). Các thông tin đăng nhập khác ngừng hoạt động.`
              : "Các hồ sơ này chưa có tài khoản đăng nhập."}{" "}
            Tất cả phiên đăng nhập và mã OTP của các hồ sơ được chọn sẽ hết hiệu
            lực.
          </p>
          {preview.data.requiresLogin && (
            <p className="font-medium">
              Bạn cần đăng nhập lại sau khi hợp nhất.
            </p>
          )}
          <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-muted p-3">
            <Checkbox
              checked={confirmed}
              disabled={merge.isPending}
              onCheckedChange={(value) =>
                setConfirmedToken(
                  value === true ? (preview.data?.previewToken ?? null) : null,
                )
              }
              aria-label="Xác nhận thông tin hợp nhất"
            />
            <span>
              Tôi đã kiểm tra ID được giữ lại, thông tin đăng nhập và quyền của
              các hồ sơ được chọn.
            </span>
          </label>
        </div>
      )}
      {merge.error && (
        <div className="mt-4">
          <ErrorMessage error={merge.error} />
        </div>
      )}
      <div className="mt-5 flex gap-2">
        <Button
          disabled={
            !preview.data ||
            preview.isFetching ||
            preview.isError ||
            !confirmed ||
            merge.isPending
          }
          onClick={() => merge.mutate()}
        >
          {merge.isPending ? "Đang hợp nhất…" : "Xác nhận hợp nhất"}
        </Button>
        <Button variant="outline" disabled={merge.isPending} onClick={onClose}>
          Hủy
        </Button>
      </div>
    </Dialog>
  );
}
