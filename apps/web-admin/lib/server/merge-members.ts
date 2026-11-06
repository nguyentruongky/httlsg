import { createHash } from "node:crypto";
import { z } from "zod";
import {
  primaryAccessRole,
  accessRoleLabels,
  type AccessRole,
  type AuthUser,
} from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { requirePermission } from "./session";

const Ids = z
  .array(z.uuid().transform((id) => id.toLowerCase()))
  .min(2)
  .max(20)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    "Không được chọn trùng hồ sơ.",
  );
export const MergePreviewInput = z.object({ ids: Ids }).strict();
export const MergeInput = MergePreviewInput.extend({
  previewToken: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
const fields = [
  "email",
  "phone",
  "date_of_birth",
  "address",
  "occupation",
  "bio",
  "area",
  "location",
  "church_status",
  "faith_date",
  "baptism_date",
  "preferred_name",
  "gender",
  "household_role",
  "source",
] as const;
const labels: Record<string, string> = {
  email: "Email",
  phone: "Số điện thoại",
  date_of_birth: "Ngày sinh",
  address: "Địa chỉ",
  occupation: "Nghề nghiệp",
  bio: "Thông tin bổ sung",
  area: "Khu vực",
  location: "Phường/xã",
  church_status: "Tình trạng",
  faith_date: "Ngày tin Chúa",
  baptism_date: "Ngày báp-têm",
  preferred_name: "Tên thường gọi",
  gender: "Giới tính",
  household_role: "Vai trò trong gia đình",
  source: "Dữ liệu nhập",
};
const blank = (v: unknown) => v == null || (typeof v === "string" && !v.trim());
function authorize(actor: AuthUser) {
  if (actor.role !== "admin" || actor.requiresPasswordSetup)
    throw new HttpError(403, "Chỉ Admin có quyền hợp nhất hồ sơ.");
  requirePermission(actor, "members.write.all");
  requirePermission(actor, "access.manage");
}
async function state(db: DB, ids: string[]) {
  const profiles = (
    await db.query(
      "SELECT * FROM church.member_profiles WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL ORDER BY array_position($1::uuid[],id) FOR UPDATE",
      [ids],
    )
  ).rows;
  if (profiles.length !== ids.length)
    throw new HttpError(
      409,
      "Một hồ sơ đã bị xóa hoặc hợp nhất. Vui lòng tải lại danh sách.",
    );
  const accounts = (
    await db.query(
      "SELECT * FROM church.users WHERE id=ANY($1::uuid[]) ORDER BY array_position($1::uuid[],id)",
      [ids],
    )
  ).rows;
  const relations: Record<string, Record<string, any>[]> = {};
  for (const [table, key] of [
    ["department_members", "user_id"],
    ["department_managers", "user_id"],
    ["department_leaders", "user_id"],
    ["member_roles", "member_id"],
  ])
    relations[table] = (
      await db.query(
        `SELECT * FROM church.${table} WHERE ${key}=ANY($1::uuid[]) ORDER BY array_position($1::uuid[],${key}),department_id${table === "member_roles" ? ",role_id" : ""}`,
        [ids],
      )
    ).rows;
  relations.household_members = (
    await db.query(
      "SELECT * FROM church.household_members WHERE household_id IN(SELECT household_id FROM church.household_members WHERE user_id=ANY($1::uuid[])) ORDER BY household_id,user_id",
      [ids],
    )
  ).rows;
  for (const table of ["notes", "visits"])
    relations[table] = (
      await db.query(
        `SELECT * FROM church.${table} WHERE member_id=ANY($1::uuid[]) OR author_id=ANY($1::uuid[]) ORDER BY id`,
        [ids],
      )
    ).rows;
  for (const [table, columns] of [
    ["events", ["created_by", "updated_by"]],
    ["email_groups", ["created_by", "updated_by"]],
    ["event_notifications", ["created_by"]],
    ["event_notification_retries", ["created_by"]],
    ["event_save_requests", ["created_by"]],
    ["notification_history", ["created_by"]],
  ] as const) {
    const key = ["event_notification_retries", "event_save_requests"].includes(
      table,
    )
      ? "request_id"
      : "id";
    relations[table] = (
      await db.query(
        `SELECT ${key},${columns.join(",")} FROM church.${table} WHERE ${columns.map((column) => `${column}=ANY($1::uuid[])`).join(" OR ")} ORDER BY ${key}`,
        [ids],
      )
    ).rows;
  }
  const token = createHash("sha256")
    .update(JSON.stringify({ ids, profiles, accounts, relations }))
    .digest("hex");
  const merged = { ...profiles[0] };
  for (const field of fields)
    if (blank(merged[field]))
      merged[field] =
        profiles.find((p) => !blank(p[field]))?.[field] ?? merged[field];
  const roleEntries = relations.member_roles.map((r) => ({
    role: r.role_id as AccessRole,
    department: r.department_id as string | null,
  }));
  for (const p of profiles) {
    if (["admin", "secretary", "deacon"].includes(p.role_id))
      roleEntries.push({ role: p.role_id, department: null });
    if (["board", "leader"].includes(p.role_id)) {
      const mapping = relations[
        p.role_id === "board" ? "department_managers" : "department_leaders"
      ].filter((r) => r.user_id === p.id);
      const fallback = accounts.find((a) => a.id === p.id)?.department_id;
      for (const department of new Set([
        ...mapping.map((r) => r.department_id),
        ...(fallback ? [fallback] : []),
      ]))
        roleEntries.push({ role: p.role_id, department });
    }
  }
  const roles = [
    ...new Map(
      roleEntries.map((r) => [`${r.role}:${r.department ?? ""}`, r]),
    ).values(),
  ];
  const role = primaryAccessRole([
    ...roles.map((r) => r.role),
    ...profiles.map((p) => p.role_id as AccessRole),
  ]);
  const account = accounts.find((a) => a.id === ids[0]) ?? accounts[0];
  const household = ids
    .map((id) => relations.household_members.find((r) => r.user_id === id))
    .find(Boolean);
  return {
    ids,
    profiles,
    accounts,
    relations,
    token,
    merged,
    roles,
    role,
    account,
    household,
  };
}
export async function previewMerge(db: DB, actor: AuthUser, input: unknown) {
  authorize(actor);
  const { ids } = MergePreviewInput.parse(input);
  const s = await state(db, ids);
  return {
    ids,
    previewToken: s.token,
    profiles: s.profiles.map((p) => ({
      id: p.id,
      name: p.full_name,
      email: p.email,
      phone: p.phone,
    })),
    retainedAccount: s.account
      ? {
          id: s.account.id,
          name: s.account.full_name,
          email: s.account.email,
          phone: s.account.phone,
        }
      : null,
    conflicts: fields
      .filter(
        (field) =>
          new Set(
            s.profiles
              .filter((p) => !blank(p[field]))
              .map((p) => JSON.stringify(p[field])),
          ).size > 1,
      )
      .map((field) => labels[field]),
    roles: [...new Set([s.role, ...s.roles.map((r) => r.role)])].map(
      (r) => accessRoleLabels[r],
    ),
    counts: {
      departments: new Set(
        s.relations.department_members.map((r) => r.department_id),
      ).size,
      households: new Set(
        s.relations.household_members.map((r) => r.household_id),
      ).size,
      notes: s.relations.notes.filter((r) => ids.includes(r.member_id)).length,
      visits: s.relations.visits.filter((r) => ids.includes(r.member_id))
        .length,
    },
    requiresLogin: ids.includes(actor.id),
  };
}
export async function mergeMembers(db: DB, actor: AuthUser, input: unknown) {
  authorize(actor);
  const { ids, previewToken } = MergeInput.parse(input),
    target = ids[0],
    sources = ids.slice(1);
  const previous = await db.query(
    "SELECT source_id,target_id,merge_token FROM church.profile_merges WHERE source_id=ANY($1::uuid[])",
    [sources],
  );
  if (
    previous.rows.length === sources.length &&
    previous.rows.every(
      (r) => r.target_id === target && r.merge_token === previewToken,
    )
  )
    return {
      id: target,
      mergedIds: sources,
      requiresLogin: ids.includes(actor.id),
    };
  const s = await state(db, ids);
  if (previewToken !== s.token)
    throw new HttpError(
      409,
      "Dữ liệu đã thay đổi. Vui lòng xem lại trước khi hợp nhất.",
    );
  const others = (
    await db.query(
      "SELECT count(*)::int n FROM church.users WHERE role_id='admin' AND enabled AND deleted_at IS NULL AND is_password_set AND NOT(id=ANY($1::uuid[]))",
      [ids],
    )
  ).rows[0].n;
  if (
    !others &&
    !(s.role === "admin" && s.merged.enabled && s.account?.is_password_set)
  )
    throw new HttpError(
      409,
      "Không thể hợp nhất khiến hệ thống không còn Admin hoạt động.",
    );
  // Retire every affected credential token before changing account ownership.
  await db.query(
    "UPDATE church.sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=ANY($1::uuid[])",
    [ids],
  );
  await db.query(
    "UPDATE church.otps SET is_used=true,used_at=COALESCE(used_at,now()) WHERE user_id=ANY($1::uuid[])",
    [ids],
  );
  // Free unique login identifiers inside this transaction; these temporary accounts are deleted below.
  await db.query(
    "UPDATE church.users SET email='merge-'||id::text||'@invalid.local',phone=NULL,auth_version=auth_version+1 WHERE id=ANY($1::uuid[])",
    [sources],
  );
  const department =
    [
      s.account?.department_id,
      ...s.roles.filter((r) => r.role === s.role).map((r) => r.department),
    ].find(
      (d) => d && s.roles.some((r) => r.role === s.role && r.department === d),
    ) ?? null;
  if (s.account) {
    const a = s.account;
    await db.query(
      `INSERT INTO church.users(id,email,phone,full_name,password_hash,is_password_set,must_reset_password,temporary_password_expires_at,role_id,department_id,enabled,auth_version,password_changed_at,created_at,requires_admin_email_otp)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT(id) DO UPDATE SET full_name=EXCLUDED.full_name,role_id=EXCLUDED.role_id,department_id=EXCLUDED.department_id,enabled=EXCLUDED.enabled,auth_version=EXCLUDED.auth_version`,
      [
        target,
        a.email,
        a.phone,
        s.merged.full_name,
        a.password_hash,
        a.is_password_set,
        a.must_reset_password,
        a.temporary_password_expires_at,
        s.role,
        department,
        s.merged.enabled,
        Math.max(...s.accounts.map((x) => x.auth_version)) + 1,
        a.password_changed_at,
        a.created_at,
        a.requires_admin_email_otp,
      ],
    );
  }
  // A conflict always keeps the first profile's value; blanks are filled in input order.
  await db.query(
    `UPDATE church.member_profiles SET ${fields.map((f, i) => `${f}=$${i + 2}`).join(",")},role_id=$${fields.length + 2},version=version+1 WHERE id=$1`,
    [target, ...fields.map((f) => s.merged[f]), s.role],
  );
  for (const row of s.relations.department_members)
    await db.query(
      `INSERT INTO church.department_members(user_id,department_id,position) VALUES($1,$2,$3)
    ON CONFLICT(user_id,department_id) DO UPDATE SET position=CASE WHEN btrim(church.department_members.position)='' THEN EXCLUDED.position ELSE church.department_members.position END`,
      [target, row.department_id, row.position],
    );
  for (const role of s.roles)
    await db.query(
      "INSERT INTO church.member_roles(member_id,role_id,department_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [target, role.role, role.department],
    );
  for (const table of ["department_managers", "department_leaders"])
    for (const row of s.relations[table])
      await db.query(
        `INSERT INTO church.${table}(user_id,department_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
        [target, row.department_id],
      );
  if (s.household) {
    const householdIds = [
      ...new Set(s.relations.household_members.map((r) => r.household_id)),
    ];
    await db.query(
      "UPDATE church.household_members SET household_id=$1 WHERE household_id=ANY($2::uuid[])",
      [s.household.household_id, householdIds],
    );
    await db.query(
      "INSERT INTO church.household_members(user_id,household_id,relationship) VALUES($1,$2,$3) ON CONFLICT(user_id) DO NOTHING",
      [target, s.household.household_id, s.household.relationship],
    );
    await db.query(
      "UPDATE church.member_profiles SET version=version+1 WHERE id IN(SELECT user_id FROM church.household_members WHERE household_id=$1) AND NOT(id=ANY($2::uuid[]))",
      [s.household.household_id, ids],
    );
  }
  for (const table of ["notes", "visits"]) {
    await db.query(
      `UPDATE church.${table} SET member_id=$1 WHERE member_id=ANY($2::uuid[])`,
      [target, sources],
    );
    await db.query(
      `UPDATE church.${table} SET author_id=$1 WHERE author_id=ANY($2::uuid[])`,
      [target, sources],
    );
  }
  // Calendar author references follow the retained member, including deleted
  // records and immutable notification history; content/recipient snapshots stay intact.
  for (const [table, columns] of [
    ["events", ["created_by", "updated_by"]],
    ["email_groups", ["created_by", "updated_by"]],
    ["event_notifications", ["created_by"]],
    ["event_notification_retries", ["created_by"]],
    ["event_save_requests", ["created_by"]],
    ["notification_history", ["created_by"]],
  ] as const) {
    for (const column of columns)
      await db.query(
        `UPDATE church.${table} SET ${column}=$1 WHERE ${column}=ANY($2::uuid[])`,
        [target, sources],
      );
  }
  for (const table of ["sessions", "otps"])
    await db.query(
      `UPDATE church.${table} SET user_id=$1 WHERE user_id=ANY($2::uuid[])`,
      [target, sources],
    );
  for (const key of ["actor_id", "subject_id"])
    await db.query(
      `UPDATE church.audit_log SET ${key}=$1 WHERE ${key}=ANY($2::uuid[])`,
      [target, sources],
    );
  await db.query(
    "UPDATE church.profile_merges SET target_id=$1 WHERE target_id=ANY($2::uuid[])",
    [target, sources],
  );
  await db.query(
    "UPDATE church.profile_merges SET merged_by=$1 WHERE merged_by=ANY($2::uuid[])",
    [target, sources],
  );
  for (const source of s.profiles.slice(1))
    await db.query(
      "INSERT INTO church.profile_merges(source_id,target_id,merged_by,merge_token,snapshot) VALUES($1,$2,$3,$4,$5)",
      [
        source.id,
        target,
        ids.includes(actor.id) ? target : actor.id,
        previewToken,
        JSON.stringify({
          profile: source,
          departments: s.relations.department_members.filter(
            (r) => r.user_id === source.id,
          ),
          roles: s.roles.filter((r) =>
            s.relations.member_roles.some(
              (original) =>
                original.member_id === source.id &&
                original.role_id === r.role &&
                original.department_id === r.department,
            ),
          ),
          managers: s.relations.department_managers.filter(
            (r) => r.user_id === source.id,
          ),
          leaders: s.relations.department_leaders.filter(
            (r) => r.user_id === source.id,
          ),
          household:
            s.relations.household_members.find(
              (r) => r.user_id === source.id,
            ) ?? null,
          historyReferences: Object.fromEntries(
            ["notes", "visits"].map((table) => [
              table,
              s.relations[table]
                .filter(
                  (r) => r.member_id === source.id || r.author_id === source.id,
                )
                .map((r) => ({
                  id: r.id,
                  member_id: r.member_id,
                  author_id: r.author_id,
                })),
            ]),
          ),
        }),
      ],
    );
  await db.query(
    "DELETE FROM church.member_profiles WHERE id=ANY($1::uuid[])",
    [sources],
  );
  await db.query(
    "INSERT INTO church.audit_log(actor_id,subject_id,action) VALUES($1,$2,$3)",
    [
      ids.includes(actor.id) ? target : actor.id,
      target,
      `Đã hợp nhất ${sources.length} hồ sơ vào ${target}; ID cũ: ${sources.join(", ")}`,
    ],
  );
  return {
    id: target,
    mergedIds: sources,
    requiresLogin: ids.includes(actor.id),
  };
}
