/** Best-effort local cleanup after server-side logout/revocation succeeds. */
export async function clearDevicePush() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
    return;
  const work = (async () => {
    const next =
      typeof location !== "undefined" &&
      (location.pathname === "/client" ||
        location.pathname.startsWith("/client/"));
    const registration = await navigator.serviceWorker.getRegistration(
      next ? "/client" : "/",
    );
    if (!registration) return;
    registration.active?.postMessage({ type: "CLEAR_NOTIFICATIONS" });
    const subscription = await registration.pushManager?.getSubscription();
    await subscription?.unsubscribe();
  })();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      work,
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, 1500);
      }),
    ]);
  } catch {
  } finally {
    if (timer) clearTimeout(timer);
  }
}
