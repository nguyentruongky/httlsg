/** Convert saved fragment links to the current client URL format. */
export function clientPath(value: string) {
  const path = value
    .replace(/^\/client#\//, "/client/")
    .replace(/^#\//, "/client/");
  if (path === "/dashboard" || path === "/dashboard/") return "/client/members";
  if (
    [
      "/dashboard/admin/roles/members",
      "/client/personnel",
      "/client/leader/members",
      "/client/board/members",
    ].includes(path)
  )
    return "/client/members";
  if (path === "/dashboard/calendar/my-schedule") return "/client/assignments";
  if (path.startsWith("/dashboard/"))
    return path.replace(/^\/dashboard/, "/client");
  if (/^\/client\/(leader|board)\/members\//.test(path))
    return path.replace(
      /^\/client\/(leader|board)\/members\//,
      "/client/members/",
    );
  return ["", "#", "/", "/client", "/client/"].includes(path)
    ? "/client/home"
    : path;
}
