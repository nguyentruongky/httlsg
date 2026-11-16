// Profiles remain accessible directly and through search or an explicit status
// filter; ordinary directory lists and congregation totals exclude these statuses.
export function currentMemberScope(alias: string) {
  return `COALESCE(${alias}.church_status,'') NOT IN ('Chuyển hội','Đi nước ngoài')`;
}
export function directoryMemberScope(
  alias: string,
  search: string,
  statuses?: readonly string[],
) {
  if (statuses?.length)
    return `COALESCE(NULLIF(BTRIM(${alias}.church_status),''),'Chưa cập nhật') IN (${statuses.map((status) => "'" + status.replaceAll("'", "''") + "'").join(",")})`;
  return search.trim() ? "true" : currentMemberScope(alias);
}
