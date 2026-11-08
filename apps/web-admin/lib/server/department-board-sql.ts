// Shared expressions for the paginated roster and the legacy current-year board.
// All identifiers/parameters here are internal constants, never user input.
export const LEGACY_BOARD = `(EXISTS(SELECT 1 FROM church.department_managers m WHERE m.user_id=p.id AND m.department_id=$1) OR EXISTS(SELECT 1 FROM church.department_members dm WHERE dm.user_id=p.id AND dm.department_id=$1 AND lower(trim(dm.position)) IN ('ban điều hành','trưởng ban','phó ban','thư ký','thủ quỹ','ủy viên','uỷ viên')))`;
export const MEMBERSHIP_TITLE = `(SELECT NULLIF(CASE WHEN lower(trim(dm.position))='ban viên' THEN '' ELSE trim(dm.position) END,'') FROM church.department_members dm WHERE dm.user_id=p.id AND dm.department_id=$1)`;
export function boardExpressions(year: string) {
  const exists = `EXISTS(SELECT 1 FROM church.department_board_history WHERE department_id=$1 AND year=${year})`;
  const title = `(SELECT entry->>'position' FROM (SELECT members FROM church.department_board_history WHERE department_id=$1 AND year=${year} ORDER BY revision DESC LIMIT 1) h CROSS JOIN LATERAL jsonb_array_elements(h.members) entry WHERE entry->>'id'=p.id::text)`;
  const current = `extract(year from now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::int`;
  const unconfigured = `NOT EXISTS(SELECT 1 FROM church.department_board_history WHERE department_id=$1)`;
  const legacy = `(NOT ${exists} AND ${unconfigured} AND ${year}=${current} AND ${LEGACY_BOARD})`;
  return {
    isBoard: `(${title} IS NOT NULL OR ${legacy})`,
    position: `COALESCE(${title},CASE WHEN ${legacy} THEN COALESCE(${MEMBERSHIP_TITLE},'Ban điều hành') END,CASE WHEN NOT ${LEGACY_BOARD} OR (NOT ${exists} AND ${unconfigured} AND ${year}=${current}) THEN ${MEMBERSHIP_TITLE} END,'Ban viên')`,
  };
}
