import { createRequestId } from "./random-id";
import { apiRequest, isApiMode } from "./api-client";
import { getLocalDataset, registerLocalDataset } from "./local-data";
import {
  NoteInputSchema,
  VisitInputSchema,
  MemberNoteSchema,
  MemberVisitSchema,
  type MemberNote,
  type MemberVisit,
  MemberDetailInputSchema,
  StoredMemberDetailsSchema,
  canEditMemberDetails,
  type MemberDetailInput,
  type StoredMemberDetails,
  ActivitySchema,
  MemberSchema,
  TaskSchema,
  InviteSchema,
  type Activity,
  type Member,
  type Task,
  type Invite,
} from "./schemas";
export const orgs = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Grace Community",
    short: "GC",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    name: "Hope Collective",
    short: "HC",
  },
];
export const viewerId = "20000000-0000-4000-8000-000000000001";
const id = (n: number) =>
  `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export interface Snapshot {
  members: Member[];
  tasks: Task[];
  activity: Activity[];
  memberDetails?: Record<string, StoredMemberDetails>;
  memberNotes?: Record<string, MemberNote[]>;
  memberVisits?: Record<string, MemberVisit[]>;
}
function seed(org: string): Snapshot {
  const local = getLocalDataset(org);
  if (local)
    return { members: structuredClone(local.members), tasks: [], activity: [] };
  const initialNames =
    org === orgs[0].id
      ? [
          "Alex Morgan",
          "Sarah Chen",
          "James Wilson",
          "Olivia Martinez",
          "Noah Williams",
          "Emma Thompson",
          "Liam Anderson",
          "Ava Robinson",
          "Ethan Taylor",
          "Mia Jackson",
          "Lucas White",
          "Isabella Harris",
        ]
      : ["Alex Morgan", "Daniel Kim", "Sofia Davis", "Henry Clark"];
  const firstNames = [
    "Amelia",
    "Benjamin",
    "Charlotte",
    "Daniel",
    "Emily",
    "Felix",
    "Grace",
    "Henry",
    "Iris",
    "Jack",
    "Kai",
    "Lucy",
  ];
  const lastNames = [
    "Bennett",
    "Carter",
    "Davis",
    "Evans",
    "Foster",
    "Garcia",
    "Hayes",
    "Kim",
  ];
  const names = [
    ...initialNames,
    ...Array.from(
      { length: org === orgs[0].id ? 84 : 60 },
      (_, i) =>
        `${firstNames[i % firstNames.length]} ${lastNames[Math.floor(i / firstNames.length)]}`,
    ),
  ];
  const now = new Date();
  const date = (hour: number) => {
    const d = new Date(now);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  return {
    members: names.map((name, i) =>
      MemberSchema.parse({
        id: id(i + 100),
        organizationId: org,
        userId: id(i + 1),
        role: i === 0 ? "admin" : i % 4 === 0 ? "manager" : "member",
        status: i === 5 ? "invited" : i === 8 ? "suspended" : "active",
        joinedAt: new Date(now.getTime() - i * 7 * 86_400_000).toISOString(),
        user: {
          id: id(i + 1),
          name,
          email: name.toLowerCase().replace(" ", ".") + "@example.org",
          avatarUrl: null,
          createdAt: now.toISOString(),
        },
      }),
    ),
    tasks: [
      "Morning team check-in",
      "Prepare the welcome space",
      "Review this week’s schedule",
      "Follow up with new members",
    ].map((title, i) =>
      TaskSchema.parse({
        id: id(i + 200),
        organizationId: org,
        assigneeId: viewerId,
        title,
        description: [
          "Let your team know you’re here and ready for the day.",
          "Set out materials and make everyone feel at home.",
          "Take a moment to plan for the week ahead.",
          "A small connection makes a big difference.",
        ][i],
        kind: i === 0 ? "check_in" : "task",
        status: "pending",
        completedAt: null,
        dueAt: date(9 + i * 2),
        version: 0,
      }),
    ),
    activity: [],
  };
}
const memory = new Map<string, Snapshot>();
const key = (org: string) =>
  getLocalDataset(org)
    ? `gather-local:${getLocalDataset(org)!.revision}:${org}`
    : `gather-demo-v1:${org}`;
function read(org: string): Snapshot {
  if (!orgs.some((o) => o.id === org))
    throw new Error("Organization not available");
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(key(org));
    if (saved) {
      const s = JSON.parse(saved);
      return {
        // Keep existing invitations/access changes while adding the larger demo directory.
        members: (() => {
          const savedMembers = MemberSchema.array().parse(s.members);
          const existing = new Set(savedMembers.map((m) => m.id));
          return [
            ...savedMembers,
            ...seed(org).members.filter((m) => !existing.has(m.id)),
          ];
        })(),
        tasks: TaskSchema.array().parse(s.tasks),
        activity: ActivitySchema.array().parse(s.activity),
        ...(s.memberNotes
          ? {
              memberNotes: Object.fromEntries(
                Object.entries(s.memberNotes).map(([id, items]) => [
                  id,
                  MemberNoteSchema.array().parse(items),
                ]),
              ),
            }
          : {}),
        ...(s.memberVisits
          ? {
              memberVisits: Object.fromEntries(
                Object.entries(s.memberVisits).map(([id, items]) => [
                  id,
                  MemberVisitSchema.array().parse(items),
                ]),
              ),
            }
          : {}),
        ...(s.memberDetails
          ? {
              memberDetails: Object.fromEntries(
                Object.entries(s.memberDetails).map(([id, value]) => [
                  id,
                  StoredMemberDetailsSchema.parse(value),
                ]),
              ),
            }
          : {}),
      };
    }
  }
  if (!memory.has(org)) memory.set(org, seed(org));
  return structuredClone(memory.get(org)!);
}
function write(org: string, s: Snapshot) {
  if (typeof localStorage !== "undefined")
    localStorage.setItem(key(org), JSON.stringify(s));
  memory.set(org, structuredClone(s));
}
function audit(s: Snapshot, org: string, action: string, subjectId: string) {
  s.activity.unshift({
    id: createRequestId(),
    organizationId: org,
    actorId: viewerId,
    action,
    subjectId,
    createdAt: new Date().toISOString(),
  });
}
function historyActor(s: Snapshot, org: string, memberId: string) {
  const member = s.members.find(
    (m) => m.id === memberId && m.organizationId === org,
  );
  if (!member)
    throw new Error("Không tìm thấy thành viên trong danh sách này.");
  const actor = s.members.find((m) => m.userId === viewerId);
  if (!canEditMemberDetails(actor, member))
    throw new Error("Bạn không có quyền cập nhật hồ sơ này.");
  return actor!;
}
export const demo = {
  async addNote(org: string, memberId: string, input: { text: string }) {
    if (isApiMode()) {
      await apiRequest(`/api/members/${memberId}/notes`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      return;
    }
    const s = read(org),
      actor = historyActor(s, org, memberId);
    const values = NoteInputSchema.parse(input);
    const note: MemberNote = {
      id: createRequestId(),
      organizationId: org,
      memberId,
      authorId: actor.userId,
      authorName: actor.user.name,
      text: values.text,
      createdAt: new Date().toISOString(),
    };
    s.memberNotes = {
      ...s.memberNotes,
      [memberId]: [note, ...(s.memberNotes?.[memberId] ?? [])],
    };
    audit(
      s,
      org,
      "Đã thêm ghi chú",
      s.members.find((m) => m.id === memberId)!.userId,
    );
    write(org, s);
  },
  async addVisit(
    org: string,
    memberId: string,
    input: { visitedOn: string; summary?: string },
  ) {
    if (isApiMode()) {
      await apiRequest(`/api/members/${memberId}/visits`, {
        method: "POST",
        body: JSON.stringify({ visitedOn: input.visitedOn }),
      });
      return;
    }
    const s = read(org),
      actor = historyActor(s, org, memberId);
    const values = VisitInputSchema.parse(input);
    const visit: MemberVisit = {
      id: createRequestId(),
      organizationId: org,
      memberId,
      authorId: actor.userId,
      authorName: actor.user.name,
      ...values,
      createdAt: new Date().toISOString(),
      source: "user",
    };
    s.memberVisits = {
      ...s.memberVisits,
      [memberId]: [visit, ...(s.memberVisits?.[memberId] ?? [])],
    };
    audit(
      s,
      org,
      "Đã thêm lần thăm viếng",
      s.members.find((m) => m.id === memberId)!.userId,
    );
    write(org, s);
  },

  loadLocalDataset(input: unknown) {
    const data = registerLocalDataset(input);
    if (!orgs.some((o) => o.id === data.organization.id))
      orgs.push(data.organization);
    memory.delete(data.organization.id);
    return data.organization.id;
  },
  async get(org: string): Promise<Snapshot> {
    if (isApiMode()) return apiRequest<Snapshot>("/api/admin/workspace");
    return read(org);
  },

  async updateDetails(
    org: string,
    memberId: string,
    input: MemberDetailInput,
    expectedVersion: number,
  ) {
    if (isApiMode()) {
      await apiRequest(`/api/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ values: input, version: expectedVersion }),
      });
      return;
    }
    const s = read(org);
    const target = s.members.find((m) => m.id === memberId);
    if (!target)
      throw new Error("Không tìm thấy thành viên trong danh sách này.");
    const actor = s.members.find((m) => m.userId === viewerId);
    if (!canEditMemberDetails(actor, target))
      throw new Error("Bạn không có quyền chỉnh sửa hồ sơ này.");
    const fields = MemberDetailInputSchema.parse(input);
    const currentVersion = s.memberDetails?.[memberId]?.version ?? 0;
    if (
      !Number.isInteger(expectedVersion) ||
      expectedVersion !== currentVersion
    )
      throw new Error("Hồ sơ đã thay đổi. Vui lòng tải lại trước khi lưu.");
    if (
      fields.email &&
      s.members.some(
        (m) =>
          m.id !== memberId &&
          m.user.email?.toLowerCase() === fields.email.toLowerCase(),
      )
    )
      throw new Error("Địa chỉ email đã được sử dụng.");
    const related = fields.familyMembers.map((m) => m.id);
    if (
      new Set(related).size !== related.length ||
      related.includes(memberId) ||
      related.some((id) => !s.members.some((m) => m.id === id))
    )
      throw new Error("Danh sách người thân không hợp lệ trong danh sách này.");
    target.user = {
      ...target.user,
      name: fields.name,
      email: fields.email || null,
    };
    s.memberDetails = {
      ...s.memberDetails,
      [memberId]: {
        fields,
        version: currentVersion + 1,
        ...(s.memberDetails?.[memberId]?.legacyDepartmentId
          ? { legacyDepartmentId: s.memberDetails[memberId].legacyDepartmentId }
          : {}),
      },
    };
    audit(s, org, "Đã cập nhật hồ sơ thành viên", target.userId);
    write(org, s);
  },
  async invite(org: string, input: Invite) {
    const values = InviteSchema.parse(input);
    const s = read(org);
    if (
      s.members.some(
        (m) => m.user.email?.toLowerCase() === values.email.toLowerCase(),
      )
    )
      throw new Error("This email already belongs to the organization.");
    const userId = createRequestId();
    const now = new Date().toISOString();
    s.members.push(
      MemberSchema.parse({
        id: createRequestId(),
        organizationId: org,
        userId,
        role: values.role,
        status: "invited",
        joinedAt: now,
        user: {
          id: userId,
          name: values.name,
          email: values.email,
          avatarUrl: null,
          createdAt: now,
        },
      }),
    );
    audit(s, org, "Member invited (demo)", userId);
    write(org, s);
  },
  async updateMembers(
    org: string,
    ids: string[],
    patch: Partial<Pick<Member, "role" | "status">>,
  ) {
    const s = read(org);
    const selected = s.members.filter((m) => ids.includes(m.id));
    if (selected.length !== new Set(ids).size)
      throw new Error("Member not found in this organization.");
    if (selected.some((m) => m.userId === viewerId))
      throw new Error("You cannot change your own access.");
    const next = s.members.map((m) =>
      ids.includes(m.id) ? MemberSchema.parse({ ...m, ...patch }) : m,
    );
    if (!next.some((m) => m.role === "admin" && m.status === "active"))
      throw new Error("An active administrator is required.");
    s.members = next;
    selected.forEach((m) => audit(s, org, "Member access updated", m.userId));
    write(org, s);
  },
  async complete(org: string, taskId: string, version: number) {
    const s = read(org);
    const index = s.tasks.findIndex(
      (t) => t.id === taskId && t.assigneeId === viewerId,
    );
    if (index < 0) throw new Error("Task not found.");
    const t = s.tasks[index];
    if (t.version !== version)
      throw new Error("This task changed. Refresh and try again.");
    s.tasks[index] = TaskSchema.parse({
      ...t,
      status: "completed",
      completedAt: new Date().toISOString(),
      version: t.version + 1,
    });
    audit(
      s,
      org,
      t.kind === "check_in" ? "Checked in" : "Task completed",
      taskId,
    );
    write(org, s);
  },
};
