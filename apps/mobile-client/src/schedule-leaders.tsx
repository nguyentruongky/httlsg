"use client";
import { PersonCard } from "./person-card";
import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, useAuth, SCHEDULE_CATEGORIES } from "@org/core";
import {
  Button,
  Card,
  Checkbox,
  Dialog,
  ErrorMessage,
  useToast,
} from "@org/ui";
import {
  ScheduleMemberPicker,
  type SchedulePerson,
} from "../../mobile-client/src/schedules/member-picker";
type Leader = {
  memberId: string;
  name: string;
  hasAccount: boolean;
  categoryIds: string[];
  active: boolean;
  token: string;
};
export function ScheduleLeaders() {
  const user = useAuth()?.user,
    allowed = Boolean(
      user &&
      ["admin", "secretary", "deacon"].includes(user.role) &&
      (["admin", "deacon"].includes(user.role) ||
        user.permissions.includes("schedule.leaders.manage")),
    );
  const [target, setTarget] = useState<SchedulePerson | null>(null);
  const query = useQuery({
    queryKey: ["schedule-leaders"],
    queryFn: () => apiRequest<{ items: Leader[] }>("/api/schedule-leaders"),
    enabled: allowed,
  });
  if (!allowed)
    return <p role="alert">Bạn không có quyền quản lý người phụ trách lịch.</p>;
  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">Quản lý người phụ trách lịch</h1>
      {user?.role !== "deacon" && (
        <Card className="space-y-3 p-4">
          <h2 className="font-semibold">Chọn thành viên để phân quyền</h2>
          <ScheduleMemberPicker
            admin
            categoryId="reception"
            onPick={setTarget}
          />
        </Card>
      )}
      {query.isPending ? (
        <p role="status">Đang tải người phụ trách…</p>
      ) : query.error ? (
        <ErrorMessage error={query.error} />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3">Thành viên</th>
                {SCHEDULE_CATEGORIES.map((category) => (
                  <th key={category.id} className="p-3">
                    {category.name}
                  </th>
                ))}
                <th className="p-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((leader) => (
                <tr key={leader.memberId} className="border-t">
                  <td className="p-3">
                    <PersonCard
                      name={leader.name}
                      onOpen={() =>
                        setTarget({ id: leader.memberId, name: leader.name })
                      }
                      disabled={user?.role === "deacon"}
                      departments={
                        !leader.hasAccount
                          ? "Chưa có tài khoản đăng nhập"
                          : undefined
                      }
                      className="border-0 p-0"
                    />
                  </td>
                  {SCHEDULE_CATEGORIES.map((category) => (
                    <td key={category.id} className="p-3">
                      {leader.categoryIds.includes(category.id)
                        ? "Quản lý"
                        : "—"}
                    </td>
                  ))}
                  <td className="p-3">
                    {leader.active ? "Đang hoạt động" : "Đã tạm dừng"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!query.data.items.length && (
            <p className="p-4 text-muted-foreground">
              Chưa phân công người phụ trách.
            </p>
          )}
        </div>
      )}
      {target && (
        <LeaderGrant
          key={target.id}
          person={target}
          onClose={() => setTarget(null)}
        />
      )}
    </section>
  );
}
function LeaderGrant({
  person,
  onClose,
}: {
  person: SchedulePerson;
  onClose: () => void;
}) {
  const [ids, setIds] = useState<string[]>([]),
    [active, setActive] = useState(true),
    [initialized, setInitialized] = useState(false);
  const client = useQueryClient(),
    { toast } = useToast();
  const query = useQuery({
    queryKey: ["schedule-leaders", person.id],
    queryFn: () =>
      apiRequest<{ items: Leader[]; token: string }>(
        "/api/schedule-leaders?memberId=" + person.id,
      ),
  });
  const token = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!query.data || token.current !== undefined) return;
    token.current = query.data.token;
    setIds(query.data.items[0]?.categoryIds ?? []);
    setActive(query.data.items[0]?.active ?? true);
    setInitialized(true);
  }, [query.data]);
  const save = useMutation({
    mutationFn: () =>
      apiRequest("/api/schedule-leaders", {
        method: "PATCH",
        body: JSON.stringify({
          memberId: person.id,
          categoryIds: ids,
          active,
          token: token.current,
        }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["schedule-leaders"] });
      toast({ title: "Đã lưu quyền phụ trách lịch", variant: "success" });
      onClose();
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
      title="Phân quyền phụ trách lịch"
      description={person.name}
      closeLabel="Đóng phân quyền lịch"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        {query.isPending ? (
          <p role="status">Đang tải…</p>
        ) : query.error ? (
          <ErrorMessage error={query.error} />
        ) : (
          <fieldset className="space-y-3" disabled={save.isPending}>
            {SCHEDULE_CATEGORIES.map((category) => (
              <label
                key={category.id}
                className="flex min-h-12 items-center gap-3 rounded-lg border p-3 text-sm"
              >
                <Checkbox
                  checked={ids.includes(category.id)}
                  onCheckedChange={(checked) =>
                    setIds((old) =>
                      checked
                        ? [...old, category.id]
                        : old.filter((id) => id !== category.id),
                    )
                  }
                />
                {category.name}
              </label>
            ))}
            <label className="flex min-h-11 items-center gap-3">
              <Checkbox
                checked={active}
                onCheckedChange={(value) => setActive(Boolean(value))}
              />
              Cho phép quản lý các loại lịch đã chọn
            </label>
            <p className="text-sm text-muted-foreground">
              Bỏ chọn tất cả loại lịch để thu hồi quyền. Phân công phục vụ không
              tự cấp quyền quản lý.
            </p>
          </fieldset>
        )}
        {save.error && <ErrorMessage error={save.error} />}
        <div className="flex gap-2">
          <Button type="submit" disabled={save.isPending || !initialized}>
            Lưu phân quyền lịch
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending}
            onClick={onClose}
          >
            Hủy
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
