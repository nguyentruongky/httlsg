/** Convert saved fragment links to the current client URL format. */
export function clientPath(value: string) {
  const path = value
    .replace(/^\/client#\//, "/client/")
    .replace(/^#\//, "/client/");
  return ["", "#", "/", "/client", "/client/"].includes(path)
    ? "/client/assignments"
    : path;
}
