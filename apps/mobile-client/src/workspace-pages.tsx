"use client";
import { PersonCard } from "./person-card";
import { MemberDetail } from "./member-detail";
import { ListPageHeader } from "./list-controls";
import { useLoadingTiming } from "./use-loading-timing";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";

import {
  Users,
  UserCheck,
  Mail,
  ClipboardCheck,
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  Leaf,
  Shield,
  Check,
  MoreVertical,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import {
  useWorkspace,
  invalidateMemberReads,
  useOrganizationMembers,
  useOrganizationActivity,
  useAuth,
  apiRequest,
  type Task,
} from "@org/core";
import {
  Badge,
  Button,
  Card,
  ErrorMessage,
  EmptyState,
  Input,
  Dropdown,
  Dialog,
  DropdownMenu,
  MenuItem,
} from "@org/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InviteDialog } from "./invite-dialog";
import { MemberTable } from "./member-table";
import { navigateClient } from "./client-router";
const EngagementChart = lazy(() => import("./engagement-chart"));
function Heading({
  eyebrow,
  title,
  description,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-primary">
          {eyebrow}
        </p>
        <h2 className="flex items-center gap-3 text-2xl sm:text-3xl font-semibold tracking-tight">
          {icon}
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
function Loading() {
  return (
    <div role="status" className="space-y-4">
      <p className="text-sm text-muted-foreground">Đang tải…</p>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
export function MembersPage() {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const { organizationId: org } = useWorkspace();
  const members = useOrganizationMembers(org);
  useLoadingTiming("members", members.isPending);
  return (
    <div className="page-enter">
      <ListPageHeader
        title="Thành viên"
        icon={<Users className="shrink-0 text-primary" aria-hidden="true" />}
        description="Danh sách tất cả thành viên trong Hội Thánh"
      >
        <MembersActions key={org} org={org} />
      </ListPageHeader>
      {members.isPending ? (
        <Loading />
      ) : members.isError && !members.members.length ? (
        <ErrorMessage error={members.error} />
      ) : (
        <>
          {/* Summary cards are temporarily hidden. */}
          <div
            className={
              selectedMemberId
                ? "grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
                : "min-w-0"
            }
            onClick={(event) => {
              if (
                !window.matchMedia("(min-width: 1024px)").matches ||
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              const link =
                event.target instanceof Element
                  ? event.target.closest<HTMLAnchorElement>("a[href]")
                  : null;
              if (
                !link ||
                link.target === "_blank" ||
                link.origin !== window.location.origin
              )
                return;
              const match = /^\/client\/members\/([^/]+)$/.exec(link.pathname);
              if (!match) return;
              event.preventDefault();
              setSelectedMemberId(decodeURIComponent(match[1]));
            }}
          >
            <div className="min-w-0">
              <MemberTable
                key={org}
                org={org}
                members={members.members}
                total={members.total}
                loadMoreServer={members.fetchNextPage}
                hasNextPage={members.hasNextPage}
                isFetchingNextPage={members.isFetchingNextPage}
                isFetchNextPageError={members.isFetchNextPageError}
              />
            </div>
            {selectedMemberId && (
              <aside
                aria-label="Chi tiết thành viên"
                className="sticky top-4 hidden max-h-[calc(100dvh-2rem)] min-w-0 overflow-y-auto rounded-xl border bg-card p-4 lg:block"
              >
                <div className="mb-4 flex justify-end">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedMemberId(null)}
                  >
                    Đóng chi tiết
                  </Button>
                </div>
                <MemberDetail
                  key={`${org}-${selectedMemberId}`}
                  org={org}
                  memberId={selectedMemberId}
                  hideBackButton
                  onBack={() => setSelectedMemberId(null)}
                  onOpenMember={setSelectedMemberId}
                />
              </aside>
            )}
          </div>
        </>
      )}
    </div>
  );
}
type ChoirMembershipResult = {
  asOfDate: string;
  updatedMemberCount: number;
  eligibleMemberCount: number;
  skippedMemberCount: number;
  departmentCounts: { departmentId: string; memberCount: number }[];
};
function MembersActions({ org }: { org: string }) {
  const auth = useAuth();
  const client = useQueryClient();
  const [choirOpen, setChoirOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [result, setResult] = useState<ChoirMembershipResult | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<ChoirMembershipResult>("/api/admin/choir-memberships", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: async (data) => {
      setResult(data);
      await invalidateMemberReads(client, org);
    },
  });
  if (auth?.user?.role !== "admin" && auth?.user?.role !== "secretary")
    return null;
  const year = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
  }).format(new Date());
  return (
    <>
      <DropdownMenu
        label=""
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Thao tác thành viên"
          >
            <MoreVertical size={20} />
          </Button>
        }
      >
        <MenuItem
          onSelect={() => {
            setInviteOpen(true);
          }}
        >
          <UserPlus size={16} />
          Thêm thành viên
        </MenuItem>
        {auth?.user?.role === "admin" && (
          <MenuItem
            onSelect={() => {
              mutation.reset();
              setResult(null);
              setChoirOpen(true);
            }}
          >
            <RefreshCw size={16} />
            Cập nhật Ban hát lễ
          </MenuItem>
        )}
      </DropdownMenu>
      <InviteDialog org={org} open={inviteOpen} onOpenChange={setInviteOpen} />
      {choirOpen && (
        <Dialog
          open
          onOpenChange={(next) => {
            if (!mutation.isPending) setChoirOpen(next);
          }}
          title="Cập nhật ban hát lễ"
          description="Tính tuổi vào ngày 1 tháng 3 và chỉ thay đổi thành viên của các nhóm Ban hát lễ theo độ tuổi. Các Ban ngành khác được giữ nguyên."
          closeLabel="Đóng cập nhật ban hát lễ"
        >
          {result ? (
            <div className="space-y-3 text-sm">
              <p role="status" className="font-medium text-primary">
                Đã cập nhật theo ngày{" "}
                {result.asOfDate.split("-").reverse().join("/")}.
              </p>
              <p>{result.updatedMemberCount} thành viên đã được chuyển nhóm.</p>
              <p className="text-muted-foreground">
                {result.eligibleMemberCount} thành viên có ngày sinh được phân
                nhóm; {result.skippedMemberCount} hồ sơ không đủ dữ liệu được
                giữ nguyên.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Lần chạy tự động hằng năm diễn ra ngày 1 tháng 3. Thao tác này
                chạy lại quy tắc cho năm {year} ngay bây giờ.
              </p>
              {mutation.error && <ErrorMessage error={mutation.error} />}
              <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate()}
                >
                  <RefreshCw size={16} />
                  {mutation.isPending ? "Đang cập nhật…" : "Cập nhật ngay"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => setChoirOpen(false)}
                >
                  Hủy
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      )}
    </>
  );
}
const chartData = [
  { day: "Mon", active: 38 },
  { day: "Tue", active: 52 },
  { day: "Wed", active: 44 },
  { day: "Thu", active: 67 },
  { day: "Fri", active: 58 },
  { day: "Sat", active: 81 },
  { day: "Sun", active: 72 },
];
export function OverviewPage() {
  const { organizationId } = useWorkspace();
  const members = useOrganizationMembers(organizationId);
  const activity = useOrganizationActivity(organizationId);
  if (members.isPending || activity.isPending) return <Loading />;
  if (members.isError) return <ErrorMessage error={members.error} />;
  if (activity.isError) return <ErrorMessage error={activity.error} />;
  const tasks: Task[] = [];
  const completed = 0;
  return (
    <div className="page-enter">
      <Heading
        eyebrow="Overview"
        title="A good day to make a difference."
        description="Here’s a little perspective on your people and your progress."
      >
        <Button
          variant="outline"
          onClick={() => navigateClient("/dashboard/members")}
        >
          <Users size={15} />
          View members
        </Button>
      </Heading>
      <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total members",
            value: members.total,
            detail: "People in your community",
            icon: Users,
          },
          {
            label: "Active members",
            value: members.activeCount,
            detail: "Ready to get involved",
            icon: UserCheck,
          },
          {
            label: "Tasks completed",
            value: `${completed} / ${tasks.length}`,
            detail: "A little progress, every day",
            icon: ClipboardCheck,
          },
          {
            label: "Pending invitations",
            value: members.members.filter((m) => m.status === "invited").length,
            detail: "New connections on the way",
            icon: Mail,
          },
        ].map(({ label, value, detail, icon: Icon }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {label}
              <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                <Icon size={16} />
              </span>
            </div>
            <p className="my-3 text-2xl sm:text-3xl font-semibold tracking-tight">
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{detail}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <Card className="p-6">
          <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Community engagement</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                An illustrative look at an active week
              </p>
            </div>
            <Badge>Sample trend</Badge>
          </div>
          <div
            className="h-64"
            role="img"
            aria-label="Illustrative weekly engagement: Monday 38, Tuesday 52, Wednesday 44, Thursday 67, Friday 58, Saturday 81, Sunday 72."
          >
            <Suspense fallback={<div className="h-full" />}>
              <EngagementChart data={chartData} />
            </Suspense>
          </div>
        </Card>
        <Card className="flex flex-col p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">On the horizon</h2>
            <CalendarDays size={17} className="text-muted-foreground" />
          </div>
          <p className="mb-5 mt-1 text-xs text-muted-foreground">
            Your team’s next steps
          </p>
          <div className="space-y-5">
            {tasks.slice(0, 3).map((t, i) => (
              <div key={t.id} className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-sm font-semibold text-primary">
                  0{i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(t.dueAt).toLocaleTimeString("en", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    · {t.status === "completed" ? "Completed" : "Today"}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-6">
            <div className="rounded-lg bg-accent/60 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <Leaf size={16} />
                Small actions. Shared purpose.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Every check-in helps your team feel a little more connected.
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">Your people</h2>
            <a
              href="/dashboard/members"
              onClick={(e) => {
                e.preventDefault();
                navigateClient("/dashboard/members");
              }}
              className="flex items-center gap-1 text-xs text-primary"
            >
              View directory <ArrowRight size={14} />
            </a>
          </div>
          <div className="divide-y">
            {members.members.slice(0, 4).map((m) => (
              <div key={m.id} className="py-1">
                <PersonCard
                  name={m.user.name}
                  href={`/client/members/${m.id}`}
                  status={m.churchStatus ?? null}
                  departments={m.departments
                    .map((item) => item.name)
                    .join(", ")}
                  phone={m.phone}
                  email={m.user.email}
                />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">Recent activity</h2>
            <a
              href="/dashboard/activity"
              onClick={(e) => {
                e.preventDefault();
                navigateClient("/dashboard/activity");
              }}
              className="text-xs text-primary"
            >
              View all
            </a>
          </div>
          {(activity.data?.items?.length ?? 0) ? (
            (activity.data?.items ?? []).slice(0, 4).map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 border-b py-3 last:border-0"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-accent text-primary">
                  <Check size={15} />
                </span>
                <div>
                  <p className="text-sm">{a.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="A fresh start"
              description="Invitations, access changes, and completed tasks will appear here."
            />
          )}
        </Card>
      </div>
    </div>
  );
}
export function ChurchStatusReportPage() {
  const { organizationId } = useWorkspace();
  const [items, setItems] = useState<
    {
      id: string;
      memberId: string;
      memberName: string;
      previousStatus: string | null;
      newStatus: string;
      destination: string | null;
      changedAt: string;
      changedById: string | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const monthGroups = useMemo(() => {
    const groups: Record<string, typeof items> = {};
    for (const item of items) {
      const month = item.changedAt.slice(0, 7);
      if (!groups[month]) groups[month] = [];
      groups[month].push(item);
    }
    return groups;
  }, [items]);
  const months = Object.keys(monthGroups).sort().reverse();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest<{ items: typeof items }>(
          "/api/admin/church-status-history",
        );
        if (!cancelled) setItems(data.items);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Không tải được báo cáo.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  if (loading) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  return (
    <div className="page-enter">
      <Heading
        eyebrow="Báo cáo"
        title="Báo cáo thay đổi tình trạng thành viên"
        description="Xem số lượng thành viên thay đổi tình trạng theo tháng."
      />
      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        {months.map((month) => {
          const group = monthGroups[month];
          return (
            <Card key={month} className="p-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {month}
                <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                  <Users size={14} />
                </span>
              </div>
              <p className="my-3 text-2xl sm:text-3xl font-semibold tracking-tight">
                {group.length}
              </p>
              <p className="text-xs text-muted-foreground">
                thành viên thay đổi tình trạng
              </p>
            </Card>
          );
        })}
      </div>
      <div className="grid gap-6">
        {months.map((month) => {
          const group = monthGroups[month];
          return (
            <Card key={month} className="p-6">
              <h2 className="font-semibold mb-4">
                {month} · {group.length} thay đổi
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-3">Thành viên</th>
                      <th className="pb-3">Từ</th>
                      <th className="pb-3">Đến</th>
                      {group.some((g) => g.destination) ? (
                        <th className="pb-3">Điểm đến</th>
                      ) : null}
                      <th className="pb-3 text-right">Ngày</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {group.map((g) => (
                      <tr key={g.id} className="group">
                        <td className="py-3 text-sm">{g.memberName}</td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {g.previousStatus ?? "—"}
                        </td>
                        <td className="py-3 text-sm font-medium">
                          {g.newStatus}
                        </td>
                        {group.some((gg) => gg.destination) ? (
                          <td className="py-3 text-sm text-muted-foreground">
                            {g.destination ?? "—"}
                          </td>
                        ) : null}
                        <td className="py-3 text-sm text-right text-muted-foreground">
                          {new Date(g.changedAt).toLocaleDateString("vi-VN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
        {months.length === 0 && (
          <EmptyState
            title="Chưa có thay đổi nào"
            description="Khi tình trạng thành viên được thay đổi, báo cáo sẽ xuất hiện ở đây."
          />
        )}
      </div>
    </div>
  );
}
export function ActivityPage() {
  const { organizationId } = useWorkspace();
  const activity = useOrganizationActivity(organizationId);
  return (
    <div className="page-enter">
      <Heading
        eyebrow="Nhật ký"
        title="Nhật ký hoạt động"
        description="Theo dõi hoạt động và các thay đổi trong Hội Thánh."
      />
      {activity.isPending ? (
        <Loading />
      ) : activity.isError ? (
        <ErrorMessage error={activity.error} />
      ) : activity.data?.items.length ? (
        <Card className="divide-y">
          {activity.data.items.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 p-5"
            >
              <div>
                <p className="text-sm font-medium">{a.action}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  Subject {a.subjectId}
                </p>
              </div>
              <time
                className="text-xs text-muted-foreground"
                dateTime={a.createdAt}
              >
                {new Date(a.createdAt).toLocaleString()}
              </time>
            </div>
          ))}
        </Card>
      ) : (
        <EmptyState
          title="Nothing here yet"
          description="Thêm tài khoản hoặc thay đổi quyền để xem lịch sử."
        />
      )}
    </div>
  );
}
