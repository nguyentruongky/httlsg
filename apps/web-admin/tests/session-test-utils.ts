export async function accessCredential(response: Response) {
  const body = await response.clone().json();
  if (!body.accessToken) throw new Error("Expected access token");
  return "access=" + body.accessToken;
}
