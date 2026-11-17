import { PERSONNEL_MINISTRY_NAMES } from "@org/core";

// Shared candidate rule for the personnel page and the member-directory flag.
export function personnelMemberScope(alias: string, namesParameter?: string) {
  const names = PERSONNEL_MINISTRY_NAMES.map((name) =>
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ""),
  )
    .map((name) => "'" + name.replaceAll("'", "''") + "'")
    .join(",");
  return `(${alias}.role_id<>'user'
    OR EXISTS(SELECT 1 FROM church.member_roles personnel_role WHERE personnel_role.member_id=${alias}.id AND personnel_role.role_id<>'user')
    OR EXISTS(SELECT 1 FROM church.department_managers personnel_manager WHERE personnel_manager.user_id=${alias}.id)
    OR EXISTS(SELECT 1 FROM church.personnel_missions personnel_mission WHERE personnel_mission.member_id=${alias}.id AND personnel_mission.kind='specialist')
    OR EXISTS(SELECT 1 FROM church.department_members personnel_member JOIN church.departments personnel_department ON personnel_department.id=personnel_member.department_id WHERE personnel_member.user_id=${alias}.id AND (
      personnel_member.department_id='chap-su'
      OR public.unaccent(lower(trim(personnel_member.position))) ~ '^(ban dieu hanh|truong ban|pho ban|thu ky|thu quy|uy vien|chap su|dac trach)([[:space:]]|$)'
      OR regexp_replace(public.unaccent(lower(personnel_department.name)),'[^a-z0-9]','','g')=ANY(${namesParameter ?? `ARRAY[${names}]::text[]`})))
    OR EXISTS(SELECT 1 FROM (SELECT DISTINCT ON (department_id) members FROM church.department_board_history WHERE year=extract(year FROM now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::int ORDER BY department_id,revision DESC) personnel_board CROSS JOIN LATERAL jsonb_array_elements(personnel_board.members) personnel_entry WHERE personnel_entry->>'id'=${alias}.id::text))`;
}
