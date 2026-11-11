/** Convert saved fragment links to the current client URL format. */
export function clientPath(value: string) {
  const path = value
    .replace(/^\/client#\//, "/client/")
    .replace(/^#\//, "/client/");
  if (path === "/dashboard" || path === "/dashboard/")
    return "/dashboard/members";
  return ["", "#", "/", "/client", "/client/"].includes(path)
    ? "/client/home"
    : path;
}
