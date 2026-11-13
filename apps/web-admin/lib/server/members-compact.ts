import { z } from "zod";
import {
  DirectoryQuerySchema,
  canManageMemberHistory,
  type AuthUser,
} from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { listReadScope } from "./members";

export interface CompactMember {
  id: string;
  userId: string;
  role: "admin" | "manager" | "member";
  accessRole: string;
  status: "active" | "invited" | "suspended";
  joinedAt: string;
  dateOfBirth: string | null;
  user: {
    id: string;
    name: string;
    email: string | null;
    avatarUrl: string | null;
    createdAt: string;
  };
  phone: string | null;
  area: string | null;
  location: string | null;
  departments: { id: string; name: string }[];
  version: number;
  canEdit: boolean;
  canLogin: boolean;
}

export interface CompactMembersPage {
  items: CompactMember[];
  total?: number;
  activeCount?: number;
  adminCount?: number;
  nextPage?: number;
}

function iso(v: unknown) {
  return new Date(String(v)).toISOString();
}
function date(v: unknown) {
  return v instanceof Date
    ? v.toISOString().slice(0, 10)
    : v
      ? String(v).slice(0, 10)
      : null;
}

export async function listMembersCompact(
  db: DB,
  actor: AuthUser,
  input: unknown,
  includeSummary = true,
): Promise<CompactMembersPage> {
  const q = DirectoryQuerySchema.parse(input);
  const values: unknown[] = [actor.id, actor.role];
  const conditions = ["u.deleted_at IS NULL", listReadScope(actor)];
  const bind = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  if (q.search.trim()) {
    const p = bind(q.search.trim().replace(/[\\%_]/g, "\\$&"));
    conditions.push(
      `public.unaccent(lower(concat_ws(' ',u.full_name,u.email,u.phone,u.preferred_name,u.area,u.location,(SELECT string_agg(d.name,' ') FROM church.department_members dm JOIN church.departments d ON d.id=dm.department_id WHERE dm.user_id=u.id)))) ILIKE '%'||public.unaccent(lower(${p}::text))||'%'`,
    );
  }
  if (q.departmentIds.length)
    conditions.push(
      `EXISTS(SELECT 1 FROM church.department_members dm WHERE dm.user_id=u.id AND dm.department_id=ANY(${bind(q.departmentIds)}::text[]))`,
    );
  if (q.areas?.length) conditions.push(`u.area=ANY(${bind(q.areas)}::text[])`);
  else if (q.area !== "all") conditions.push(`u.area=${bind(q.area)}`);
  if (q.locations?.length)
    conditions.push(`u.location=ANY(${bind(q.locations)}::text[])`);
  else if (q.location !== "all")
    conditions.push(`u.location=${bind(q.location)}`);
  if (q.ageUnknownOnly) conditions.push("u.date_of_birth IS NULL");
  else {
    if (q.minAge !== null)
      conditions.push(
        `EXTRACT(YEAR FROM age(CURRENT_DATE,u.date_of_birth))>=${bind(q.minAge)}`,
      );
    if (q.maxAge !== null)
      conditions.push(
        `EXTRACT(YEAR FROM age(CURRENT_DATE,u.date_of_birth))<=${bind(q.maxAge)}`,
      );
  }
  const where = conditions.join(" AND ");
  // This parameter belongs only to the count query. Keep it out of the
  // paginated query's values so its placeholders remain contiguous.
  const adminBind = `$${values.length + 1}`;
  const count = includeSummary
    ? await db.query(
        `SELECT count(*)::int total,
            count(*) FILTER (WHERE u.enabled)::int active_count,
            count(*) FILTER (WHERE u.role_id = ANY(${adminBind}::text[]))::int admin_count
     FROM church.member_profiles u WHERE ${where}`,
        [...values, ["admin", "secretary"]],
      )
    : null;
  const limit = ` LIMIT ${bind(q.pageSize + 1)} OFFSET ${bind((q.page - 1) * q.pageSize)}`;
  const result = await db.query(
    `SELECT u.id,u.full_name,u.email,u.phone,u.role_id,u.enabled,u.date_of_birth,u.area,u.location,u.church_status,u.created_at,u.version,
   EXISTS(SELECT 1 FROM church.users account WHERE account.id=u.id AND account.password_hash IS NOT NULL) AS can_login,
   EXISTS(SELECT 1 FROM church.role_permissions rp WHERE (rp.role_id=$2::text OR EXISTS(SELECT 1 FROM church.member_roles held WHERE held.member_id=$1::uuid AND held.role_id=rp.role_id)) AND rp.permission_id='members.write.all') AS can_edit,
   COALESCE((SELECT jsonb_agg(jsonb_build_object('id',d.id,'name',d.name) ORDER BY d.name) FROM church.department_members dm JOIN church.departments d ON d.id=dm.department_id WHERE dm.user_id=u.id),'[]') departments
  FROM church.member_profiles u WHERE ${where} ORDER BY lower(public.unaccent(COALESCE(substring(u.full_name from '([^[:space:]]+)[[:space:]]*$'),''))),lower(public.unaccent(u.full_name)),u.id${limit}`,
    values,
  );
  return {
    items: result.rows.slice(0, q.pageSize).map((row) =>
      compactMemberDto({
        ...row,
        actor_role: actor.role,
        can_read_notes: canManageMemberHistory(actor, row.id),
      }),
    ),
    ...(count
      ? {
          total: count.rows[0].total,
          activeCount: count.rows[0].active_count,
          adminCount: count.rows[0].admin_count,
        }
      : {}),
    nextPage: result.rows.length > q.pageSize ? q.page + 1 : undefined,
  };
}

function compactMemberDto(row: any): CompactMember {
  const accessRole = row.role_id;
  return {
    id: row.id,
    userId: row.id,
    role: ["admin", "secretary"].includes(accessRole)
      ? "admin"
      : accessRole === "board"
        ? "manager"
        : "member",
    accessRole,
    status: row.enabled ? "active" : "suspended",
    joinedAt: iso(row.created_at),
    dateOfBirth: date(row.date_of_birth),
    user: {
      id: row.id,
      name: row.full_name,
      email: row.email,
      avatarUrl: null,
      createdAt: iso(row.created_at),
    },
    phone: row.phone ?? null,
    area: row.area ?? null,
    location: row.location ?? null,
    departments: (row.departments ?? []).map((d: any) => ({
      id: d.id,
      name: d.name,
    })),
    version: row.version,
    canEdit: row.can_edit,
    canLogin: row.can_login,
  };
}
