/** One election request at a time; only confirmed in-progress work may repeat. */
export function createElectionPolling({
  load,
  onError,
  initiallyPolling = false,
  initialRead = true,
  intervalMs = 5000,
}: {
  load: (signal: AbortSignal) => Promise<boolean>;
  onError?: (error: unknown) => void | Promise<void>;
  initiallyPolling?: boolean;
  initialRead?: boolean;
  intervalMs?: number;
}) {
  const pathname = window.location.pathname;
  const controller = new AbortController();
  let active = true;
  let reading = false;
  let loaded = !initialRead;
  let polling = initiallyPolling;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let nextAllowedAt = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = undefined;
    if (active && polling) {
      nextAllowedAt = Date.now() + intervalMs;
      timer = setTimeout(() => void refresh(false), intervalMs);
    }
  };
  const refresh = async (manual = true) => {
    if (!active || reading || (!manual && loaded && !polling)) return;
    if (window.location.pathname !== pathname) {
      stop();
      return;
    }
    clearTimeout(timer);
    timer = undefined;
    const remaining = nextAllowedAt - Date.now();
    if (!manual && loaded && polling && remaining > 0) {
      timer = setTimeout(() => void refresh(false), remaining);
      return;
    }
    if (document.hidden || !navigator.onLine) return;
    reading = true;
    try {
      const keepPolling = await load(controller.signal);
      if (!active || controller.signal.aborted) return;
      polling = keepPolling === true;
      loaded = true;
    } catch (error) {
      if (!active) return;
      // Failed requests never authorize another automatic request.
      polling = false;
      loaded = true;
      await onError?.(error);
    } finally {
      reading = false;
      schedule();
    }
  };
  const resume = () => void refresh(false);
  const stop = () => {
    active = false;
    polling = false;
    clearTimeout(timer);
    controller.abort();
    document.removeEventListener("visibilitychange", resume);
    window.removeEventListener("online", resume);
    window.removeEventListener("popstate", navigation);
    window.removeEventListener("clientnavigation", navigation);
  };
  const navigation = () => {
    if (window.location.pathname !== pathname) stop();
  };
  document.addEventListener("visibilitychange", resume);
  window.addEventListener("online", resume);
  window.addEventListener("popstate", navigation);
  window.addEventListener("clientnavigation", navigation);
  if (initialRead) void refresh(false);
  else schedule();
  return { refresh, stop };
}
