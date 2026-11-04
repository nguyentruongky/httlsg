"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
} from "lucide-react";
import { useWorkspace, useOrganization, type Member } from "@org/core";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorMessage,
  EmptyState,
  Input,
  Select,
} from "@org/ui";
import { InviteDialog } from "./invite-dialog";
import { MemberTable } from "./member-table";
function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-primary">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
function Loading() {
  return (
    <div role="status" className="space-y-4">
      <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
export function MembersPage() {
  const { organizationId } = useWorkspace();
  const query = useOrganization(organizationId);
  return (
    <div className="page-enter">
      <Heading
        eyebrow="People & community"
        title="Members"
        description="Good things happen when the right people come together."
      >
        <InviteDialog key={organizationId} org={organizationId} />
      </Heading>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorMessage error={query.error} />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                name: "Total members",
                value: query.data.members.length,
                icon: Users,
              },
              {
                name: "Active members",
                value: query.data.members.filter((m) => m.status === "active")
                  .length,
                icon: UserCheck,
              },
              {
                name: "Pending invitations",
                value: query.data.members.filter((m) => m.status === "invited")
                  .length,
                icon: Mail,
              },
              {
                name: "Administrators",
                value: query.data.members.filter((m) => m.role === "admin")
                  .length,
                icon: Shield,
              },
            ].map(({ name, value, icon: Icon }) => (
              <Card className="p-5" key={name}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{name}</span>
                  <Icon size={16} className="text-muted-foreground" />
                </div>
                <p className="mt-3 text-2xl font-semibold">{value}</p>
              </Card>
            ))}
          </div>
          <MemberTable
            key={organizationId}
            org={organizationId}
            members={query.data.members}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Shift-click column headings to sort by multiple columns. Your own
            access is protected.
          </p>
        </>
      )}
    </div>
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
  const query = useOrganization(organizationId);
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorMessage error={query.error} />;
  const { members, tasks, activity } = query.data;
  const completed = tasks.filter((t) => t.status === "completed").length;
  return (
    <div className="page-enter">
      <Heading
        eyebrow="Overview"
        title="A good day to make a difference."
        description="Here’s a little perspective on your people and your progress."
      >
        <Button asChild variant="outline">
          <Link href="/dashboard/members">
            <Users size={15} />
            View members
          </Link>
        </Button>
      </Heading>
      <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total members",
            value: members.length,
            detail: "People in your community",
            icon: Users,
          },
          {
            label: "Active members",
            value: members.filter((m) => m.status === "active").length,
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
            value: members.filter((m) => m.status === "invited").length,
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
            <p className="my-3 text-3xl font-semibold tracking-tight">
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{detail}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <Card className="p-6">
          <div className="mb-7 flex items-start justify-between">
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
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 8, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="engagement" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--primary)"
                      stopOpacity={0.18}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 4"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: 10,
                    color: "var(--foreground)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="active"
                  name="Active members"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="url(#engagement)"
                />
              </AreaChart>
            </ResponsiveContainer>
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
            <Link
              href="/dashboard/members"
              className="flex items-center gap-1 text-xs text-primary"
            >
              View directory <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y">
            {members.slice(0, 4).map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-3">
                <Avatar name={m.user.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{m.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.user.email}
                  </p>
                </div>
                <Badge className="capitalize">{m.role}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">Recent activity</h2>
            <Link href="/dashboard/activity" className="text-xs text-primary">
              View all
            </Link>
          </div>
          {activity.length ? (
            activity.slice(0, 4).map((a) => (
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
export function ActivityPage() {
  const { organizationId } = useWorkspace();
  const q = useOrganization(organizationId);
  return (
    <div className="page-enter">
      <Heading
        eyebrow="Workspace history"
        title="Activity log"
        description="A clear view of member activity and changes."
      />
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorMessage error={q.error} />
      ) : q.data.activity.length ? (
        <Card className="divide-y">
          {q.data.activity.map((a) => (
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
